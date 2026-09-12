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
  sendPasswordResetEmail,
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
const SAVED_GOOGLE_ACCOUNTS_KEY = '@jogpal_saved_google_accounts_list';

export interface SavedGoogleAccount {
  email: string;
  name?: string;
  photoURL?: string;
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

  // Send password reset email
  async sendPasswordReset(email: string) {
    return await sendPasswordResetEmail(auth, email.trim().toLowerCase());
  },

  // Retrieve locally remembered Google accounts for fast switching
  async getSavedGoogleAccounts(): Promise<SavedGoogleAccount[]> {
    try {
      const stored = await AsyncStorage.getItem(SAVED_GOOGLE_ACCOUNTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  // Save / remember a Google account on device
  async saveGoogleAccount(acc: SavedGoogleAccount) {
    try {
      const list = await authService.getSavedGoogleAccounts();
      const filtered = list.filter((a) => a.email.toLowerCase() !== acc.email.toLowerCase());
      const updated = [acc, ...filtered];
      await AsyncStorage.setItem(SAVED_GOOGLE_ACCOUNTS_KEY, JSON.stringify(updated));
    } catch (e) {}
  },

  // Remove a remembered Google account
  async removeSavedGoogleAccount(email: string) {
    try {
      const list = await authService.getSavedGoogleAccounts();
      const filtered = list.filter((a) => a.email.toLowerCase() !== email.toLowerCase());
      await AsyncStorage.setItem(SAVED_GOOGLE_ACCOUNTS_KEY, JSON.stringify(filtered));
    } catch (e) {}
  },

  // Sign in or create a distinct account for a given Google email
  async signInWithGoogleEmail(
    email: string,
    displayName?: string,
    photoURL?: string,
    customPassword?: string
  ) {
    const normalizedEmail = email.trim().toLowerCase();
    const stablePass = customPassword || `Jogpal_GAuth_${normalizedEmail.replace(/[^a-z0-9]/g, '')}_2026!`;
    let cred;
    try {
      // 1. Try logging in with the stable generated pass or provided custom password
      cred = await signInWithEmailAndPassword(auth, normalizedEmail, stablePass);
    } catch (signInErr: any) {
      if (customPassword) {
        throw signInErr;
      }
      if (
        signInErr.code === 'auth/user-not-found' ||
        signInErr.code === 'auth/invalid-credential' ||
        signInErr.code === 'auth/wrong-password'
      ) {
        try {
          // 2. Create distinct new account for this new Google user
          cred = await createUserWithEmailAndPassword(auth, normalizedEmail, stablePass);
        } catch (createErr: any) {
          if (createErr.code === 'auth/email-already-in-use') {
            const err: any = new Error(
              `${normalizedEmail} was previously registered with a custom password. Please enter your password to connect.`
            );
            err.code = 'REQUIRES_PASSWORD';
            throw err;
          }
          throw createErr;
        }
      } else {
        throw signInErr;
      }
    }

    if (cred && cred.user && (displayName || photoURL)) {
      try {
        await updateAuthProfile(cred.user, {
          displayName: cred.user.displayName || displayName || undefined,
          photoURL: cred.user.photoURL || photoURL || undefined,
        });
      } catch (e) {}
    }

    // Save to device Google accounts list
    await authService.saveGoogleAccount({
      email: normalizedEmail,
      name: displayName || cred.user.displayName || normalizedEmail.split('@')[0],
      photoURL: photoURL || cred.user.photoURL || undefined,
    });

    return cred;
  },

  // Sign in with email and password (always logs into existing account)
  async signIn(email: string, pass: string) {
    return await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), pass);
  },

  // Sign up with email and password (creates new account only when user registers)
  async signUp(email: string, pass: string) {
    return await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), pass);
  },

  // Sign in with Google: Tries Native Play Services or signals account chooser
  async signInWithGoogle() {
    if (Platform.OS === 'web') {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      return await signInWithPopup(auth, provider);
    }

    // On Mobile: Use Native Google Play Services
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Clear any cached session so Google Play Services ALWAYS shows account chooser
      try {
        await GoogleSignin.signOut();
      } catch (e) {}

      const signInResult = await GoogleSignin.signIn();

      const idToken =
        (signInResult as any)?.data?.idToken ||
        (signInResult as any)?.idToken;
      const userObj =
        (signInResult as any)?.data?.user ||
        (signInResult as any)?.user;
      const userEmail = userObj?.email;
      const userName = userObj?.name || userObj?.givenName;
      const userPhoto = userObj?.photo;

      if (idToken) {
        try {
          const credential = GoogleAuthProvider.credential(idToken);
          const cred = await signInWithCredential(auth, credential);
          if (userName || userPhoto) {
            try {
              await updateAuthProfile(cred.user, {
                displayName: cred.user.displayName || userName || undefined,
                photoURL: cred.user.photoURL || userPhoto || undefined,
              });
            } catch (e) {}
          }
          if (userEmail) {
            await authService.saveGoogleAccount({
              email: userEmail,
              name: userName,
              photoURL: userPhoto,
            });
          }
          return cred;
        } catch (credErr: any) {
          if (
            credErr.code === 'auth/account-exists-with-different-credential' ||
            credErr.code === 'auth/email-already-in-use' ||
            credErr.code === 'auth/credential-already-in-use'
          ) {
            if (userEmail) {
              return await authService.signInWithGoogleEmail(userEmail, userName, userPhoto);
            }
          }
          throw credErr;
        }
      }

      // If idToken was not generated, authenticate deterministically with selected Google Email
      if (userEmail) {
        return await authService.signInWithGoogleEmail(userEmail, userName, userPhoto);
      }

      throw new Error('No email returned from Google Account.');
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('Google sign-in was cancelled.');
      }
      if (error.code === statusCodes.IN_PROGRESS) {
        throw new Error('Google sign-in is already in progress.');
      }
      if (error.code === 'REQUIRES_PASSWORD') {
        throw error;
      }
      // Return custom flag so LoginScreen can open the Google Account Chooser UI
      return { needsAccountChooser: true, originalError: error.message } as any;
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

  // Delete current authenticated account and clear Google sessions
  async deleteAccount() {
    const user = auth.currentUser;
    if (user) {
      if (Platform.OS !== 'web') {
        try {
          await GoogleSignin.signOut();
        } catch (err) {}
        try {
          await GoogleSignin.revokeAccess();
        } catch (err) {}
      }
      await user.delete();
    }
  },

  // Sign out: Thoroughly disconnects Google session and clears cached auth
  async signOut() {
    if (Platform.OS !== 'web') {
      try {
        await GoogleSignin.signOut();
      } catch (err) {}
      try {
        await GoogleSignin.revokeAccess();
      } catch (err) {}
    }
    return await fbSignOut(auth);
  },
};
