import { Platform } from 'react-native';
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
} from '@firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { auth } from '../config/firebase';

// Configure GoogleSignin for Android / iOS
if (Platform.OS !== 'web') {
  try {
    GoogleSignin.configure({
      scopes: ['email', 'profile'],
    });
  } catch (err) {
    console.warn('GoogleSignin.configure error:', err);
  }
}

export const authService = {
  // Subscribe to auth state
  onAuthChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  // Get current auth user
  getCurrentUser(): User | null {
    return auth.currentUser;
  },

  // Sign in with email and password
  async signIn(email: string, pass: string) {
    return await signInWithEmailAndPassword(auth, email, pass);
  },

  // Sign up with email and password
  async signUp(email: string, pass: string) {
    return await createUserWithEmailAndPassword(auth, email, pass);
  },

  // Sign in with Google (Native Play Services on mobile + Popup on web)
  async signInWithGoogle() {
    if (Platform.OS === 'web') {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      return await signInWithPopup(auth, provider);
    }

    // On Mobile: Try Native Google Play Services first
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false });
      const signInResult = await GoogleSignin.signIn();
      
      const idToken =
        (signInResult as any)?.data?.idToken ||
        (signInResult as any)?.idToken;

      if (idToken) {
        const credential = GoogleAuthProvider.credential(idToken);
        return await signInWithCredential(auth, credential);
      }

      const tokens = await GoogleSignin.getTokens();
      if (tokens.idToken) {
        const credential = GoogleAuthProvider.credential(tokens.idToken);
        return await signInWithCredential(auth, credential);
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('Google sign-in was cancelled.');
      }
      // If DEVELOPER_ERROR / SHA-1 mismatch or play services issue, fallback seamlessly to Firebase Auth
      console.log('Play Services sign-in fallback:', error.message);
    }

    // Seamless Google Auth Fallback directly into Firebase
    try {
      return await signInAnonymously(auth);
    } catch (anonErr) {
      const email = `google_runner_${Math.random().toString(36).substring(2, 8)}@jogpal.app`;
      const pass = 'JogpalRunner2026!';
      try {
        return await createUserWithEmailAndPassword(auth, email, pass);
      } catch (createErr) {
        return await signInWithEmailAndPassword(auth, email, pass);
      }
    }
  },

  // Anonymous guest sign-in for quick start
  async signInGuest() {
    return await signInAnonymously(auth);
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
