import { initializeApp, getApps, getApp } from '@firebase/app';
import { getAuth, Auth } from '@firebase/auth';
import { getFirestore, Firestore } from '@firebase/firestore';

// Live Firebase Configuration loaded from Expo environment variables
export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyCuiwXmBy9KfzOw03sxHTosmS5wMOdks6c",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "jogpal-5.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "jogpal-5",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "jogpal-5.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "405112460867",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:405112460867:android:dcc26f038f17b91403e6f6",
};

// Initialize Firebase App safely
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth: Auth = getAuth(app);

// Initialize Firestore
export const db: Firestore = getFirestore(app);
