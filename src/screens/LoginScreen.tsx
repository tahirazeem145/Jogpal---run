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
import { useTheme } from '../theme/colors';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
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
      setErrorMessage(err.message || 'Google Sign-In was cancelled or failed.');
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
      style={[styles.container, { backgroundColor: colors.background }]}
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
          <View style={[styles.logoBadge, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
            <MaterialCommunityIcons name="run-fast" size={36} color="#000000" />
          </View>
          <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>JOGPAL</Text>
          <Text style={[styles.brandTagline, { color: colors.primary }]}>TRACK. RUN. CONQUER.</Text>
        </View>

        {/* Tab Selector: Sign In / Create Account */}
        <View style={[styles.tabSelector, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <TouchableOpacity
            style={[styles.tabButton, !isSignUp && [styles.tabButtonActive, { backgroundColor: colors.cardSubtle }]]}
            onPress={() => {
              setIsSignUp(false);
              setErrorMessage('');
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, { color: colors.textSecondary }, !isSignUp && { color: colors.primary }]}>
              SIGN IN
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, isSignUp && [styles.tabButtonActive, { backgroundColor: colors.cardSubtle }]]}
            onPress={() => {
              setIsSignUp(true);
              setErrorMessage('');
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, { color: colors.textSecondary }, isSignUp && { color: colors.primary }]}>
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
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>FULL NAME</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Feather name="user" size={18} color={colors.textSecondary} />
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary }]}
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
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>EMAIL ADDRESS</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Feather name="mail" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.textInput, { color: colors.textPrimary }]}
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
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>PASSWORD</Text>
              {!isSignUp && (
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert(
                      'Reset Password',
                      'Please enter your email to receive a password reset link.'
                    )
                  }
                >
                  <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>FORGOT?</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Feather name="lock" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.textInput, { color: colors.textPrimary }]}
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
              <ActivityIndicator size="large" color={colors.primary} />
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
            <View style={[styles.dividerLine, { backgroundColor: colors.cardBorder }]} />
            <Text style={[styles.dividerText, { color: colors.textMuted }]}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.cardBorder }]} />
          </View>

          {/* Google Sign In Button */}
          <TouchableOpacity
            style={[styles.googleButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={handleGoogleSignIn}
            activeOpacity={0.85}
            disabled={loading}
          >
            <GoogleIcon size={20} />
            <Text style={styles.googleButtonText}>CONTINUE WITH GOOGLE</Text>
          </TouchableOpacity>

          {/* Guest Sign In Button */}
          <TouchableOpacity
            style={[styles.guestButton, { backgroundColor: colors.accentSubtle, borderColor: colors.primary }]}
            onPress={handleGuestSignIn}
            activeOpacity={0.8}
            disabled={loading}
          >
            <Ionicons name="flash-outline" size={18} color={colors.primary} />
            <Text style={[styles.guestButtonText, { color: colors.primary }]}>CONTINUE AS GUEST</Text>
          </TouchableOpacity>
        </View>

        {/* Security Footer */}
        <View style={styles.footer}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
  },
  brandTagline: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.5,
    marginTop: 4,
  },
  tabSelector: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabButtonActive: {
  },
  tabText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
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
    letterSpacing: 0.8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    gap: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
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
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
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
    borderWidth: 1.5,
    gap: 8,
  },
  guestButtonText: {
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
    fontWeight: '600',
  },
});
