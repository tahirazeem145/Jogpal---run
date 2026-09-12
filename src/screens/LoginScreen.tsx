import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NeonButton } from '../components/NeonButton';
import { GoogleIcon } from '../components/GoogleIcon';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { UserProfile } from '../types/data';
import { colors } from '../theme/colors';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const insets = useSafeAreaInsets();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async () => {
    setErrorMessage('');
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    if (isSignUp && !name.trim()) {
      setErrorMessage('Please enter your name.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const userCred = await authService.signUp(email.trim(), password);
        // Save initial profile in Firestore
        if (userCred.user) {
          await userService.saveUserProfile(userCred.user.uid, {
            id: userCred.user.uid,
            displayName: name.trim() || email.split('@')[0] || 'Runner',
            email: email.trim(),
            level: 1,
            streakDays: 0,
            totalDistanceKm: 0,
            totalJogs: 0,
            recordsCount: 0,
            passportUnlockedCount: 0,
            passportTotalCount: 30,
            locationSharing: true,
          });
        }
      } else {
        await authService.signIn(email.trim(), password);
      }
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      let msg = err.message || 'Authentication failed. Please check your credentials.';
      if (err.code === 'auth/invalid-email') msg = 'Invalid email address.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password.';
      }
      if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists.';
      }
      if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const userCred = await authService.signInWithGoogle();
      if (userCred.user) {
        // Ensure user profile is registered in Firestore
        const existingProfile = await userService.getUserProfile(userCred.user.uid);
        if (!existingProfile) {
          const newProfile: Partial<UserProfile> = {
            id: userCred.user.uid,
            displayName: userCred.user.displayName || userCred.user.email?.split('@')[0] || 'Runner',
            email: userCred.user.email || '',
            level: 1,
            streakDays: 0,
            totalDistanceKm: 0,
            totalJogs: 0,
            recordsCount: 0,
            passportUnlockedCount: 0,
            passportTotalCount: 30,
            locationSharing: true,
          };
          if (userCred.user.photoURL) {
            newProfile.photoURL = userCred.user.photoURL;
          }
          await userService.saveUserProfile(userCred.user.uid, newProfile);
        }
      }
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.message?.includes('cancelled')) {
        // User cancelled popup / dialog
      } else {
        setErrorMessage(err.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      await authService.signInGuest();
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      // If anonymous auth is disabled on project, still grant guest entry
      if (onLoginSuccess) onLoginSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <MaterialCommunityIcons name="run-fast" size={36} color="#000000" />
          </View>
          <Text style={styles.brandTitle}>JOGPAL</Text>
          <Text style={styles.brandTagline}>TRACK. RUN. CONQUER.</Text>
        </View>

        {/* Tab Selector: Sign In / Create Account */}
        <View style={styles.tabSelector}>
          <TouchableOpacity
            style={[styles.tabButton, !isSignUp && styles.tabButtonActive]}
            onPress={() => {
              setIsSignUp(false);
              setErrorMessage('');
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, !isSignUp && styles.tabTextActive]}>
              SIGN IN
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, isSignUp && styles.tabButtonActive]}
            onPress={() => {
              setIsSignUp(true);
              setErrorMessage('');
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, isSignUp && styles.tabTextActive]}>
              CREATE ACCOUNT
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error Banner */}
        {!!errorMessage && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={18} color="#FF453A" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Input Card */}
        <View style={styles.formContainer}>
          {/* Full Name field (Sign up only) */}
          {isSignUp && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>FULL NAME</Text>
              <View style={styles.inputWrapper}>
                <Feather name="user" size={18} color={colors.textSecondary} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Alex Rivera"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          {/* Email field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
            <View style={styles.inputWrapper}>
              <Feather name="mail" size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.textInput}
                placeholder="runner@jogpal.app"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Password field */}
          <View style={styles.inputGroup}>
            <View style={styles.passwordHeader}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              {!isSignUp && (
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert(
                      'Reset Password',
                      'Please enter your email to receive a password reset link.'
                    )
                  }
                >
                  <Text style={styles.forgotPasswordText}>FORGOT?</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.inputWrapper}>
              <Feather name="lock" size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.textInput}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Feather
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Primary Action Button with Honeycomb Badges */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.limePrimary} />
            </View>
          ) : (
            <NeonButton
              title={isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN TO JOGPAL'}
              onPress={handleSubmit}
              style={styles.submitButton}
            />
          )}

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign In Button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            activeOpacity={0.85}
            disabled={loading}
          >
            <GoogleIcon size={20} />
            <Text style={styles.googleButtonText}>CONTINUE WITH GOOGLE</Text>
          </TouchableOpacity>

          {/* Guest Sign In Button */}
          <TouchableOpacity
            style={styles.guestButton}
            onPress={handleGuestSignIn}
            activeOpacity={0.8}
            disabled={loading}
          >
            <Ionicons name="flash-outline" size={18} color={colors.limePrimary} />
            <Text style={styles.guestButtonText}>CONTINUE AS GUEST</Text>
          </TouchableOpacity>
        </View>

        {/* Security Footer */}
        <View style={styles.footer}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.textMuted} />
          <Text style={styles.footerText}>
            Secured with Firebase Authentication & Cloud Firestore
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    justifyContent: 'center',
    flexGrow: 1,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.limePrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: colors.limePrimary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  brandTagline: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.limePrimary,
    letterSpacing: 2.5,
    marginTop: 4,
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: '#151517',
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#242428',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabButtonActive: {
    backgroundColor: '#222226',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  tabTextActive: {
    color: colors.limePrimary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.3)',
  },
  errorText: {
    color: '#FF453A',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  formContainer: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginLeft: 4,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotPasswordText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.limePrimary,
    letterSpacing: 0.8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151517',
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: '#242428',
    gap: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  eyeButton: {
    padding: 4,
  },
  submitButton: {
    marginTop: 6,
  },
  loadingContainer: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#202024',
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1A1A1D',
    borderWidth: 1,
    borderColor: '#303036',
    gap: 12,
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 26,
    backgroundColor: '#162308',
    borderWidth: 1.5,
    borderColor: '#547B0E',
    gap: 8,
  },
  guestButtonText: {
    color: colors.limePrimary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
    gap: 6,
  },
  footerText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
