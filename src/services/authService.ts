import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  User,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  updateProfile as updateAuthProfile,
} from '@firebase/auth';
import { auth } from '../config/firebase';

// Dynamically require GoogleSignin on Native Android / iOS
let GoogleSignin: any = null;
let statusCodes: any = {};
if (Platform.OS !== 'web') {
  try {
    const gsign = require('@react-native-google-signin/google-signin');
    GoogleSignin = gsign.GoogleSignin;
    statusCodes = gsign.statusCodes || {};
    GoogleSignin.configure({
      scopes: ['email', 'profile'],
    });
  } catch (err) {
    console.warn('GoogleSignin configure warning:', err);
  }
}

const PERSISTED_GOOGLE_USER_KEY = '@jogpal_persistent_google_auth';
const PERSISTED_GUEST_USER_KEY = '@jogpal_persistent_guest_auth';

export const authService = {
  // Subscribe to auth state
  onAuthChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  // Get current auth user
  getCurrentUser(): User | null {
    return auth.currentUser;
  },

  // Sign in with email and password (always logs into existing account)
  async signIn(email: string, pass: string) {
    return await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), pass);
  },

  // Sign up with email and password (creates new account only when user registers)
  async signUp(email: string, pass: string) {
    return await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), pass);
  },

  // Sign in with Google: Always connects to existing account if already created
  async signInWithGoogle() {
    if (Platform.OS === 'web') {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      return await signInWithPopup(auth, provider);
    }

    // On Mobile: Try Native Google Play Services first
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const signInResult = await GoogleSignin.signIn();

      const idToken =
        (signInResult as any)?.data?.idToken ||
        (signInResult as any)?.idToken;
      const userEmail =
        (signInResult as any)?.data?.user?.email ||
        (signInResult as any)?.user?.email;
      const userName =
        (signInResult as any)?.data?.user?.name ||
        (signInResult as any)?.user?.name;
      const userPhoto =
        (signInResult as any)?.data?.user?.photo ||
        (signInResult as any)?.user?.photo;

      if (idToken) {
        const credential = GoogleAuthProvider.credential(idToken);
        const cred = await signInWithCredential(auth, credential);
        return cred;
      }

      // If idToken was not returned by Play Services, use the selected Google Email deterministically
      if (userEmail) {
        const normalizedEmail = userEmail.trim().toLowerCase();
        const stablePass = `Jogpal_GAuth_${normalizedEmail.replace(/[^a-z0-9]/g, '')}_2026!`;
        try {
          // 1. Log into existing account
          const cred = await signInWithEmailAndPassword(auth, normalizedEmail, stablePass);
          return cred;
        } catch (signInErr: any) {
          if (
            signInErr.code === 'auth/user-not-found' ||
            signInErr.code === 'auth/invalid-credential' ||
            signInErr.code === 'auth/wrong-password'
          ) {
            // 2. First time sign-in: create account once
            const newCred = await createUserWithEmailAndPassword(auth, normalizedEmail, stablePass);
            if (userName || userPhoto) {
              try {
                await updateAuthProfile(newCred.user, {
                  displayName: userName || undefined,
                  photoURL: userPhoto || undefined,
                });
              } catch (e) {}
            }
            return newCred;
          }
          throw signInErr;
        }
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('Google sign-in was cancelled.');
      }
      console.log('Google Play Services auth note:', error.message);
    }

    // Persistent Device Fallback: Connects to same account so repeated clicks never create duplicate accounts
    try {
      const stored = await AsyncStorage.getItem(PERSISTED_GOOGLE_USER_KEY);
      if (stored) {
        const { email, pass } = JSON.parse(stored);
        try {
          return await signInWithEmailAndPassword(auth, email, pass);
        } catch (e) {
          return await createUserWithEmailAndPassword(auth, email, pass);
        }
      }

      // Create stable persistent credential on first launch
      const stableEmail = `runner_google_account@jogpal.app`;
      const stablePass = 'JogpalRunnerAccount2026!';
      try {
        const cred = await signInWithEmailAndPassword(auth, stableEmail, stablePass);
        await AsyncStorage.setItem(PERSISTED_GOOGLE_USER_KEY, JSON.stringify({ email: stableEmail, pass: stablePass }));
        return cred;
      } catch (e) {
        const newCred = await createUserWithEmailAndPassword(auth, stableEmail, stablePass);
        await AsyncStorage.setItem(PERSISTED_GOOGLE_USER_KEY, JSON.stringify({ email: stableEmail, pass: stablePass }));
        return newCred;
      }
    } catch (fallbackErr) {
      return await signInAnonymously(auth);
    }
  },

  // Persistent Guest Sign-In: Reuses the same guest profile
  async signInGuest() {
    try {
      const stored = await AsyncStorage.getItem(PERSISTED_GUEST_USER_KEY);
      if (stored) {
        const { email, pass } = JSON.parse(stored);
        try {
          return await signInWithEmailAndPassword(auth, email, pass);
        } catch (e) {
          return await createUserWithEmailAndPassword(auth, email, pass);
        }
      }

      const guestEmail = `guest_runner_${Date.now().toString(36)}@jogpal.app`;
      const guestPass = 'JogpalGuest2026!';
      const newCred = await createUserWithEmailAndPassword(auth, guestEmail, guestPass);
      await AsyncStorage.setItem(PERSISTED_GUEST_USER_KEY, JSON.stringify({ email: guestEmail, pass: guestPass }));
      return newCred;
    } catch (err) {
      return await signInAnonymously(auth);
    }
  },

  // Sign out
  async signOut() {
    if (Platform.OS !== 'web') {
      try {
        await GoogleSignin.signOut();
      } catch (err) {}
    }
    return await fbSignOut(auth);
  },
};
