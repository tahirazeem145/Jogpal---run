import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { CrewMember } from '../types/data';
import { colors } from '../theme/colors';
import { NeonButton } from './NeonButton';

const EXCLUDED_IDS = ['PZSFwysaREWaGkLZxIY1qm06b282'];

interface YourCrewSectionProps {
  crew?: CrewMember[];
  currentUserId?: string;
  onViewAllPress?: () => void;
  onAddCrewPress?: (name: string, email?: string, userId?: string) => Promise<void> | void;
  onSendRequest?: (toUserId: string) => Promise<{ success: boolean; message: string }> | Promise<void>;
  onMemberPress?: (member: CrewMember) => void;
}

export const YourCrewSection: React.FC<YourCrewSectionProps> = ({
  crew = [],
  currentUserId,
  onViewAllPress,
  onAddCrewPress,
  onSendRequest,
  onMemberPress,
}) => {
  const [selectedMember, setSelectedMember] = useState<CrewMember | null>(null);
  const [showViewAllModal, setShowViewAllModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputRunnerId, setInputRunnerId] = useState('');
  const [inputRunnerName, setInputRunnerName] = useState('');
  const [requestedRunners, setRequestedRunners] = useState<Record<string, boolean>>({});

  // Filter out the requested ID
  const visibleCrew = crew.filter(
    (m) =>
      !EXCLUDED_IDS.includes(m.id) &&
      !(m.userId && EXCLUDED_IDS.includes(m.userId))
  );

  const handleSelectMember = (member: CrewMember) => {
    setSelectedMember(member);
    if (onMemberPress) onMemberPress(member);
  };

  const handleOpenViewAll = () => {
    if (onViewAllPress) {
      onViewAllPress();
    }
    setShowViewAllModal(true);
  };

  const handleSendRequest = async (member: CrewMember) => {
    const memberKey = member.userId || member.id;
    setRequestedRunners((prev) => ({ ...prev, [memberKey]: true }));
    if (onSendRequest) {
      const res: any = await onSendRequest(memberKey);
      if (res && res.success === false) {
        Alert.alert('Notice', res.message || 'Could not send request');
        return;
      }
    }
    Alert.alert(
      'Request Sent 📨',
      `Your crew run request has been sent to ${member.name}. They will receive a notification to accept or decline.`
    );
  };

  const handleAddSubmit = async () => {
    const name = inputRunnerName.trim();
    const runnerId = inputRunnerId.trim();
    if (!name && !runnerId) {
      Alert.alert('Required', 'Please enter a Runner User ID or Name.');
      return;
    }

    const targetId = runnerId || undefined;

    // Send live Firestore request if ID is provided
    if (targetId && onSendRequest) {
      await onSendRequest(targetId);
      setRequestedRunners((prev) => ({ ...prev, [targetId]: true }));
    }

    if (onAddCrewPress) {
      await onAddCrewPress(name || runnerId, undefined, runnerId || undefined);
    }
    setInputRunnerId('');
    setInputRunnerName('');
    setShowAddModal(false);
    Alert.alert('Crew Request Dispatched', `Crew invite sent to ${name || runnerId}!`);
  };

  const filteredCrew = visibleCrew.filter((m) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      m.name.toLowerCase().includes(q) ||
      (m.userId && m.userId.toLowerCase().includes(q)) ||
      (m.id && m.id.toLowerCase().includes(q)) ||
      (m.email && m.email.toLowerCase().includes(q))
    );
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithCount}>
          <Text style={styles.titleText}>YOUR CREW</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{visibleCrew.length}</Text>
          </View>
        </View>

        <TouchableOpacity onPress={handleOpenViewAll} activeOpacity={0.7} style={styles.viewAllBtn}>
          <Text style={styles.viewAllText}>VIEW ALL</Text>
          <Feather name="chevron-right" size={14} color={colors.limePrimary} />
        </TouchableOpacity>
      </View>

      {/* Horizontal Scrollable Avatars */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.crewScrollContent}
      >
        {visibleCrew.length === 0 ? (
          <View style={styles.emptyScrollCard}>
            <Text style={styles.emptyScrollTitle}>NO CREW ONLINE</Text>
            <Text style={styles.emptyScrollSubtitle}>Invite friends by User ID to run together</Text>
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
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitial}>
                    {member.initial || member.name.charAt(0).toUpperCase()}
                  </Text>
                  {/* Online indicator */}
                  <View style={styles.onlineDot} />
                </View>

                <Text style={styles.memberName} numberOfLines={1}>
                  {member.name}
                </Text>
                
                <View style={styles.userIdPill}>
                  <Text style={styles.userIdText} numberOfLines={1}>
                    {shortId}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Add / Invite Crew Button */}
        <TouchableOpacity
          style={styles.addItem}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.8}
        >
          <View style={styles.addButton}>
            <Feather name="plus" size={24} color={colors.limePrimary} />
          </View>
          <Text style={styles.addText}>INVITE</Text>
          <Text style={styles.addSubtitle}>BY ID</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 1. RUNNER PROFILE DETAILS MODAL (WITH REQUEST BUTTON) */}
      <Modal
        visible={!!selectedMember}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMember(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.profileModalCard}>
            {/* Close button */}
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setSelectedMember(null)}
            >
              <Feather name="x" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {selectedMember && (
              <>
                {/* Avatar & Header */}
                <View style={styles.modalAvatarCircle}>
                  <Text style={styles.modalAvatarInitial}>
                    {selectedMember.initial || selectedMember.name.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <Text style={styles.modalRunnerName}>{selectedMember.name}</Text>
                
                {/* Full User ID Card */}
                <View style={styles.modalIdCard}>
                  <View style={styles.idLabelRow}>
                    <Feather name="hash" size={12} color={colors.limePrimary} />
                    <Text style={styles.idLabelText}>RUNNER USER ID</Text>
                  </View>
                  <Text style={styles.fullIdText} selectable>
                    {selectedMember.userId || selectedMember.id}
                  </Text>
                  {selectedMember.email ? (
                    <Text style={styles.idEmailText}>{selectedMember.email}</Text>
                  ) : null}
                </View>

                {/* Metrics Grid */}
                <View style={styles.metricsGrid}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricValue}>LVL {selectedMember.level || 1}</Text>
                    <Text style={styles.metricLabel}>RUNNER LEVEL</Text>
                  </View>

                  <View style={styles.metricDivider} />

                  <View style={styles.metricItem}>
                    <Text style={styles.metricValue}>
                      {selectedMember.totalDistanceKm ? `${selectedMember.totalDistanceKm.toFixed(1)}K` : '0.0K'}
                    </Text>
                    <Text style={styles.metricLabel}>TOTAL DISTANCE</Text>
                  </View>

                  <View style={styles.metricDivider} />

                  <View style={styles.metricItem}>
                    <Text style={styles.metricValue}>{selectedMember.streakDays || 0}D</Text>
                    <Text style={styles.metricLabel}>RUN STREAK</Text>
                  </View>
                </View>

                {/* Single REQUEST Button (Replacing cheer and challenge) */}
                <View style={styles.modalActionRow}>
                  {requestedRunners[selectedMember.userId || selectedMember.id] ? (
                    <View style={styles.requestSentBadge}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.limePrimary} />
                      <Text style={styles.requestSentText}>REQUEST SENT</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.requestButton}
                      onPress={() => handleSendRequest(selectedMember)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="paper-plane" size={16} color="#000000" />
                      <Text style={styles.requestButtonText}>REQUEST</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* 2. VIEW ALL & DISCOVER RUNNERS MODAL */}
      <Modal
        visible={showViewAllModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowViewAllModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.viewAllModalCard}>
            {/* Modal Header */}
            <View style={styles.viewAllHeader}>
              <View>
                <Text style={styles.viewAllTitle}>DISCOVER RUNNERS</Text>
                <Text style={styles.viewAllSubtitle}>Live Firestore Runners & Crew Members</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowViewAllModal(false)}
              >
                <Feather name="x" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* My User ID Info Card */}
            {currentUserId ? (
              <TouchableOpacity
                style={styles.myIdCard}
                onPress={() =>
                  Alert.alert(
                    'Your Runner ID',
                    `Your User ID is:\n\n${currentUserId}\n\nGive this ID to other runners to let them add you directly to their crew.`
                  )
                }
                activeOpacity={0.8}
              >
                <View style={styles.myIdLeft}>
                  <View style={styles.myIdIconBadge}>
                    <Feather name="hash" size={12} color={colors.limePrimary} />
                  </View>
                  <View style={styles.myIdTextCol}>
                    <Text style={styles.myIdLabel}>YOUR RUNNER USER ID</Text>
                    <Text style={styles.myIdValue} numberOfLines={1} selectable>
                      {currentUserId}
                    </Text>
                  </View>
                </View>
                <View style={styles.myIdCopyBtn}>
                  <Feather name="share-2" size={12} color={colors.limePrimary} />
                  <Text style={styles.myIdCopyText}>INFO</Text>
                </View>
              </TouchableOpacity>
            ) : null}

            {/* Search Bar */}
            <View style={styles.searchWrapper}>
              <Feather name="search" size={16} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by User ID or Name..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
              {!!searchQuery && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Feather name="x-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Runners List */}
            <ScrollView style={styles.runnersList} showsVerticalScrollIndicator={false}>
              {filteredCrew.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Feather name="users" size={32} color={colors.textMuted} />
                  <Text style={styles.emptyText}>No runners found matching "{searchQuery}"</Text>
                </View>
              ) : (
                filteredCrew.map((runner) => {
                  const isRequested = requestedRunners[runner.userId || runner.id];

                  return (
                    <TouchableOpacity
                      key={runner.id}
                      style={styles.runnerRowCard}
                      onPress={() => {
                        setShowViewAllModal(false);
                        setSelectedMember(runner);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.runnerRowAvatar}>
                        <Text style={styles.runnerRowInitial}>
                          {runner.initial || runner.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>

                      <View style={styles.runnerRowInfo}>
                        <Text style={styles.runnerRowName}>{runner.name}</Text>
                        <Text style={styles.runnerRowId} numberOfLines={1}>
                          ID: {runner.userId || runner.id}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[styles.rowRequestBtn, isRequested && styles.rowRequestBtnSent]}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          handleSendRequest(runner);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.rowRequestText, isRequested && styles.rowRequestTextSent]}>
                          {isRequested ? 'SENT' : 'REQUEST'}
                        </Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Bottom Add Action */}
            <TouchableOpacity
              style={styles.modalAddBottomBtn}
              onPress={() => {
                setShowViewAllModal(false);
                setShowAddModal(true);
              }}
              activeOpacity={0.85}
            >
              <Feather name="user-plus" size={16} color="#000000" />
              <Text style={styles.modalAddBottomText}>INVITE RUNNER BY USER ID</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 3. INVITE / ADD MEMBER BY USER ID MODAL */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.addModalCard}>
            <View style={styles.viewAllHeader}>
              <View>
                <Text style={styles.viewAllTitle}>INVITE RUNNER</Text>
                <Text style={styles.viewAllSubtitle}>Add to your crew via Firebase User ID</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowAddModal(false)}
              >
                <Feather name="x" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>RUNNER USER ID</Text>
              <View style={styles.modalInputWrapper}>
                <Feather name="hash" size={16} color={colors.textSecondary} />
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Enter Firebase User ID"
                  placeholderTextColor={colors.textMuted}
                  value={inputRunnerId}
                  onChangeText={setInputRunnerId}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>RUNNER NAME (OPTIONAL)</Text>
              <View style={styles.modalInputWrapper}>
                <Feather name="user" size={16} color={colors.textSecondary} />
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="e.g. Alex Rivera"
                  placeholderTextColor={colors.textMuted}
                  value={inputRunnerName}
                  onChangeText={setInputRunnerName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <NeonButton
              title="ADD TO CREW"
              onPress={handleAddSubmit}
              style={{ marginTop: 14 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginTop: 26,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    color: colors.textPrimary,
    textTransform: 'uppercase',
  },
  countBadge: {
    backgroundColor: '#1E2B08',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#43610B',
  },
  countText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.limePrimary,
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
    color: colors.limePrimary,
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
    backgroundColor: '#1B1B1E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#303036',
    position: 'relative',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.limePrimary,
    borderWidth: 2,
    borderColor: '#000000',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  memberName: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 68,
  },
  userIdPill: {
    backgroundColor: '#161618',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#242428',
  },
  userIdText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  addItem: {
    alignItems: 'center',
    width: 68,
  },
  addButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#162308',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#547B0E',
  },
  addText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.limePrimary,
    marginTop: 6,
    letterSpacing: 0.5,
  },
  addSubtitle: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
  },
  emptyScrollCard: {
    backgroundColor: '#151517',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#242428',
    justifyContent: 'center',
    maxWidth: 240,
  },
  emptyScrollTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.limePrimary,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  emptyScrollSubtitle: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
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
    backgroundColor: '#141416',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#28282E',
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
    backgroundColor: '#202024',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalAvatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1E2A0A',
    borderWidth: 2,
    borderColor: colors.limePrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalAvatarInitial: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.limePrimary,
  },
  modalRunnerName: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  modalIdCard: {
    width: '100%',
    backgroundColor: '#0D0D0E',
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#222226',
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
    color: colors.limePrimary,
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
    color: colors.textSecondary,
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#1B1B1E',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#2A2A30',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.limePrimary,
    letterSpacing: 0.5,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#303036',
  },
  modalActionRow: {
    width: '100%',
    marginTop: 18,
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.limePrimary,
    paddingVertical: 15,
    borderRadius: 16,
    gap: 8,
    shadowColor: colors.limePrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  requestButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1,
  },
  requestSentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#162308',
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#547B0E',
    gap: 8,
  },
  requestSentText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.limePrimary,
    letterSpacing: 1,
  },

  // View All Modal
  viewAllModalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    backgroundColor: '#141416',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#28282E',
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
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  viewAllSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  myIdCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18240A',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4A6F0E',
  },
  myIdLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  myIdIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0D1405',
    justifyContent: 'center',
    alignItems: 'center',
  },
  myIdTextCol: {
    flex: 1,
  },
  myIdLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.limePrimary,
    letterSpacing: 0.8,
  },
  myIdValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'monospace',
    marginTop: 1,
  },
  myIdCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1405',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  myIdCopyText: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.limePrimary,
    letterSpacing: 0.5,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D0F',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#24242A',
    gap: 8,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  runnersList: {
    maxHeight: 320,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  runnerRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1E',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#26262E',
    gap: 12,
  },
  runnerRowAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#24242A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#383842',
  },
  runnerRowInitial: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.limePrimary,
  },
  runnerRowInfo: {
    flex: 1,
  },
  runnerRowName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  runnerRowId: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  rowRequestBtn: {
    backgroundColor: colors.limePrimary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  rowRequestBtnSent: {
    backgroundColor: '#162308',
    borderWidth: 1,
    borderColor: '#547B0E',
  },
  rowRequestText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  rowRequestTextSent: {
    color: colors.limePrimary,
  },
  modalAddBottomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.limePrimary,
    height: 48,
    borderRadius: 14,
    marginTop: 14,
    gap: 8,
  },
  modalAddBottomText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.8,
  },

  // Add Modal
  addModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#141416',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#28282E',
  },
  inputGroup: {
    gap: 6,
    marginTop: 10,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginLeft: 4,
  },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D0F',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#24242A',
    gap: 10,
  },
  modalTextInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
