import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
  Alert,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { CrewMember } from '../types/data';
import { useTheme } from '../context/ThemeContext';

interface YourCrewSectionProps {
  crew?: CrewMember[];
  currentUserId?: string;
  onViewAllPress?: () => void;
  onMemberPress?: (member: CrewMember) => void;
  onStartDuoRun?: (member: CrewMember) => void;
  onStartGroupRun?: (member: CrewMember) => void;
}

export const YourCrewSection: React.FC<YourCrewSectionProps> = ({
  crew = [],
  currentUserId,
  onViewAllPress,
  onMemberPress,
  onStartDuoRun,
  onStartGroupRun,
}) => {
  const { colors } = useTheme();
  const [selectedMember, setSelectedMember] = useState<CrewMember | null>(null);
  const [showViewAllModal, setShowViewAllModal] = useState(false);

  // Filter out self
  const visibleCrew = crew.filter(
    (m) => m.id !== currentUserId && m.userId !== currentUserId
  );

  const handleSelectMember = (member: CrewMember) => {
    setSelectedMember(member);
    if (onMemberPress) onMemberPress(member);
  };

  const handleDuoRunClick = (member: CrewMember) => {
    setSelectedMember(null);
    if (onStartDuoRun) {
      onStartDuoRun(member);
    } else {
      Alert.alert(
        '⚡ Start Duo Run',
        `Starting a live synchronized Duo Run with ${member.name}! Ready to hit the road?`
      );
    }
  };

  const handleGroupRunClick = (member: CrewMember) => {
    setSelectedMember(null);
    if (onStartGroupRun) {
      onStartGroupRun(member);
    } else {
      Alert.alert(
        '👥 Start Group Run',
        `Starting a live squad run session with ${member.name} and your running crew!`
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithCount}>
          <Text style={[styles.titleText, { color: colors.textPrimary }]}>YOUR CREW</Text>
          <View style={[styles.countBadge, { backgroundColor: colors.accentSubtle, borderColor: colors.crewAddBorder }]}>
            <Text style={[styles.countText, { color: colors.primary }]}>{visibleCrew.length}</Text>
          </View>
        </View>

        {visibleCrew.length > 0 && (
          <TouchableOpacity
            onPress={() => setShowViewAllModal(true)}
            activeOpacity={0.7}
            style={styles.viewAllBtn}
          >
            <Text style={[styles.viewAllText, { color: colors.primary }]}>VIEW ALL</Text>
            <Feather name="chevron-right" size={14} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Horizontal Scrollable Avatars */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.crewScrollContent}
      >
        {visibleCrew.length === 0 ? (
          <View style={[styles.emptyScrollCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.accentSubtle }]}>
              <Feather name="users" size={20} color={colors.primary} />
            </View>
            <View style={styles.emptyTextCol}>
              <Text style={[styles.emptyScrollTitle, { color: colors.primary }]}>NO CREW MEMBERS YET</Text>
              <Text style={[styles.emptyScrollSubtitle, { color: colors.textSecondary }]}>
                Add friends from the section below to unlock Duo & Group runs!
              </Text>
            </View>
          </View>
        ) : (
          visibleCrew.map((member) => {
            const displayId = member.userId || member.id;
            const shortId = displayId.length > 8 ? `#${displayId.slice(0, 6)}` : `#${displayId}`;

            return (
              <TouchableOpacity
                key={member.id}
                style={styles.avatarItem}
                onPress={() => handleSelectMember(member)}
                activeOpacity={0.8}
              >
                <View style={[styles.avatarCircle, { backgroundColor: colors.avatarBg, borderColor: colors.avatarBorder }]}>
                  {member.photoURL || member.avatarUrl ? (
                    <Image
                      source={{ uri: member.photoURL || member.avatarUrl }}
                      style={styles.avatarImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={[styles.avatarInitial, { color: colors.textPrimary }]}>
                      {member.initial || member.name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                  {/* Online indicator */}
                  <View style={[styles.onlineDot, { backgroundColor: colors.primary }]} />
                </View>

                <Text style={[styles.memberName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {member.name}
                </Text>
                
                <View style={[styles.userIdPill, { backgroundColor: colors.cardSubtle, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.userIdText, { color: colors.textSecondary }]} numberOfLines={1}>
                    {shortId}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* 1. INTERACTIVE CREW MEMBER PROFILE MODAL (START DUO / GROUP RUN) */}
      <Modal
        visible={!!selectedMember}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMember(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.profileModalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {/* Close button */}
            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: colors.cardSubtle }]}
              onPress={() => setSelectedMember(null)}
            >
              <Feather name="x" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {selectedMember && (
              <>
                {/* Avatar & Header */}
                <View style={[styles.modalAvatarCircle, { backgroundColor: colors.crewAddBg, borderColor: colors.primary }]}>
                  {selectedMember.photoURL || selectedMember.avatarUrl ? (
                    <Image
                      source={{ uri: selectedMember.photoURL || selectedMember.avatarUrl }}
                      style={styles.modalAvatarImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={[styles.modalAvatarInitial, { color: colors.primary }]}>
                      {selectedMember.initial || selectedMember.name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>

                <View style={styles.nameBadgeRow}>
                  <Text style={[styles.modalRunnerName, { color: colors.textPrimary }]}>{selectedMember.name}</Text>
                  <View style={[styles.crewBadge, { backgroundColor: colors.accentSubtle, borderColor: colors.primaryMuted }]}>
                    <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
                    <Text style={[styles.crewBadgeText, { color: colors.primary }]}>CREW</Text>
                  </View>
                </View>
                
                {/* User ID Card */}
                <View style={[styles.modalIdCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                  <View style={styles.idLabelRow}>
                    <Feather name="hash" size={12} color={colors.primary} />
                    <Text style={[styles.idLabelText, { color: colors.primary }]}>RUNNER USER ID</Text>
                  </View>
                  <Text style={styles.fullIdText} selectable>
                    {selectedMember.userId || selectedMember.id}
                  </Text>
                  {selectedMember.email ? (
                    <Text style={[styles.idEmailText, { color: colors.textSecondary }]}>{selectedMember.email}</Text>
                  ) : null}
                </View>

                {/* Metrics Grid */}
                <View style={[styles.metricsGrid, { backgroundColor: colors.cardSubtle, borderColor: colors.cardBorder }]}>
                  <View style={styles.metricItem}>
                    <Text style={[styles.metricValue, { color: colors.primary }]}>LVL {selectedMember.level || 1}</Text>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>RUNNER LEVEL</Text>
                  </View>

                  <View style={[styles.metricDivider, { backgroundColor: colors.cardBorder }]} />

                  <View style={styles.metricItem}>
                    <Text style={[styles.metricValue, { color: colors.primary }]}>
                      {selectedMember.totalDistanceKm ? `${selectedMember.totalDistanceKm.toFixed(1)}K` : '0.0K'}
                    </Text>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>TOTAL DISTANCE</Text>
                  </View>

                  <View style={[styles.metricDivider, { backgroundColor: colors.cardBorder }]} />

                  <View style={styles.metricItem}>
                    <Text style={[styles.metricValue, { color: colors.primary }]}>{selectedMember.streakDays || 0}D</Text>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>RUN STREAK</Text>
                  </View>
                </View>

                {/* PROMINENT RUN LAUNCHER ACTIONS: DUO RUN & GROUP RUN */}
                <View style={styles.runActionSection}>
                  <Text style={[styles.runActionPrompt, { color: colors.textSecondary }]}>
                    START A RUN WITH {selectedMember.name.toUpperCase()}:
                  </Text>

                  {/* 1. START DUO RUN BUTTON */}
                  <TouchableOpacity
                    style={[styles.duoRunBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
                    onPress={() => handleDuoRunClick(selectedMember)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="flash" size={18} color="#000000" />
                    <Text style={styles.duoRunBtnText}>START DUO RUN</Text>
                  </TouchableOpacity>

                  {/* 2. START GROUP RUN BUTTON */}
                  <TouchableOpacity
                    style={[styles.groupRunBtn, { backgroundColor: colors.surface, borderColor: colors.primary }]}
                    onPress={() => handleGroupRunClick(selectedMember)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="people" size={18} color={colors.primary} />
                    <Text style={[styles.groupRunBtnText, { color: colors.primary }]}>START GROUP RUN</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* 2. VIEW ALL CREW MEMBERS MODAL */}
      <Modal
        visible={showViewAllModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowViewAllModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.viewAllModalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.viewAllHeader}>
              <View>
                <Text style={[styles.viewAllTitle, { color: colors.textPrimary }]}>YOUR CREW</Text>
                <Text style={[styles.viewAllSubtitle, { color: colors.textSecondary }]}>
                  {visibleCrew.length === 1 ? '1 Connected Runner' : `${visibleCrew.length} Connected Runners`}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: colors.cardSubtle }]}
                onPress={() => setShowViewAllModal(false)}
              >
                <Feather name="x" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.runnersList} showsVerticalScrollIndicator={false}>
              {visibleCrew.map((runner) => (
                <TouchableOpacity
                  key={runner.id}
                  style={[styles.runnerRowCard, { backgroundColor: colors.cardSubtle, borderColor: colors.cardBorder }]}
                  onPress={() => {
                    setShowViewAllModal(false);
                    setSelectedMember(runner);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.runnerRowAvatar, { backgroundColor: colors.avatarBg, borderColor: colors.avatarBorder }]}>
                    {runner.photoURL || runner.avatarUrl ? (
                      <Image
                        source={{ uri: runner.photoURL || runner.avatarUrl }}
                        style={styles.runnerRowAvatarImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={[styles.runnerRowInitial, { color: colors.primary }]}>
                        {runner.initial || runner.name.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>

                  <View style={styles.runnerRowInfo}>
                    <Text style={[styles.runnerRowName, { color: colors.textPrimary }]}>{runner.name}</Text>
                    <Text style={[styles.runnerRowId, { color: colors.textSecondary }]} numberOfLines={1}>
                      ID: {runner.userId || runner.id}
                    </Text>
                  </View>

                  <View style={[styles.actionTag, { backgroundColor: colors.accentSubtle, borderColor: colors.primaryMuted }]}>
                    <Ionicons name="flash" size={12} color={colors.primary} />
                    <Text style={[styles.actionTagText, { color: colors.primary }]}>RUN</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginTop: 22,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleWithCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  countText: {
    fontSize: 11,
    fontWeight: '900',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  crewScrollContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingRight: 10,
  },
  avatarItem: {
    alignItems: 'center',
    width: 68,
  },
  avatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    position: 'relative',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 29,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#000000',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '900',
  },
  memberName: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 68,
  },
  userIdPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    marginTop: 2,
    borderWidth: 1,
  },
  userIdText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  emptyScrollCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    gap: 12,
    width: '100%',
  },
  emptyIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTextCol: {
    flex: 1,
  },
  emptyScrollTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  emptyScrollSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },

  // Modals Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  profileModalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    position: 'relative',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalAvatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  modalAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  modalAvatarInitial: {
    fontSize: 28,
    fontWeight: '900',
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalRunnerName: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  crewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    gap: 3,
  },
  crewBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  modalIdCard: {
    width: '100%',
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    marginBottom: 14,
    borderWidth: 1,
  },
  idLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  idLabelText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  fullIdText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  idEmailText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  metricDivider: {
    width: 1,
    height: 22,
  },
  runActionSection: {
    width: '100%',
    gap: 10,
  },
  runActionPrompt: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginBottom: 2,
  },
  duoRunBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  duoRunBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1,
  },
  groupRunBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 8,
  },
  groupRunBtnText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },

  // View All Modal
  viewAllModalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  viewAllHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  viewAllTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  viewAllSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  runnersList: {
    maxHeight: 340,
  },
  runnerRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
  },
  runnerRowAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  runnerRowAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  runnerRowInitial: {
    fontSize: 16,
    fontWeight: '900',
  },
  runnerRowInfo: {
    flex: 1,
  },
  runnerRowName: {
    fontSize: 14,
    fontWeight: '800',
  },
  runnerRowId: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  actionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  actionTagText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
