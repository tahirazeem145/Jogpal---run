import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { NeonCard } from '../components/NeonCard';
import { NeonButton } from '../components/NeonButton';
import { useApp } from '../context/AppContext';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { useTheme } from '../context/ThemeContext';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&q=80',
];

export const SettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { userProfile, updateProfile } = useApp();
  const { theme, colors, setTheme, isOrange } = useTheme();

  // Edit Profile Modal State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhotoURL, setEditPhotoURL] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleOpenEditModal = () => {
    setEditName(userProfile?.displayName || '');
    setEditPhotoURL(userProfile?.photoURL || undefined);
    setIsEditModalVisible(true);
  };

  const handlePickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Needed',
          'Please allow access to your photos so you can choose a profile image.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          setEditPhotoURL(`data:image/jpeg;base64,${asset.base64}`);
        } else if (asset.uri) {
          setEditPhotoURL(asset.uri);
        }
      }
    } catch (err: any) {
      Alert.alert('Error', 'Unable to pick image. Please try again.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Needed',
          'Please allow camera access to take your profile photo.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          setEditPhotoURL(`data:image/jpeg;base64,${asset.base64}`);
        } else if (asset.uri) {
          setEditPhotoURL(asset.uri);
        }
      }
    } catch (err: any) {
      Alert.alert('Error', 'Unable to capture photo. Please try again.');
    }
  };

  const handleRemovePhoto = () => {
    setEditPhotoURL(undefined);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Invalid Name', 'Please enter a valid display name.');
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        displayName: editName.trim(),
        photoURL: editPhotoURL || '',
      });
      setIsEditModalVisible(false);
      Alert.alert('Profile Updated', 'Your profile details have been successfully synced!');
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Could not update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await authService.signOut();
    navigation.replace('Login');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your Jogpal account and running history from Firebase?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const currentUser = authService.getCurrentUser();
              if (currentUser) {
                try {
                  await userService.deleteUserProfile(currentUser.uid);
                } catch (e) {}
                if (currentUser.email) {
                  try {
                    await authService.removeSavedGoogleAccount(currentUser.email);
                  } catch (e) {}
                }
                try {
                  await authService.deleteAccount();
                } catch (e) {}
              }
              await authService.signOut();
            } catch (err: any) {
              console.warn('Delete account warning:', err);
            } finally {
              navigation.replace('Login');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Settings</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. TOP PROFILE HERO CARD */}
        <View style={[styles.profileHeroCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.profileHeroLeft}>
            <View style={styles.avatarWrapper}>
              {userProfile?.photoURL ? (
                <Image source={{ uri: userProfile.photoURL }} style={[styles.profileAvatarImg, { borderColor: colors.primary }]} />
              ) : (
                <View style={[styles.profileAvatarPlaceholder, { backgroundColor: colors.cardSubtle, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.profileAvatarInitial, { color: colors.primary }]}>
                    {(userProfile?.displayName || 'R').trim().charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.avatarCameraBadge, { backgroundColor: colors.primary }]}
                onPress={handleOpenEditModal}
                activeOpacity={0.8}
              >
                <Feather name="camera" size={12} color="#000000" />
              </TouchableOpacity>
            </View>

            <View style={styles.profileHeroInfo}>
              <Text style={[styles.profileHeroName, { color: colors.textPrimary }]} numberOfLines={1}>
                {userProfile?.displayName || 'Runner'}
              </Text>
              <Text style={[styles.profileHeroEmail, { color: colors.textMuted }]} numberOfLines={1}>
                {userProfile?.email || 'runner@jogpal.app'}
              </Text>
              <View style={[styles.profileHeroBadge, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="flash" size={10} color={colors.primary} />
                <Text style={[styles.profileHeroBadgeText, { color: colors.primary }]}>
                  LEVEL {userProfile?.level || 1} • {userProfile?.rank || 'Runner'}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.editProfileBtn, { backgroundColor: colors.primary }]}
            onPress={handleOpenEditModal}
            activeOpacity={0.8}
          >
            <Feather name="edit-2" size={14} color="#000000" />
            <Text style={styles.editProfileBtnText}>EDIT</Text>
          </TouchableOpacity>
        </View>

        {/* 2. THEME & APPEARANCE SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="color-palette-outline" size={15} color={colors.primary} />
            <Text style={[styles.sectionHeader, { color: colors.primary }]}>THEME & APPEARANCE</Text>
          </View>

          <View style={[styles.themeOptionsContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {/* Option 1: Default (Neon Lime) */}
            <TouchableOpacity
              style={[
                styles.themeOptionRow,
                theme === 'default' && [styles.themeOptionRowActive, { borderColor: '#CCFF00', backgroundColor: 'rgba(204, 255, 0, 0.08)' }],
              ]}
              onPress={() => setTheme('default')}
              activeOpacity={0.7}
            >
              <View style={[styles.themeSwatch, { backgroundColor: '#CCFF00', borderColor: '#DAFF01' }]}>
                <Ionicons name="flash" size={14} color="#000000" />
              </View>

              <View style={styles.themeInfoContainer}>
                <View style={styles.themeTitleRow}>
                  <Text style={[styles.themeTitle, { color: colors.textPrimary }]}>Default (Neon Lime)</Text>
                  {theme === 'default' && (
                    <View style={[styles.activeThemeBadge, { backgroundColor: '#CCFF00' }]}>
                      <Text style={styles.activeThemeBadgeText}>ACTIVE</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.themeSubtitle, { color: colors.textMuted }]}>
                  High-visibility neon lime palette
                </Text>
              </View>

              <View style={[styles.radioCircle, theme === 'default' && { borderColor: '#CCFF00', backgroundColor: '#CCFF00' }]}>
                {theme === 'default' && <Ionicons name="checkmark" size={14} color="#000000" />}
              </View>
            </TouchableOpacity>

            <View style={[styles.themeDivider, { backgroundColor: colors.cardBorder }]} />

            {/* Option 2: Orange Theme (Claude) */}
            <TouchableOpacity
              style={[
                styles.themeOptionRow,
                theme === 'orange' && [styles.themeOptionRowActive, { borderColor: '#D97757', backgroundColor: 'rgba(217, 119, 87, 0.12)' }],
              ]}
              onPress={() => setTheme('orange')}
              activeOpacity={0.7}
            >
              <View style={[styles.themeSwatch, { backgroundColor: '#D97757', borderColor: '#E88665' }]}>
                <Ionicons name="flame" size={14} color="#000000" />
              </View>

              <View style={styles.themeInfoContainer}>
                <View style={styles.themeTitleRow}>
                  <Text style={[styles.themeTitle, { color: colors.textPrimary }]}>Orange Theme (Claude)</Text>
                  {theme === 'orange' && (
                    <View style={[styles.activeThemeBadge, { backgroundColor: '#D97757' }]}>
                      <Text style={styles.activeThemeBadgeText}>ACTIVE</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.themeSubtitle, { color: colors.textMuted }]}>
                  Warm Anthropic Claude terracotta orange
                </Text>
              </View>

              <View style={[styles.radioCircle, theme === 'orange' && { borderColor: '#D97757', backgroundColor: '#D97757' }]}>
                {theme === 'orange' && <Ionicons name="checkmark" size={14} color="#000000" />}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. ACCOUNT SECTION */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.primary }]}>ACCOUNT</Text>
          <NeonCard style={styles.card} contentStyle={styles.cardContent}>
            {/* Edit Profile & Photo */}
            <TouchableOpacity
              style={styles.itemRow}
              onPress={handleOpenEditModal}
              activeOpacity={0.7}
            >
              <View style={styles.iconBox}>
                <Feather name="user-check" size={18} color={colors.primary} />
              </View>
              <View style={styles.itemTextContainer}>
                <Text style={styles.itemTitle}>Edit Name & Photo</Text>
                <Text style={styles.itemSubtitle}>Change your runner name or upload avatar</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#000000" />
            </TouchableOpacity>

            {/* Profile Overview */}
            <TouchableOpacity
              style={styles.itemRow}
              onPress={() => (navigation as any).navigate('MainTabs', { screen: 'Profile' })}
              activeOpacity={0.7}
            >
              <View style={styles.iconBox}>
                <Ionicons name="bar-chart-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.itemTextContainer}>
                <Text style={styles.itemTitle}>Runner Analytics</Text>
                <Text style={styles.itemSubtitle}>View personal bests & stats</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#000000" />
            </TouchableOpacity>

            {/* Sign Out */}
            <TouchableOpacity
              style={styles.itemRow}
              onPress={handleSignOut}
              activeOpacity={0.7}
            >
              <View style={styles.iconBox}>
                <Feather name="log-out" size={18} color={colors.primary} />
              </View>
              <View style={styles.itemTextContainer}>
                <Text style={styles.itemTitle}>Sign Out</Text>
                <Text style={styles.itemSubtitle}>Log out of your Jogpal account</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#000000" />
            </TouchableOpacity>

            {/* Delete Account */}
            <TouchableOpacity
              style={[styles.itemRow, styles.lastItemRow]}
              onPress={handleDeleteAccount}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, styles.deleteIconBox]}>
                <Feather name="trash-2" size={18} color="#FF453A" />
              </View>
              <View style={styles.itemTextContainer}>
                <Text style={[styles.itemTitle, styles.deleteTitle]}>Delete Account</Text>
                <Text style={styles.itemSubtitle}>Permanently remove your data</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#991B1B" />
            </TouchableOpacity>
          </NeonCard>
        </View>
      </ScrollView>

      {/* EDIT PROFILE MODAL */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.cardBorder }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>EDIT RUNNER PROFILE</Text>
              <TouchableOpacity
                onPress={() => setIsEditModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Feather name="x" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
              {/* Photo Preview & Options */}
              <View style={styles.modalAvatarSection}>
                <View style={styles.largeAvatarWrapper}>
                  {editPhotoURL ? (
                    <Image source={{ uri: editPhotoURL }} style={[styles.largeAvatarImg, { borderColor: colors.primary }]} />
                  ) : (
                    <View style={[styles.largeAvatarPlaceholder, { backgroundColor: colors.cardSubtle, borderColor: colors.cardBorder }]}>
                      <Text style={[styles.largeAvatarInitial, { color: colors.primary }]}>
                        {(editName || 'R').trim().charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Photo Action Buttons */}
                <View style={styles.photoActionsRow}>
                  <TouchableOpacity
                    style={[styles.photoActionBtn, { backgroundColor: colors.cardSubtle, borderColor: colors.cardBorder }]}
                    onPress={handlePickFromGallery}
                    activeOpacity={0.7}
                  >
                    <Feather name="image" size={16} color={colors.primary} />
                    <Text style={[styles.photoActionBtnText, { color: colors.textPrimary }]}>Gallery</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.photoActionBtn, { backgroundColor: colors.cardSubtle, borderColor: colors.cardBorder }]}
                    onPress={handleTakePhoto}
                    activeOpacity={0.7}
                  >
                    <Feather name="camera" size={16} color={colors.primary} />
                    <Text style={[styles.photoActionBtnText, { color: colors.textPrimary }]}>Camera</Text>
                  </TouchableOpacity>

                  {!!editPhotoURL && (
                    <TouchableOpacity
                      style={[styles.photoActionBtn, styles.photoRemoveBtn]}
                      onPress={handleRemovePhoto}
                      activeOpacity={0.7}
                    >
                      <Feather name="trash" size={16} color="#FF453A" />
                      <Text style={[styles.photoActionBtnText, styles.photoRemoveBtnText]}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Preset Avatars Selection */}
                <View style={styles.presetSection}>
                  <Text style={[styles.presetSectionLabel, { color: colors.textMuted }]}>OR CHOOSE A RUNNER AVATAR</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
                    {PRESET_AVATARS.map((url, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.presetAvatarWrapper,
                          editPhotoURL === url && [styles.presetAvatarSelected, { borderColor: colors.primary }],
                        ]}
                        onPress={() => setEditPhotoURL(url)}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri: url }} style={styles.presetAvatarImg} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* Display Name Input */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>DISPLAY NAME</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.cardSubtle, borderColor: colors.cardBorder }]}>
                  <Feather name="user" size={18} color={colors.primary} />
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Enter your runner name"
                    placeholderTextColor={colors.textMuted}
                    maxLength={30}
                    autoCapitalize="words"
                  />
                  {editName.length > 0 && (
                    <TouchableOpacity onPress={() => setEditName('')}>
                      <Feather name="x-circle" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Save Button */}
              <View style={styles.modalFooter}>
                <NeonButton
                  title={isSaving ? 'SAVING...' : 'SAVE CHANGES'}
                  onPress={handleSaveProfile}
                  style={styles.saveBtn}
                />
                {isSaving && (
                  <View style={styles.savingIndicator}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  profileHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  profileHeroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  avatarWrapper: {
    position: 'relative',
  },
  profileAvatarImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
  },
  profileAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  profileAvatarInitial: {
    fontSize: 24,
    fontWeight: '900',
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  profileHeroInfo: {
    flex: 1,
    gap: 2,
  },
  profileHeroName: {
    fontSize: 18,
    fontWeight: '900',
  },
  profileHeroEmail: {
    fontSize: 12,
  },
  profileHeroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  profileHeroBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  editProfileBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  themeOptionsContainer: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  themeOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  themeOptionRowActive: {
    borderWidth: 1,
  },
  themeSwatch: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  themeInfoContainer: {
    flex: 1,
  },
  themeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  activeThemeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeThemeBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  themeSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#44444C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  card: {
    borderRadius: 24,
  },
  cardContent: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    position: 'relative',
    zIndex: 10,
  },
  lastItemRow: {
    borderBottomWidth: 0,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    position: 'relative',
    zIndex: 10,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  deleteIconBox: {
    backgroundColor: '#1E0606',
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.2,
  },
  deleteTitle: {
    color: '#991B1B',
  },
  itemSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(0, 0, 0, 0.65)',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '90%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalAvatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  largeAvatarWrapper: {
    marginBottom: 14,
  },
  largeAvatarImg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
  },
  largeAvatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  largeAvatarInitial: {
    fontSize: 36,
    fontWeight: '900',
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  photoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  photoActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  photoRemoveBtn: {
    borderColor: 'rgba(255, 69, 58, 0.4)',
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
  },
  photoRemoveBtnText: {
    color: '#FF453A',
  },
  presetSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
  },
  presetSectionLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 10,
  },
  presetRow: {
    gap: 10,
    paddingHorizontal: 4,
  },
  presetAvatarWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  presetAvatarSelected: {
    borderWidth: 2,
  },
  presetAvatarImg: {
    width: '100%',
    height: '100%',
  },
  modalInputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  modalFooter: {
    gap: 10,
    marginBottom: 20,
  },
  saveBtn: {
    width: '100%',
  },
  savingIndicator: {
    alignItems: 'center',
  },
});
