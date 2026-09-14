import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { CoverThemeId, Community } from '../../types/community';
import { COVER_THEMES, communityService } from '../../services/communityService';
import { CommunityThemeBanner } from './CommunityThemeBanner';
import { useTheme } from '../../context/ThemeContext';

interface CreateCommunityModalProps {
  visible: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  onCreated?: (community: Community) => void;
}

export const CreateCommunityModal: React.FC<CreateCommunityModalProps> = ({
  visible,
  onClose,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onCreated,
}) => {
  const { colors } = useTheme();

  // Creation Steps:
  // Step 1: Mandatory Questions & Guidelines Info
  // Step 2: Community Details (Name, Category, Location, Tagline, Description)
  // Step 3: Mandatory Rules & What Members Will See
  // Step 4: Cover Theme & Branding
  const [step, setStep] = useState<number>(1);

  // Form State
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [category, setCategory] = useState<Community['category']>('CASUAL_JOG');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [mandatoryRulesText, setMandatoryRulesText] = useState(
    'Proper running shoes required\nBe punctual for departure\nHydration pack or bottle'
  );
  const [memberPerksText, setMemberPerksText] = useState(
    'Weekly hosted group runs\nLive weather & wind reports\nSynchronized pacing groups\nCommunity leaderboards'
  );
  const [selectedTheme, setSelectedTheme] = useState<CoverThemeId>('NEON_SUNSET');
  const [imageUrl, setImageUrl] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories: { label: string; value: Community['category']; icon: string }[] = [
    { label: 'Casual Jog', value: 'CASUAL_JOG', icon: 'walk-outline' },
    { label: 'Night Sprint', value: 'NIGHT_RUN', icon: 'moon-outline' },
    { label: 'Speed Sprints', value: 'SPEED_SPRINT', icon: 'flash-outline' },
    { label: 'Marathon Prep', value: 'MARATHON', icon: 'trophy-outline' },
    { label: 'Trail Run', value: 'TRAIL_RUN', icon: 'compass-outline' },
    { label: 'Fitness & Social', value: 'FITNESS_SOCIAL', icon: 'people-outline' },
  ];

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Field', 'Please enter a Community Name.');
      return;
    }
    if (!location.trim()) {
      Alert.alert('Missing Field', 'Please specify a Primary Location.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Missing Field', 'Please write a brief Community Description.');
      return;
    }

    setIsSubmitting(true);

    const rules = mandatoryRulesText
      .split('\n')
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    const perks = memberPerksText
      .split('\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const newComm = await communityService.createCommunity({
      name: name.trim(),
      tagline: tagline.trim() || 'Running together, stronger together.',
      category,
      description: description.trim(),
      hostId: currentUserId,
      hostName: currentUserName,
      hostAvatar: currentUserAvatar,
      coverTheme: selectedTheme,
      coverImageUrl: imageUrl.trim() || undefined,
      location: location.trim(),
      mandatoryRules: rules.length > 0 ? rules : ['Running shoes required', 'Be respectful to all runners'],
      memberPerks: perks.length > 0 ? perks : ['Weekly hosted runs', 'Live weather updates'],
      isPublic,
    });

    setIsSubmitting(false);
    Alert.alert('Community Created! 🎉', `Your community "${newComm.name}" is now live and visible to all runners in the app!`);
    if (onCreated) onCreated(newComm);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {step === 1 ? 'COMMUNITY SETUP GUIDELINES' : `STEP ${step} OF 4: BUILD COMMUNITY`}
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                {step === 1 && 'What is mandatory & what members will see'}
                {step === 2 && 'Essentials: Name, Category & Location'}
                {step === 3 && 'Mandatory Rules & Member Perks'}
                {step === 4 && 'Cover Theme Branding & Visibility'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.cardSubtle }]}
              onPress={onClose}
            >
              <Feather name="x" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Step Progress Indicator */}
          <View style={styles.progressRow}>
            {[1, 2, 3, 4].map((s) => (
              <View
                key={s}
                style={[
                  styles.progressBar,
                  {
                    backgroundColor: s <= step ? colors.primary : colors.cardBorder,
                  },
                ]}
              />
            ))}
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* STEP 1: PRE-CREATION GUIDANCE & MANDATORY INFO */}
            {step === 1 && (
              <View style={styles.guidanceContainer}>
                <View style={[styles.guidanceCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                  <View style={styles.iconTitleRow}>
                    <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
                    <Text style={[styles.guidanceTitle, { color: colors.primary }]}>
                      MANDATORY CREATION QUESTIONS
                    </Text>
                  </View>
                  <Text style={[styles.guidanceText, { color: colors.textPrimary }]}>
                    Before hosting a community in Jogpal, review the mandatory requirements every host must provide:
                  </Text>

                  <View style={styles.questionList}>
                    <View style={styles.qItem}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                      <Text style={[styles.qText, { color: colors.textPrimary }]}>
                        <Text style={{ fontWeight: '900' }}>Community Purpose & Name:</Text> Clear title reflecting your running style (Sprint, Marathon, Casual, Night).
                      </Text>
                    </View>

                    <View style={styles.qItem}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                      <Text style={[styles.qText, { color: colors.textPrimary }]}>
                        <Text style={{ fontWeight: '900' }}>Primary Location & Base:</Text> Where your group meets for hosted runs.
                      </Text>
                    </View>

                    <View style={styles.qItem}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                      <Text style={[styles.qText, { color: colors.textPrimary }]}>
                        <Text style={{ fontWeight: '900' }}>Mandatory Member Rules:</Text> What items or conduct are mandatory (shoes, reflective gear, pace rules).
                      </Text>
                    </View>
                  </View>
                </View>

                {/* What People Will See Card */}
                <View style={[styles.guidanceCard, { backgroundColor: colors.accentSubtle, borderColor: colors.primaryMuted }]}>
                  <View style={styles.iconTitleRow}>
                    <Ionicons name="eye-outline" size={22} color={colors.primary} />
                    <Text style={[styles.guidanceTitle, { color: colors.primary }]}>
                      WHAT PROSPECTIVE MEMBERS WILL SEE
                    </Text>
                  </View>
                  <Text style={[styles.guidanceText, { color: colors.textPrimary }]}>
                    When runners search or explore communities, they will see:
                  </Text>

                  <View style={styles.questionList}>
                    <View style={styles.qItem}>
                      <Feather name="layers" size={15} color={colors.primary} />
                      <Text style={[styles.qText, { color: colors.textPrimary }]}>
                        Custom <Text style={{ fontWeight: '900' }}>Cover Theme Banner</Text> & Tagline.
                      </Text>
                    </View>
                    <View style={styles.qItem}>
                      <Feather name="cloud-rain" size={15} color={colors.primary} />
                      <Text style={[styles.qText, { color: colors.textPrimary }]}>
                        Hosted <Text style={{ fontWeight: '900' }}>Community Events with Live Weather Forecasts</Text>.
                      </Text>
                    </View>
                    <View style={styles.qItem}>
                      <Feather name="users" size={15} color={colors.primary} />
                      <Text style={[styles.qText, { color: colors.textPrimary }]}>
                        Member count & option to <Text style={{ fontWeight: '900' }}>Request to Join / Participate</Text>.
                      </Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setStep(2)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.actionBtnText}>START CREATING COMMUNITY</Text>
                  <Feather name="arrow-right" size={18} color="#000000" />
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 2: ESSENTIALS */}
            {step === 2 && (
              <View style={styles.formSection}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>COMMUNITY NAME *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                  placeholder="e.g. Neon Sunset Runners"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />

                <Text style={[styles.label, { color: colors.textPrimary }]}>SHORT TAGLINE</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                  placeholder="e.g. Chasing golden hour sprints & evening loops"
                  placeholderTextColor={colors.textMuted}
                  value={tagline}
                  onChangeText={setTagline}
                />

                <Text style={[styles.label, { color: colors.textPrimary }]}>CATEGORY</Text>
                <View style={styles.categoryGrid}>
                  {categories.map((cat) => {
                    const isSelected = category === cat.value;
                    return (
                      <TouchableOpacity
                        key={cat.value}
                        style={[
                          styles.catCard,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.surface,
                            borderColor: isSelected ? colors.primary : colors.cardBorder,
                          },
                        ]}
                        onPress={() => setCategory(cat.value)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={cat.icon as any}
                          size={18}
                          color={isSelected ? '#000000' : colors.primary}
                        />
                        <Text
                          style={[
                            styles.catText,
                            { color: isSelected ? '#000000' : colors.textPrimary },
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.label, { color: colors.textPrimary }]}>PRIMARY LOCATION *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                  placeholder="e.g. Riverfront Park, Central Loop"
                  placeholderTextColor={colors.textMuted}
                  value={location}
                  onChangeText={setLocation}
                />

                <Text style={[styles.label, { color: colors.textPrimary }]}>DESCRIPTION *</Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                  placeholder="Describe your community focus, run schedule, pace groups..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={4}
                  value={description}
                  onChangeText={setDescription}
                />

                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={[styles.secondaryBtn, { borderColor: colors.cardBorder }]}
                    onPress={() => setStep(1)}
                  >
                    <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>BACK</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtnFlex, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      if (!name.trim() || !location.trim() || !description.trim()) {
                        Alert.alert('Required Fields', 'Please fill in Name, Location, and Description.');
                        return;
                      }
                      setStep(3);
                    }}
                  >
                    <Text style={styles.actionBtnText}>NEXT: RULES & PERKS</Text>
                    <Feather name="arrow-right" size={16} color="#000000" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* STEP 3: RULES & PERKS */}
            {step === 3 && (
              <View style={styles.formSection}>
                <View style={[styles.infoBanner, { backgroundColor: colors.accentSubtle, borderColor: colors.primaryMuted }]}>
                  <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                  <Text style={[styles.infoBannerText, { color: colors.primary }]}>
                    List mandatory rules (e.g. footwear, punctuality) and perks runners get when joining.
                  </Text>
                </View>

                <Text style={[styles.label, { color: colors.textPrimary }]}>
                  MANDATORY COMMUNITY RULES (1 per line)
                </Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                  placeholder="e.g. Proper running shoes required&#10;Be punctual for departure"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={4}
                  value={mandatoryRulesText}
                  onChangeText={setMandatoryRulesText}
                />

                <Text style={[styles.label, { color: colors.textPrimary }]}>
                  WHAT MEMBERS WILL GET & SEE (1 per line)
                </Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                  placeholder="e.g. Weekly hosted runs&#10;Live weather reports&#10;Pacing groups"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={4}
                  value={memberPerksText}
                  onChangeText={setMemberPerksText}
                />

                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={[styles.secondaryBtn, { borderColor: colors.cardBorder }]}
                    onPress={() => setStep(2)}
                  >
                    <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>BACK</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtnFlex, { backgroundColor: colors.primary }]}
                    onPress={() => setStep(4)}
                  >
                    <Text style={styles.actionBtnText}>NEXT: THEME & BRANDING</Text>
                    <Feather name="arrow-right" size={16} color="#000000" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* STEP 4: COVER THEME & BRANDING */}
            {step === 4 && (
              <View style={styles.formSection}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>LIVE COVER THEME PREVIEW</Text>
                <CommunityThemeBanner
                  themeId={selectedTheme}
                  title={name || 'YOUR COMMUNITY NAME'}
                  tagline={tagline || 'Your tagline goes here'}
                  categoryName={category}
                  location={location || 'Primary Location'}
                  membersCount={1}
                  imageUrl={imageUrl || undefined}
                  height={150}
                  style={{ marginBottom: 16 }}
                />

                <Text style={[styles.label, { color: colors.textPrimary }]}>SELECT COVER THEME</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.themeScroll}>
                  {(Object.keys(COVER_THEMES) as CoverThemeId[]).map((tId) => {
                    const themeObj = COVER_THEMES[tId];
                    const isSelected = selectedTheme === tId;
                    return (
                      <TouchableOpacity
                        key={tId}
                        style={[
                          styles.themeOptionCard,
                          {
                            borderColor: isSelected ? themeObj.primaryColor : colors.cardBorder,
                            backgroundColor: isSelected ? 'rgba(0, 242, 254, 0.15)' : colors.surface,
                          },
                        ]}
                        onPress={() => setSelectedTheme(tId)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.themeColorDot, { backgroundColor: themeObj.primaryColor }]} />
                        <Text style={[styles.themeName, { color: colors.textPrimary }]}>{themeObj.name}</Text>
                        {isSelected && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <Text style={[styles.label, { color: colors.textPrimary }]}>OPTIONAL COVER IMAGE URL</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                  placeholder="https://images.unsplash.com/photo-..."
                  placeholderTextColor={colors.textMuted}
                  value={imageUrl}
                  onChangeText={setImageUrl}
                />

                {/* Public vs Private Approval Switch */}
                <View style={[styles.switchRow, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                      {isPublic ? 'Public Community (Instant Join)' : 'Restricted (Host Approval Required)'}
                    </Text>
                    <Text style={[styles.switchSub, { color: colors.textSecondary }]}>
                      {isPublic
                        ? 'Any runner can join immediately.'
                        : 'Runners must send a Join Request for your approval.'}
                    </Text>
                  </View>
                  <Switch
                    value={isPublic}
                    onValueChange={setIsPublic}
                    trackColor={{ false: '#4A4A4A', true: colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={[styles.secondaryBtn, { borderColor: colors.cardBorder }]}
                    onPress={() => setStep(3)}
                  >
                    <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>BACK</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtnFlex, { backgroundColor: colors.primary }]}
                    onPress={handleCreate}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.actionBtnText}>
                      {isSubmitting ? 'CREATING...' : 'PUBLISH COMMUNITY'}
                    </Text>
                    <Ionicons name="sparkles" size={16} color="#000000" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '90%',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  modalSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  scrollArea: {
    maxHeight: 480,
  },
  guidanceContainer: {
    gap: 16,
  },
  guidanceCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  iconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guidanceTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  guidanceText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  questionList: {
    gap: 8,
    marginTop: 4,
  },
  qItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  qText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
    lineHeight: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    marginTop: 8,
  },
  actionBtnFlex: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.8,
  },
  formSection: {
    gap: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  textArea: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    fontSize: 13,
    fontWeight: '600',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  catText: {
    fontSize: 11,
    fontWeight: '800',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  secondaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  infoBannerText: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  themeScroll: {
    marginVertical: 4,
  },
  themeOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    marginRight: 8,
    gap: 8,
  },
  themeColorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  themeName: {
    fontSize: 11,
    fontWeight: '800',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  switchTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  switchSub: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});
