import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc } from '@firebase/firestore';
import { db } from '../config/firebase';
import { TransformationPhoto, TransformationMap } from '../types/transformation';

const STORAGE_KEY_PREFIX = '@transformation_photos_';

export const transformationService = {
  // Get all 30-day transformation photos for user
  async getPhotos(userId: string): Promise<TransformationMap> {
    const localKey = `${STORAGE_KEY_PREFIX}${userId}`;
    let map: TransformationMap = {};

    // 1. Try local AsyncStorage
    try {
      const cached = await AsyncStorage.getItem(localKey);
      if (cached) {
        map = JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Error reading transformation cache:', e);
    }

    // 2. Try Firestore fetch & sync
    try {
      const userDocRef = doc(db, 'users', userId, 'data', 'transformation');
      const snap = await getDoc(userDocRef);
      if (snap.exists() && snap.data()?.photos) {
        const remoteMap: TransformationMap = snap.data().photos || {};
        map = remoteMap;
        await AsyncStorage.setItem(localKey, JSON.stringify(remoteMap));
      }
    } catch (e) {
      console.warn('Firestore transformation fetch error (using local):', e);
    }

    return map;
  },

  // Save a photo for a specific day (Day 1 to 30)
  async savePhoto(userId: string, photo: TransformationPhoto): Promise<TransformationMap> {
    const currentMap = await this.getPhotos(userId);
    const updatedMap: TransformationMap = {
      ...currentMap,
      [photo.dayNumber]: photo,
    };

    // Save to AsyncStorage
    const localKey = `${STORAGE_KEY_PREFIX}${userId}`;
    try {
      await AsyncStorage.setItem(localKey, JSON.stringify(updatedMap));
    } catch (e) {
      console.warn('AsyncStorage save error:', e);
    }

    // Sync to Firestore (replace photos map object)
    try {
      const userDocRef = doc(db, 'users', userId, 'data', 'transformation');
      await setDoc(userDocRef, { photos: updatedMap, updatedAt: Date.now() });
    } catch (e) {
      console.warn('Firestore save error:', e);
    }

    return updatedMap;
  },

  // Delete a photo for a specific day
  async deletePhoto(userId: string, dayNumber: number): Promise<TransformationMap> {
    const currentMap = await this.getPhotos(userId);
    const updatedMap: TransformationMap = {};
    
    // Copy all photos except the deleted day
    Object.keys(currentMap).forEach((key) => {
      const numKey = Number(key);
      if (numKey !== dayNumber && currentMap[numKey]) {
        updatedMap[numKey] = currentMap[numKey];
      }
    });

    const localKey = `${STORAGE_KEY_PREFIX}${userId}`;
    try {
      await AsyncStorage.setItem(localKey, JSON.stringify(updatedMap));
    } catch (e) {
      console.warn('AsyncStorage delete error:', e);
    }

    try {
      const userDocRef = doc(db, 'users', userId, 'data', 'transformation');
      // Overwrite document in Firestore without merge: true so deleted photo key is completely removed
      await setDoc(userDocRef, { photos: updatedMap, updatedAt: Date.now() });
    } catch (e) {
      console.warn('Firestore delete error:', e);
    }

    return updatedMap;
  },
};
