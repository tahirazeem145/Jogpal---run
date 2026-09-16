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
  Modal,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NeonButton } from '../components/NeonButton';
import { GoogleIcon } from '../components/GoogleIcon';
import { authService, SavedGoogleAccount } from '../services/authService';
import { userService } from '../services/userService';
import { UserProfile } from '../types/data';
import { useTheme } from '../context/ThemeContext';

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

  // Google Account Chooser State
  const [googleModalVisible, setGoogleModalVisible] = useState(false);
  const [savedGoogleAccounts, setSavedGoogleAccounts] = useState<SavedGoogleAccount[]>([]);
  const [inputGoogleEmail, setInputGoogleEmail] = useState('');
  const [inputGoogleName, setInputGoogleName] = useState('');
  const [isAddingNewGoogleAccount, setIsAddingNewGoogleAccount] = useState(false);
  const [googleActionLoading, setGoogleActionLoading] = useState(false);
  const [passwordRequiredAccount, setPasswordRequiredAccount] = useState<{
    email: string;
    name?: string;
    photoURL?: string;
  } | null>(null);
  const [inputGooglePassword, setInputGooglePassword] = useState('');
  const [showGooglePassword, setShowGooglePassword] = useState(false);

  const syncUserProfile = async (authUser: any, customName?: string, customPhoto?: string) => {
    const existingProfile = await userService.getUserProfile(authUser.uid);
    if (!existingProfile) {
      const newProfile: Partial<UserProfile> = {
        id: authUser.uid,
        displayName: customName || authUser.displayName || authUser.email?.split('@')[0] || 'Runner',
        email: authUser.email || '',
        level: 1,
        streakDays: 0,
        totalDistanceKm: 0,
        totalJogs: 0,
        recordsCount: 0,
        passportUnlockedCount: 0,
        passportTotalCount: 30,
        locationSharing: true,
      };
      if (customPhoto || authUser.photoURL) {
        newProfile.photoURL = customPhoto || authUser.photoURL;
      }
      await userService.saveUserProfile(authUser.uid, newProfile);
    } else {
      const updates: Partial<UserProfile> = {};
      if (customPhoto) {
        updates.photoURL = customPhoto;
      }
      if (customName && (!existingProfile.displayName || existingProfile.displayName === 'Runner')) {
        updates.displayName = customName;
      }
      if (Object.keys(updates).length > 0) {
        await userService.saveUserProfile(authUser.uid, updates);
      }
    }
  };

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
        if (userCred.user) {
          await syncUserProfile(userCred.user, name.trim());
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

  const handleMainForgotPassword = async () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      Alert.alert(
        'Email Required',
        'Please enter your email address in the EMAIL ADDRESS field above, then tap FORGOT to receive a reset link.'
      );
      return;
    }
    try {
      setLoading(true);
      await authService.sendPasswordReset(trimmed);
      Alert.alert(
        'Reset Link Sent',
        `A password reset link has been sent to ${trimmed}. Check your inbox (and spam folder) to reset your password.`
      );
    } catch (err: any) {
      Alert.alert('Reset Error', err.message || 'Could not send reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const result: any = await authService.signInWithGoogle();
      if (result && result.needsAccountChooser) {
        // When native play services requires account choice or config, display Google account chooser
        const accounts = await authService.getSavedGoogleAccounts();
        setSavedGoogleAccounts(accounts);
        setIsAddingNewGoogleAccount(accounts.length === 0);
        setPasswordRequiredAccount(null);
        setGoogleModalVisible(true);
        return;
      }
      if (result && result.user) {
        await syncUserProfile(result.user);
        if (onLoginSuccess) onLoginSuccess();
      }
    } catch (err: any) {
      if (err.code === 'REQUIRES_PASSWORD') {
        const accounts = await authService.getSavedGoogleAccounts();
        setSavedGoogleAccounts(accounts);
        setPasswordRequiredAccount({ email: err.email || email.trim() || '' });
        setGoogleModalVisible(true);
      } else if (err.message && err.message.includes('cancelled')) {
        // User cancelled
      } else {
        // Open Google Account Chooser
        const accounts = await authService.getSavedGoogleAccounts();
        setSavedGoogleAccounts(accounts);
        setIsAddingNewGoogleAccount(accounts.length === 0);
        setPasswordRequiredAccount(null);
        setGoogleModalVisible(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGoogleAccount = async (account: SavedGoogleAccount) => {
    setGoogleActionLoading(true);
    try {
      const userCred = await authService.signInWithGoogleEmail(
        account.email,
        account.name,
        account.photoURL
      );
      if (userCred && userCred.user) {
        await syncUserProfile(userCred.user, account.name, account.photoURL);
      }
      setGoogleModalVisible(false);
      setPasswordRequiredAccount(null);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      if (err.code === 'REQUIRES_PASSWORD') {
        setPasswordRequiredAccount({
          email: account.email,
          name: account.name,
          photoURL: account.photoURL,
        });
        setInputGooglePassword('');
      } else {
        Alert.alert('Google Sign-In Failed', err.message || 'Could not authenticate with this Google account.');
      }
    } finally {
      setGoogleActionLoading(false);
    }
  };

  const handleAddNewGoogleAccount = async () => {
    const rawEmail = inputGoogleEmail.trim().toLowerCase();
    if (!rawEmail || !rawEmail.includes('@')) {
      Alert.alert('Valid Email Required', 'Please enter a valid Google email address.');
      return;
    }
    setGoogleActionLoading(true);
    try {
      const userCred = await authService.signInWithGoogleEmail(
        rawEmail,
        inputGoogleName.trim() || undefined
      );
      if (userCred && userCred.user) {
        await syncUserProfile(userCred.user, inputGoogleName.trim() || undefined);
      }
      setGoogleModalVisible(false);
      setPasswordRequiredAccount(null);
      setInputGoogleEmail('');
      setInputGoogleName('');
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      if (err.code === 'REQUIRES_PASSWORD') {
        setPasswordRequiredAccount({
          email: rawEmail,
          name: inputGoogleName.trim() || undefined,
        });
        setInputGooglePassword('');
      } else {
        Alert.alert('Google Sign-In Failed', err.message || 'Could not sign in with this Google account.');
      }
    } finally {
      setGoogleActionLoading(false);
    }
  };

  const handleConnectWithPassword = async () => {
    if (!passwordRequiredAccount || !inputGooglePassword.trim()) {
      Alert.alert('Password Required', 'Please enter your password to connect your account.');
      return;
    }
    setGoogleActionLoading(true);
    try {
      const userCred = await authService.signInWithGoogleEmail(
        passwordRequiredAccount.email,
        passwordRequiredAccount.name,
        passwordRequiredAccount.photoURL,
        inputGooglePassword
      );
      if (userCred && userCred.user) {
        await syncUserProfile(
          userCred.user,
          passwordRequiredAccount.name,
          passwordRequiredAccount.photoURL
        );
      }
      setGoogleModalVisible(false);
      setPasswordRequiredAccount(null);
      setInputGooglePassword('');
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      let msg = err.message || 'Incorrect password.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Incorrect password. Tap "Send Reset Link" below if you forgot your password.';
      }
      Alert.alert('Sign-In Failed', msg);
    } finally {
      setGoogleActionLoading(false);
    }
  };

  const handleSendPasswordReset = async (targetEmail: string) => {
    try {
      await authService.sendPasswordReset(targetEmail);
      Alert.alert(
        'Password Reset Email Sent',
        `A password reset link has been sent to ${targetEmail}. Please check your inbox and spam folder.`
      );
    } catch (err: any) {
      Alert.alert('Reset Failed', err.message || 'Could not send password reset email.');
    }
  };

  const handleRemoveAccount = async (accEmail: string) => {
    await authService.removeSavedGoogleAccount(accEmail);
    const updated = await authService.getSavedGoogleAccounts();
    setSavedGoogleAccounts(updated);
    if (updated.length === 0) {
      setIsAddingNewGoogleAccount(true);
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
          <Text style={[styles.brandTagline, { color: colors.primary }]}>RUN TOGETHER, ANYWHERE</Text>
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
                <TouchableOpacity onPress={handleMainForgotPassword}>
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

        </View>

        {/* Security Footer */}
        <View style={styles.footer}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Secured with Firebase Authentication & Cloud Firestore
          </Text>
        </View>
      </ScrollView>

      {/* Google Account Chooser Modal */}
      <Modal
        visible={googleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setGoogleModalVisible(false);
          setPasswordRequiredAccount(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.googleModalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {/* Header */}
            <View style={styles.googleModalHeader}>
              <View style={styles.googleBrandBadge}>
                <GoogleIcon size={24} />
              </View>
              <Text style={[styles.googleModalTitle, { color: colors.textPrimary }]}>
                {passwordRequiredAccount ? 'Connect Account' : 'Sign in with Google'}
              </Text>
              <Text style={[styles.googleModalSubtitle, { color: colors.textSecondary }]}>
                {passwordRequiredAccount
                  ? 'Enter password to connect your account'
                  : 'Choose an account to continue to Jogpal'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => {
                  setGoogleModalVisible(false);
                  setPasswordRequiredAccount(null);
                }}
                activeOpacity={0.7}
              >
                <Feather name="x" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {googleActionLoading ? (
              <View style={styles.googleModalLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.googleModalLoadingText, { color: colors.primary }]}>
                  AUTHENTICATING WITH GOOGLE...
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.googleModalScroll} showsVerticalScrollIndicator={false}>
                {/* 1. Account Requires Password Form */}
                {passwordRequiredAccount ? (
                  <View style={styles.newAccountForm}>
                    <View style={[styles.passwordRequiredBanner, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                      <Feather name="lock" size={18} color={colors.primary} />
                      <Text style={[styles.passwordRequiredBannerTitle, { color: colors.textPrimary }]}>
                        {passwordRequiredAccount.email}
                      </Text>
                      <Text style={[styles.passwordRequiredBannerSubtitle, { color: colors.textSecondary }]}>
                        This account was registered with a custom password. Enter your password below to sign in:
                      </Text>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>PASSWORD</Text>
                      <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                        <Feather name="lock" size={18} color={colors.textSecondary} />
                        <TextInput
                          style={[styles.textInput, { color: colors.textPrimary }]}
                          placeholder="••••••••"
                          placeholderTextColor={colors.textMuted}
                          value={inputGooglePassword}
                          onChangeText={setInputGooglePassword}
                          secureTextEntry={!showGooglePassword}
                          autoFocus
                        />
                        <TouchableOpacity
                          onPress={() => setShowGooglePassword(!showGooglePassword)}
                          style={styles.eyeButton}
                        >
                          <Feather
                            name={showGooglePassword ? 'eye-off' : 'eye'}
                            size={18}
                            color={colors.textSecondary}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <NeonButton
                      title="CONNECT & SIGN IN"
                      onPress={handleConnectWithPassword}
                      style={{ marginTop: 6 }}
                    />

                    <TouchableOpacity
                      style={[styles.sendResetBtn, { borderColor: colors.cardBorder }]}
                      onPress={() => handleSendPasswordReset(passwordRequiredAccount.email)}
                      activeOpacity={0.75}
                    >
                      <Feather name="mail" size={14} color={colors.primary} />
                      <Text style={[styles.sendResetText, { color: colors.primary }]}>
                        Forgot Password? Send Reset Link
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.backToSavedBtn}
                      onPress={() => setPasswordRequiredAccount(null)}
                      activeOpacity={0.7}
                    >
                      <Feather name="arrow-left" size={14} color={colors.textSecondary} />
                      <Text style={[styles.backToSavedText, { color: colors.textSecondary }]}>
                        Choose a different account
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : !isAddingNewGoogleAccount && savedGoogleAccounts.length > 0 ? (
                  <View style={styles.savedAccountsList}>
                    {savedGoogleAccounts.map((acc) => {
                      const initial = (acc.name?.charAt(0) || acc.email.charAt(0) || 'G').toUpperCase();
                      return (
                        <TouchableOpacity
                          key={acc.email}
                          style={[styles.accountItemRow, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                          onPress={() => handleSelectGoogleAccount(acc)}
                          activeOpacity={0.75}
                        >
                          <View style={[styles.accountAvatar, { backgroundColor: colors.accentSubtle, borderColor: colors.primary }]}>
                            {acc.photoURL ? (
                              <Image source={{ uri: acc.photoURL }} style={styles.accountAvatarImg} />
                            ) : (
                              <Text style={[styles.accountAvatarInitial, { color: colors.primary }]}>
                                {initial}
                              </Text>
                            )}
                          </View>

                          <View style={styles.accountTextCol}>
                            <Text style={[styles.accountNameText, { color: colors.textPrimary }]} numberOfLines={1}>
                              {acc.name || acc.email.split('@')[0]}
                            </Text>
                            <Text style={[styles.accountEmailText, { color: colors.textSecondary }]} numberOfLines={1}>
                              {acc.email}
                            </Text>
                          </View>

                          <TouchableOpacity
                            style={styles.accountRemoveBtn}
                            onPress={(e) => {
                              e.stopPropagation?.();
                              handleRemoveAccount(acc.email);
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Feather name="trash-2" size={14} color={colors.textMuted} />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      );
                    })}

                    <TouchableOpacity
                      style={[styles.useAnotherAccountBtn, { borderColor: colors.cardBorder }]}
                      onPress={() => setIsAddingNewGoogleAccount(true)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.plusBadge, { backgroundColor: colors.accentSubtle }]}>
                        <Feather name="plus" size={16} color={colors.primary} />
                      </View>
                      <Text style={[styles.useAnotherText, { color: colors.primary }]}>
                        Use another Google account
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.newAccountForm}>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>GOOGLE EMAIL ADDRESS</Text>
                      <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                        <Feather name="mail" size={18} color={colors.textSecondary} />
                        <TextInput
                          style={[styles.textInput, { color: colors.textPrimary }]}
                          placeholder="e.g. runner@gmail.com"
                          placeholderTextColor={colors.textMuted}
                          value={inputGoogleEmail}
                          onChangeText={setInputGoogleEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoFocus
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>RUNNER NAME (OPTIONAL)</Text>
                      <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                        <Feather name="user" size={18} color={colors.textSecondary} />
                        <TextInput
                          style={[styles.textInput, { color: colors.textPrimary }]}
                          placeholder="e.g. Tahir Azeem"
                          placeholderTextColor={colors.textMuted}
                          value={inputGoogleName}
                          onChangeText={setInputGoogleName}
                          autoCapitalize="words"
                        />
                      </View>
                    </View>

                    <NeonButton
                      title="CONTINUE WITH THIS ACCOUNT"
                      onPress={handleAddNewGoogleAccount}
                      style={{ marginTop: 8 }}
                    />

                    {savedGoogleAccounts.length > 0 && (
                      <TouchableOpacity
                        style={styles.backToSavedBtn}
                        onPress={() => setIsAddingNewGoogleAccount(false)}
                        activeOpacity={0.7}
                      >
                        <Feather name="arrow-left" size={14} color={colors.textSecondary} />
                        <Text style={[styles.backToSavedText, { color: colors.textSecondary }]}>
                          Back to saved accounts
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  googleModalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    position: 'relative',
    maxHeight: '85%',
  },
  googleModalHeader: {
    alignItems: 'center',
    marginBottom: 18,
    position: 'relative',
    width: '100%',
  },
  googleBrandBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  googleModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  googleModalSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleModalLoading: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 14,
  },
  googleModalLoadingText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  googleModalScroll: {
    maxHeight: 320,
  },
  savedAccountsList: {
    gap: 10,
  },
  accountItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  accountAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  accountAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  accountAvatarInitial: {
    fontSize: 16,
    fontWeight: '900',
  },
  accountTextCol: {
    flex: 1,
    marginLeft: 4,
  },
  accountNameText: {
    fontSize: 14,
    fontWeight: '800',
  },
  accountEmailText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  accountRemoveBtn: {
    padding: 6,
  },
  useAnotherAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 12,
    marginTop: 4,
  },
  plusBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  useAnotherText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  newAccountForm: {
    gap: 14,
    paddingTop: 4,
  },
  backToSavedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  backToSavedText: {
    fontSize: 12,
    fontWeight: '700',
  },
  passwordRequiredBanner: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  passwordRequiredBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  passwordRequiredBannerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },
  sendResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginTop: 2,
  },
  sendResetText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
