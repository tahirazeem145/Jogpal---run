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
  Image,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { UserProfile } from '../types/data';
import { useTheme } from '../theme/colors';
import { NeonButton } from './NeonButton';

interface AddFriendsSectionProps {
  runners?: UserProfile[];
  currentUserId?: string;
  sentRequestIds?: string[];
  onSendRequest?: (toUserId: string) => Promise<{ success: boolean; message: string }> | Promise<void>;
  onInviteById?: (userId: string, name?: string) => Promise<void> | void;
}

export const AddFriendsSection: React.FC<AddFriendsSectionProps> = ({
  runners = [],
  currentUserId,
  sentRequestIds = [],
  onSendRequest,
  onInviteById,
}) => {
  const { colors } = useTheme();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputRunnerId, setInputRunnerId] = useState('');
  const [inputRunnerName, setInputRunnerName] = useState('');
  const [localSentMap, setLocalSentMap] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendRequest = async (runnerId: string, runnerName: string) => {
    if (sentRequestIds.includes(runnerId) || localSentMap[runnerId]) {
      Alert.alert('Request Already Sent', `You have already sent a friend request to ${runnerName}.`);
      return;
    }

    try {
      setLocalSentMap((prev) => ({ ...prev, [runnerId]: true }));
      if (onSendRequest) {
        const res: any = await onSendRequest(runnerId);
        if (res && res.success === false) {
          Alert.alert('Cannot Send Request', res.message || 'Could not send request.');
          setLocalSentMap((prev) => {
            const next = { ...prev };
            delete next[runnerId];
            return next;
          });
          return;
        }
      }
      Alert.alert(
        'Friend Request Dispatched 📨',
        `Crew invite sent to ${runnerName}! Once they accept, they will automatically appear in "YOUR CREW".`
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to send request');
      setLocalSentMap((prev) => {
        const next = { ...prev };
        delete next[runnerId];
        return next;
      });
    }
  };

  const handleInviteSubmit = async () => {
    const runnerId = inputRunnerId.trim();
    const runnerName = inputRunnerName.trim();

    if (!runnerId) {
      Alert.alert('Required', 'Please enter the runner’s User ID.');
      return;
    }

    if (runnerId === currentUserId) {
      Alert.alert('Invalid ID', 'You cannot send a friend request to your own User ID.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (onSendRequest) {
        const res: any = await onSendRequest(runnerId);
        if (res && res.success === false) {
          Alert.alert('Notice', res.message || 'Could not send request.');
          setIsSubmitting(false);
          return;
        }
      }
      if (onInviteById) {
        await onInviteById(runnerId, runnerName || undefined);
      }
      setLocalSentMap((prev) => ({ ...prev, [runnerId]: true }));
      setInputRunnerId('');
      setInputRunnerName('');
      setShowInviteModal(false);
      Alert.alert(
        'Invite Sent 🚀',
        `Friend request dispatched to ${runnerName || runnerId}! Once accepted, they will be added to your crew.`
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to send invite');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRunners = runners.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const name = r.displayName || '';
    const email = r.email || '';
    const id = r.id || '';
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q) || id.toLowerCase().includes(q);
  });

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithCount}>
          <Text style={[styles.titleText, { color: colors.textPrimary }]}>ADD YOUR FRIENDS</Text>
          <View style={[styles.countBadge, { backgroundColor: colors.accentSubtle, borderColor: colors.crewAddBorder }]}>
            <Text style={[styles.countText, { color: colors.primary }]}>{filteredRunners.length}</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setShowInviteModal(true)}
          activeOpacity={0.7}
          style={[styles.inviteIdBtn, { backgroundColor: colors.cardSubtle, borderColor: colors.cardBorder }]}
        >
          <Feather name="user-plus" size={13} color={colors.primary} />
          <Text style={[styles.inviteIdBtnText, { color: colors.primary }]}>INVITE BY ID</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={[styles.searchWrapper, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        <Feather name="search" size={15} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Search runners by name, user ID or email..."
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

      {/* Runners List / Empty State */}
      {filteredRunners.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.accentSubtle, borderColor: colors.primaryMuted }]}>
            <Feather name="user-check" size={24} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {searchQuery ? 'NO RUNNERS FOUND' : 'NO NEW RUNNERS'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {searchQuery
              ? `No runners matching "${searchQuery}"`
              : 'All available runners are already in your crew! Use "INVITE BY ID" to invite a friend.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScrollContent}
        >
          {filteredRunners.map((runner) => {
            const runnerId = runner.id;
            const isRequested = sentRequestIds.includes(runnerId) || localSentMap[runnerId];
            const displayName = runner.displayName || runner.email?.split('@')[0] || `Runner ${runnerId.slice(0, 5)}`;
            const shortId = runnerId.length > 8 ? `#${runnerId.slice(0, 6)}` : `#${runnerId}`;
            const initial = (displayName.trim().charAt(0) || 'R').toUpperCase();

            return (
              <View
                key={runnerId}
                style={[
                  styles.runnerCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                {/* Avatar */}
                <View style={[styles.cardAvatarCircle, { backgroundColor: colors.avatarBg, borderColor: colors.avatarBorder }]}>
                  {runner.photoURL ? (
                    <Image
                      source={{ uri: runner.photoURL }}
                      style={styles.cardAvatarImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={[styles.cardAvatarInitial, { color: colors.primary }]}>{initial}</Text>
                  )}
                  <View style={[styles.levelTag, { backgroundColor: colors.accentSubtle, borderColor: colors.primaryMuted }]}>
                    <Text style={[styles.levelTagText, { color: colors.primary }]}>L{runner.level || 1}</Text>
                  </View>
                </View>

                {/* Name & ID */}
                <Text style={[styles.cardRunnerName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={[styles.cardRunnerId, { color: colors.textSecondary }]} numberOfLines={1}>
                  {shortId}
                </Text>

                {/* Stats row */}
                <View style={[styles.cardStatsRow, { backgroundColor: colors.cardSubtle }]}>
                  <View style={styles.cardStatItem}>
                    <Text style={[styles.cardStatValue, { color: colors.primary }]}>
                      {runner.totalDistanceKm ? `${runner.totalDistanceKm.toFixed(1)}k` : '0k'}
                    </Text>
                    <Text style={[styles.cardStatLabel, { color: colors.textMuted }]}>DIST</Text>
                  </View>
                  <View style={[styles.cardStatDivider, { backgroundColor: colors.cardBorder }]} />
                  <View style={styles.cardStatItem}>
                    <Text style={[styles.cardStatValue, { color: colors.primary }]}>
                      {runner.streakDays || 0}d
                    </Text>
                    <Text style={[styles.cardStatLabel, { color: colors.textMuted }]}>STRK</Text>
                  </View>
                </View>

                {/* Request / Add Button */}
                <TouchableOpacity
                  style={[
                    styles.requestButton,
                    { backgroundColor: colors.primary },
                    isRequested && [styles.requestButtonSent, { backgroundColor: colors.crewAddBg, borderColor: colors.crewAddBorder }],
                  ]}
                  onPress={() => handleSendRequest(runnerId, displayName)}
                  disabled={isRequested}
                  activeOpacity={0.8}
                >
                  {isRequested ? (
                    <View style={styles.btnRow}>
                      <Ionicons name="checkmark-circle" size={13} color={colors.primary} />
                      <Text style={[styles.requestButtonTextSent, { color: colors.primary }]}>REQUEST SENT</Text>
                    </View>
                  ) : (
                    <View style={styles.btnRow}>
                      <Feather name="user-plus" size={13} color="#000000" />
                      <Text style={styles.requestButtonText}>ADD FRIEND</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* INVITE BY USER ID MODAL */}
      <Modal
        visible={showInviteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>INVITE FRIEND</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Send request by Firebase User ID</Text>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: colors.cardSubtle }]}
                onPress={() => setShowInviteModal(false)}
              >
                <Feather name="x" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>RUNNER USER ID (REQUIRED)</Text>
              <View style={[styles.modalInputWrapper, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                <Feather name="hash" size={16} color={colors.textSecondary} />
                <TextInput
                  style={[styles.modalTextInput, { color: colors.textPrimary }]}
                  placeholder="Paste Runner's Firebase User ID"
                  placeholderTextColor={colors.textMuted}
                  value={inputRunnerId}
                  onChangeText={setInputRunnerId}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>RUNNER NAME (OPTIONAL)</Text>
              <View style={[styles.modalInputWrapper, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                <Feather name="user" size={16} color={colors.textSecondary} />
                <TextInput
                  style={[styles.modalTextInput, { color: colors.textPrimary }]}
                  placeholder="e.g. Alex Rivera"
                  placeholderTextColor={colors.textMuted}
                  value={inputRunnerName}
                  onChangeText={setInputRunnerName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <NeonButton
              title={isSubmitting ? 'SENDING REQUEST...' : 'SEND FRIEND REQUEST'}
              onPress={handleInviteSubmit}
              disabled={isSubmitting}
              style={{ marginTop: 16 }}
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
    marginTop: 18,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  inviteIdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  inviteIdBtnText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    gap: 8,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCard: {
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  emptySubtitle: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 260,
  },
  horizontalScrollContent: {
    gap: 12,
    paddingRight: 10,
  },
  runnerCard: {
    width: 150,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  cardAvatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 8,
  },
  cardAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
  },
  cardAvatarInitial: {
    fontSize: 20,
    fontWeight: '900',
  },
  levelTag: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  levelTagText: {
    fontSize: 8,
    fontWeight: '900',
  },
  cardRunnerName: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    width: '100%',
  },
  cardRunnerId: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
    marginTop: 2,
    marginBottom: 8,
  },
  cardStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    borderRadius: 8,
    paddingVertical: 5,
    marginBottom: 10,
  },
  cardStatItem: {
    alignItems: 'center',
  },
  cardStatValue: {
    fontSize: 11,
    fontWeight: '900',
  },
  cardStatLabel: {
    fontSize: 8,
    fontWeight: '800',
  },
  cardStatDivider: {
    width: 1,
    height: 14,
  },
  requestButton: {
    width: '100%',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestButtonSent: {
    borderWidth: 1,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  requestButtonText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  requestButtonTextSent: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  modalSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputGroup: {
    gap: 6,
    marginTop: 10,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginLeft: 4,
  },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    gap: 10,
  },
  modalTextInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
});
