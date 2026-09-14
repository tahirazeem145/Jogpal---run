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
import { CrewMember, UserProfile } from '../types/data';
import { useTheme } from '../context/ThemeContext';
import { NeonButton } from './NeonButton';

interface YourFriendsSectionProps {
  friends?: CrewMember[];
  discoverableRunners?: UserProfile[];
  currentUserId?: string;
  sentRequestIds?: string[];
  onStartDuoRun?: (friend: CrewMember) => void;
  onStartGroupRun?: (friend: CrewMember) => void;
  onSendRequest?: (toUserId: string) => Promise<{ success: boolean; message: string }> | Promise<void>;
  onInviteById?: (userId: string, name?: string) => Promise<void> | void;
}

export const YourFriendsSection: React.FC<YourFriendsSectionProps> = ({
  friends = [],
  discoverableRunners = [],
  currentUserId,
  sentRequestIds = [],
  onStartDuoRun,
  onStartGroupRun,
  onSendRequest,
  onInviteById,
}) => {
  const { colors } = useTheme();
  const [selectedFriend, setSelectedFriend] = useState<CrewMember | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputRunnerId, setInputRunnerId] = useState('');
  const [inputRunnerName, setInputRunnerName] = useState('');
  const [localSentMap, setLocalSentMap] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter accepted friends
  const visibleFriends = friends.filter(
    (f) => f.id !== currentUserId && f.userId !== currentUserId
  );

  const handleSelectFriend = (friend: CrewMember) => {
    setSelectedFriend(friend);
  };

  const handleDuoRun = (friend: CrewMember) => {
    setSelectedFriend(null);
    if (onStartDuoRun) {
      onStartDuoRun(friend);
    }
  };

  const handleGroupRun = (friend: CrewMember) => {
    setSelectedFriend(null);
    if (onStartGroupRun) {
      onStartGroupRun(friend);
    }
  };

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
          Alert.alert('Notice', res.message || 'Could not send request.');
          setLocalSentMap((prev) => {
            const next = { ...prev };
            delete next[runnerId];
            return next;
          });
          return;
        }
      }
      Alert.alert(
        'Friend Request Sent 📨',
        `Crew invite sent to ${runnerName}! When accepted, they will appear in your friends section.`
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
        'Invite Dispatched 🚀',
        `Friend request dispatched to ${runnerName || runnerId}! Once accepted, they will appear in your friends list.`
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to send invite');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDiscoverable = discoverableRunners.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const name = r.displayName || '';
    const email = r.email || '';
    const id = r.id || '';
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q) || id.toLowerCase().includes(q);
  });

  return (
    <View style={styles.container}>
      {/* 1. FRIENDS HEADER */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithCount}>
          <Text style={[styles.titleText, { color: colors.textPrimary }]}>YOUR FRIENDS</Text>
          <View style={[styles.countBadge, { backgroundColor: colors.accentSubtle, borderColor: colors.crewAddBorder }]}>
            <Text style={[styles.countText, { color: colors.primary }]}>{visibleFriends.length}</Text>
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

      {/* 2. ACCEPTED FRIENDS HORIZONTAL LIST */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.friendsScrollContent}
      >
        {visibleFriends.length === 0 ? (
          <View style={[styles.emptyFriendsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.accentSubtle }]}>
              <Feather name="users" size={18} color={colors.primary} />
            </View>
            <View style={styles.emptyTextCol}>
              <Text style={[styles.emptyFriendsTitle, { color: colors.primary }]}>NO FRIENDS ACCEPTED YET</Text>
              <Text style={[styles.emptyFriendsSubtitle, { color: colors.textSecondary }]}>
                Send requests to runners below. Once accepted, their profiles will appear here to start Duo & Group runs!
              </Text>
            </View>
          </View>
        ) : (
          visibleFriends.map((friend) => {
            return (
              <TouchableOpacity
                key={friend.id}
                style={styles.friendAvatarItem}
                onPress={() => handleSelectFriend(friend)}
                activeOpacity={0.8}
              >
                <View style={[styles.avatarCircle, { backgroundColor: colors.avatarBg, borderColor: colors.avatarBorder }]}>
                  {friend.photoURL || friend.avatarUrl ? (
                    <Image
                      source={{ uri: friend.photoURL || friend.avatarUrl }}
                      style={styles.avatarImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={[styles.avatarInitial, { color: colors.textPrimary }]}>
                      {friend.initial || friend.name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                  {/* Online indicator */}
                  <View style={[styles.onlineDot, { backgroundColor: colors.primary }]} />
                </View>

                <Text style={[styles.memberName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {friend.name}
                </Text>
                
                <View style={[styles.runPill, { backgroundColor: colors.accentSubtle, borderColor: colors.primaryMuted }]}>
                  <Ionicons name="flash" size={9} color={colors.primary} />
                  <Text style={[styles.runPillText, { color: colors.primary }]}>START RUN</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* 3. DISCOVER & ADD MORE FRIENDS */}
      <View style={styles.discoverHeaderRow}>
        <Text style={[styles.discoverTitleText, { color: colors.textSecondary }]}>DISCOVER RUNNERS TO ADD</Text>
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

      {/* Discoverable Runners List */}
      {filteredDiscoverable.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.discoverScrollContent}
        >
          {filteredDiscoverable.map((runner) => {
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

                <Text style={[styles.cardRunnerName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={[styles.cardRunnerId, { color: colors.textSecondary }]} numberOfLines={1}>
                  {shortId}
                </Text>

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
                      <Text style={[styles.requestButtonTextSent, { color: colors.primary }]}>SENT</Text>
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

      {/* 4. INTERACTIVE FRIEND PROFILE MODAL (START DUO / GROUP RUN) */}
      <Modal
        visible={!!selectedFriend}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedFriend(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.profileModalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: colors.cardSubtle }]}
              onPress={() => setSelectedFriend(null)}
            >
              <Feather name="x" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {selectedFriend && (
              <>
                <View style={[styles.modalAvatarCircle, { backgroundColor: colors.crewAddBg, borderColor: colors.primary }]}>
                  {selectedFriend.photoURL || selectedFriend.avatarUrl ? (
                    <Image
                      source={{ uri: selectedFriend.photoURL || selectedFriend.avatarUrl }}
                      style={styles.modalAvatarImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={[styles.modalAvatarInitial, { color: colors.primary }]}>
                      {selectedFriend.initial || selectedFriend.name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>

                <View style={styles.nameBadgeRow}>
                  <Text style={[styles.modalRunnerName, { color: colors.textPrimary }]}>{selectedFriend.name}</Text>
                  <View style={[styles.friendBadge, { backgroundColor: colors.accentSubtle, borderColor: colors.primaryMuted }]}>
                    <Ionicons name="person-circle" size={12} color={colors.primary} />
                    <Text style={[styles.friendBadgeText, { color: colors.primary }]}>FRIEND</Text>
                  </View>
                </View>
                
                {/* User ID Card */}
                <View style={[styles.modalIdCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                  <View style={styles.idLabelRow}>
                    <Feather name="hash" size={12} color={colors.primary} />
                    <Text style={[styles.idLabelText, { color: colors.primary }]}>RUNNER USER ID</Text>
                  </View>
                  <Text style={styles.fullIdText} selectable>
                    {selectedFriend.userId || selectedFriend.id}
                  </Text>
                  {selectedFriend.email ? (
                    <Text style={[styles.idEmailText, { color: colors.textSecondary }]}>{selectedFriend.email}</Text>
                  ) : null}
                </View>

                {/* Metrics Grid */}
                <View style={[styles.metricsGrid, { backgroundColor: colors.cardSubtle, borderColor: colors.cardBorder }]}>
                  <View style={styles.metricItem}>
                    <Text style={[styles.metricValue, { color: colors.primary }]}>LVL {selectedFriend.level || 1}</Text>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>RUNNER LEVEL</Text>
                  </View>

                  <View style={[styles.metricDivider, { backgroundColor: colors.cardBorder }]} />

                  <View style={styles.metricItem}>
                    <Text style={[styles.metricValue, { color: colors.primary }]}>
                      {selectedFriend.totalDistanceKm ? `${selectedFriend.totalDistanceKm.toFixed(1)}K` : '0.0K'}
                    </Text>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>TOTAL DISTANCE</Text>
                  </View>

                  <View style={[styles.metricDivider, { backgroundColor: colors.cardBorder }]} />

                  <View style={styles.metricItem}>
                    <Text style={[styles.metricValue, { color: colors.primary }]}>{selectedFriend.streakDays || 0}D</Text>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>RUN STREAK</Text>
                  </View>
                </View>

                {/* PROMINENT RUN LAUNCHER ACTIONS: DUO RUN & GROUP RUN */}
                <View style={styles.runActionSection}>
                  <Text style={[styles.runActionPrompt, { color: colors.textSecondary }]}>
                    START A RUN WITH {selectedFriend.name.toUpperCase()}:
                  </Text>

                  {/* 1. START DUO RUN BUTTON */}
                  <TouchableOpacity
                    style={[styles.duoRunBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
                    onPress={() => handleDuoRun(selectedFriend)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="flash" size={18} color="#000000" />
                    <Text style={styles.duoRunBtnText}>START DUO RUN</Text>
                  </TouchableOpacity>

                  {/* 2. START GROUP RUN BUTTON */}
                  <TouchableOpacity
                    style={[styles.groupRunBtn, { backgroundColor: colors.surface, borderColor: colors.primary }]}
                    onPress={() => handleGroupRun(selectedFriend)}
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

      {/* 5. INVITE BY USER ID MODAL */}
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
    marginTop: 20,
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
  friendsScrollContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingRight: 10,
    marginBottom: 16,
  },
  friendAvatarItem: {
    alignItems: 'center',
    width: 72,
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
    maxWidth: 72,
  },
  runPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
    borderWidth: 1,
    gap: 3,
  },
  runPillText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  emptyFriendsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    gap: 10,
    width: '100%',
  },
  emptyIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTextCol: {
    flex: 1,
  },
  emptyFriendsTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  emptyFriendsSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 14,
  },

  discoverHeaderRow: {
    marginBottom: 8,
  },
  discoverTitleText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  discoverScrollContent: {
    gap: 12,
    paddingRight: 10,
  },
  runnerCard: {
    width: 140,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cardAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 6,
  },
  cardAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  cardAvatarInitial: {
    fontSize: 18,
    fontWeight: '900',
  },
  levelTag: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  levelTagText: {
    fontSize: 7,
    fontWeight: '900',
  },
  cardRunnerName: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    width: '100%',
  },
  cardRunnerId: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'monospace',
    marginTop: 2,
    marginBottom: 6,
  },
  requestButton: {
    width: '100%',
    paddingVertical: 7,
    borderRadius: 8,
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
  friendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    gap: 3,
  },
  friendBadgeText: {
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
