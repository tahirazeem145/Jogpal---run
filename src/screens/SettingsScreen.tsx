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
import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { NeonCard } from '../components/NeonCard';
import { NeonButton } from '../components/NeonButton';
import { useApp } from '../context/AppContext';
import { authService } from '../services/authService';
import { colors } from '../theme/colors';

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
            await authService.signOut();
            navigation.replace('Login');
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* TOP PROFILE HERO CARD */}
        <View style={styles.profileHeroCard}>
          <View style={styles.profileHeroLeft}>
            <View style={styles.avatarWrapper}>
              {userProfile?.photoURL ? (
                <Image source={{ uri: userProfile.photoURL }} style={styles.profileAvatarImg} />
              ) : (
                <View style={styles.profileAvatarPlaceholder}>
                  <Text style={styles.profileAvatarInitial}>
                    {(userProfile?.displayName || 'R').trim().charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.avatarCameraBadge}
                onPress={handleOpenEditModal}
                activeOpacity={0.8}
              >
                <Feather name="camera" size={12} color="#000000" />
              </TouchableOpacity>
            </View>

            <View style={styles.profileHeroInfo}>
              <Text style={styles.profileHeroName} numberOfLines={1}>
                {userProfile?.displayName || 'Runner'}
              </Text>
              <Text style={styles.profileHeroEmail} numberOfLines={1}>
                {userProfile?.email || 'runner@jogpal.app'}
              </Text>
              <View style={styles.profileHeroBadge}>
                <Ionicons name="flash" size={10} color={colors.limePrimary} />
                <Text style={styles.profileHeroBadgeText}>
                  LEVEL {userProfile?.level || 1} • {userProfile?.rank || 'Runner'}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={handleOpenEditModal}
            activeOpacity={0.8}
          >
            <Feather name="edit-2" size={14} color="#000000" />
            <Text style={styles.editProfileBtnText}>EDIT</Text>
          </TouchableOpacity>
        </View>

        {/* ACCOUNT Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ACCOUNT</Text>
          <NeonCard style={styles.card} contentStyle={styles.cardContent}>
            {/* Edit Profile & Photo */}
            <TouchableOpacity
              style={styles.itemRow}
              onPress={handleOpenEditModal}
              activeOpacity={0.7}
            >
              <View style={styles.iconBox}>
                <Feather name="user-check" size={18} color="#000000" />
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
                <Ionicons name="id-card-outline" size={20} color="#000000" />
              </View>
              <View style={styles.itemTextContainer}>
                <Text style={styles.itemTitle}>Jogpal Passport</Text>
                <Text style={styles.itemSubtitle}>View your trophies and milestones</Text>
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
                <Feather name="log-out" size={18} color="#000000" />
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
                <Feather name="trash-2" size={18} color="#991B1B" />
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
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>EDIT RUNNER PROFILE</Text>
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
                    <Image source={{ uri: editPhotoURL }} style={styles.largeAvatarImg} />
                  ) : (
                    <View style={styles.largeAvatarPlaceholder}>
                      <Text style={styles.largeAvatarInitial}>
                        {(editName || 'R').trim().charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Photo Action Buttons */}
                <View style={styles.photoActionRow}>
                  <TouchableOpacity
                    style={styles.photoActionBtn}
                    onPress={handlePickFromGallery}
                    activeOpacity={0.8}
                  >
                    <Feather name="image" size={16} color={colors.limePrimary} />
                    <Text style={styles.photoActionText}>Choose Photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.photoActionBtn}
                    onPress={handleTakePhoto}
                    activeOpacity={0.8}
                  >
                    <Feather name="camera" size={16} color={colors.limePrimary} />
                    <Text style={styles.photoActionText}>Take Photo</Text>
                  </TouchableOpacity>

                  {!!editPhotoURL && (
                    <TouchableOpacity
                      style={[styles.photoActionBtn, styles.removePhotoBtn]}
                      onPress={handleRemovePhoto}
                      activeOpacity={0.8}
                    >
                      <Feather name="trash-2" size={16} color="#FF453A" />
                      <Text style={styles.removePhotoText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Preset Avatars Selector */}
                <View style={styles.presetSection}>
                  <Text style={styles.presetLabel}>OR CHOOSE A RUNNER AVATAR</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
                    {PRESET_AVATARS.map((url, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.presetAvatarBtn,
                          editPhotoURL === url && styles.presetAvatarSelected,
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

              {/* Name Input Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>RUNNER DISPLAY NAME</Text>
                <View style={styles.inputWrapper}>
                  <Feather name="user" size={18} color={colors.limePrimary} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your runner name"
                    placeholderTextColor={colors.textMuted}
                    value={editName}
                    onChangeText={setEditName}
                    autoCapitalize="words"
                    maxLength={30}
                  />
                  {editName.length > 0 && (
                    <TouchableOpacity onPress={() => setEditName('')} style={styles.clearBtn}>
                      <Feather name="x-circle" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Save & Cancel Buttons */}
              <View style={styles.modalButtonContainer}>
                {isSaving ? (
                  <View style={styles.savingContainer}>
                    <ActivityIndicator size="small" color={colors.limePrimary} />
                    <Text style={styles.savingText}>Saving to Firebase...</Text>
                  </View>
                ) : (
                  <>
                    <NeonButton
                      title="SAVE CHANGES"
                      onPress={handleSaveProfile}
                      style={styles.saveBtn}
                    />
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => setIsEditModalVisible(false)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cancelBtnText}>CANCEL</Text>
                    </TouchableOpacity>
                  </>
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
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  profileHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#151518',
    borderRadius: 22,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#26262B',
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
    borderColor: colors.limePrimary,
  },
  profileAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#26262B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.limePrimary,
  },
  profileAvatarInitial: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.limePrimary,
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.limePrimary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#151518',
  },
  profileHeroInfo: {
    flex: 1,
    gap: 2,
  },
  profileHeroName: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  profileHeroEmail: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  profileHeroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  profileHeroBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.limePrimary,
    letterSpacing: 0.5,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.limePrimary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 5,
  },
  editProfileBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.8,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.limePrimary,
    letterSpacing: 1.2,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: 26,
  },
  cardContent: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  lastItemRow: {
    paddingBottom: 4,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  deleteIconBox: {
    backgroundColor: 'rgba(153, 27, 27, 0.15)',
  },
  itemTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000000',
  },
  deleteTitle: {
    color: '#991B1B',
  },
  itemSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2A2A2A',
    marginTop: 2,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#121215',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#24242A',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#202024',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.limePrimary,
    letterSpacing: 1.5,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalBody: {
    marginTop: 16,
  },
  modalAvatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  largeAvatarWrapper: {
    marginBottom: 16,
  },
  largeAvatarImg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: colors.limePrimary,
  },
  largeAvatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1E1E22',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.limePrimary,
  },
  largeAvatarInitial: {
    fontSize: 40,
    fontWeight: '900',
    color: colors.limePrimary,
  },
  photoActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  photoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C20',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: '#2C2C34',
  },
  photoActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  removePhotoBtn: {
    borderColor: 'rgba(255, 69, 58, 0.4)',
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
  },
  removePhotoText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF453A',
  },
  presetSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
  },
  presetLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 10,
  },
  presetRow: {
    gap: 12,
    paddingHorizontal: 10,
  },
  presetAvatarBtn: {
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 2,
  },
  presetAvatarSelected: {
    borderColor: colors.limePrimary,
  },
  presetAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  inputGroup: {
    gap: 8,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181C',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: '#2A2A32',
    gap: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  clearBtn: {
    padding: 4,
  },
  modalButtonContainer: {
    gap: 10,
    marginTop: 8,
  },
  saveBtn: {
    width: '100%',
  },
  cancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  savingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  savingText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.limePrimary,
  },
});
