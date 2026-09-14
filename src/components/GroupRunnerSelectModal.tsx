import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CrewMember } from '../types/data';
import { useTheme } from '../context/ThemeContext';

interface GroupRunnerSelectModalProps {
  visible: boolean;
  onClose: () => void;
  friends: CrewMember[];
  onStartGroupRun: (selectedFriends: CrewMember[]) => void;
  onInviteFriendsPress?: () => void;
  initialSelectedFriend?: CrewMember | null;
}

export const GroupRunnerSelectModal: React.FC<GroupRunnerSelectModalProps> = ({
  visible,
  onClose,
  friends = [],
  onStartGroupRun,
  onInviteFriendsPress,
  initialSelectedFriend,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (visible && initialSelectedFriend) {
      const fid = initialSelectedFriend.id || initialSelectedFriend.userId || '';
      if (fid) {
        setSelectedFriendIds({ [fid]: true });
      }
    } else if (visible) {
      setSelectedFriendIds({});
    }
  }, [visible, initialSelectedFriend]);

  if (!visible) return null;

  const filteredFriends = friends.filter((f) =>
    f.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.userId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedList = friends.filter((f) => selectedFriendIds[f.id || f.userId || '']);
  const selectedCount = selectedList.length;

  const toggleSelectFriend = (friend: CrewMember) => {
    const friendId = friend.id || friend.userId || '';
    setSelectedFriendIds((prev) => ({
      ...prev,
      [friendId]: !prev[friendId],
    }));
  };

  const handleSelectAll = () => {
    if (selectedCount === filteredFriends.length) {
      setSelectedFriendIds({});
    } else {
      const all: Record<string, boolean> = {};
      filteredFriends.forEach((f) => {
        all[f.id || f.userId || ''] = true;
      });
      setSelectedFriendIds(all);
    }
  };

  const handleLaunchGroupRun = () => {
    if (selectedCount < 2) {
      Alert.alert(
        'Squad Run Requires 2+ Friends',
        'Please select at least 2 friends from your list to start a synchronized Group Squad Run.',
        [{ text: 'OK' }]
      );
      return;
    }

    onClose();
    onStartGroupRun(selectedList);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
        >
          {/* Grabber */}
          <View style={styles.grabberContainer}>
            <View style={[styles.grabber, { backgroundColor: colors.cardBorder }]} />
          </View>

          {/* Header Bar */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.iconPill, { backgroundColor: colors.crewAddBg, borderColor: colors.primary }]}>
                <Ionicons name="globe" size={18} color={colors.primary} />
              </View>
              <View style={styles.headerTextGroup}>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                  SELECT SQUAD RUNNERS
                </Text>
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                  Choose 2 or more friends to start a synchronized group run
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: 'rgba(255,255,255,0.06)' }]}
              activeOpacity={0.7}
            >
              <Feather name="x" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Selection Counter & Quick Select All */}
          <View style={[styles.selectionBar, { backgroundColor: colors.cardSubtle, borderColor: colors.cardBorder }]}>
            <View style={styles.selectionCountRow}>
              <View style={[styles.countCircle, { backgroundColor: selectedCount >= 2 ? colors.primary : colors.accentSubtle }]}>
                <Text style={[styles.countNumber, { color: selectedCount >= 2 ? '#000000' : colors.primary }]}>
                  {selectedCount}
                </Text>
              </View>
              <Text style={[styles.selectionText, { color: colors.textPrimary }]}>
                {selectedCount >= 2
                  ? `${selectedCount} Friends Selected (Squad Ready! ⚡)`
                  : selectedCount === 1
                  ? '1 Selected (Select 1 more friend for Squad)'
                  : 'Select at least 2 friends'}
              </Text>
            </View>

            {filteredFriends.length > 0 && (
              <TouchableOpacity onPress={handleSelectAll} activeOpacity={0.7}>
                <Text style={[styles.selectAllText, { color: colors.primary }]}>
                  {selectedCount === filteredFriends.length ? 'DESELECT' : 'SELECT ALL'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search Input */}
          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: colors.surface,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <Feather name="search" size={16} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search friends by name or ID..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Feather name="x-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Friends List */}
          <ScrollView
            style={styles.friendsList}
            contentContainerStyle={styles.friendsListContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredFriends.length === 0 ? (
              <View style={[styles.emptyContainer, { borderColor: colors.cardBorder }]}>
                <MaterialCommunityIcons name="account-multiple-remove-outline" size={44} color={colors.primary} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  {searchQuery ? 'NO FRIENDS FOUND' : 'NO FRIENDS ADDED YET'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {searchQuery
                    ? `No matching friends found for "${searchQuery}".`
                    : 'Add runners to your friends list to invite them to squad runs!'}
                </Text>

                {onInviteFriendsPress && !searchQuery && (
                  <TouchableOpacity
                    style={[styles.inviteEmptyBtn, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      onClose();
                      onInviteFriendsPress();
                    }}
                    activeOpacity={0.85}
                  >
                    <Feather name="user-plus" size={15} color="#000000" />
                    <Text style={styles.inviteEmptyBtnText}>ADD NEW RUNNERS</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              filteredFriends.map((friend) => {
                const friendId = friend.id || friend.userId || '';
                const isSelected = !!selectedFriendIds[friendId];
                const avatar = friend.photoURL || friend.avatarUrl;
                const initial = (friend.name?.trim().charAt(0) || friend.initial || 'R').toUpperCase();

                return (
                  <TouchableOpacity
                    key={friendId}
                    style={[
                      styles.friendCard,
                      {
                        backgroundColor: isSelected ? colors.accentSubtle : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.cardBorder,
                      },
                    ]}
                    onPress={() => toggleSelectFriend(friend)}
                    activeOpacity={0.8}
                  >
                    {/* Checkbox Icon */}
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: isSelected ? colors.primary : colors.cardBorder,
                          backgroundColor: isSelected ? colors.primary : 'transparent',
                        },
                      ]}
                    >
                      {isSelected && <Ionicons name="checkmark" size={14} color="#000000" />}
                    </View>

                    {/* Avatar with Online Badge */}
                    <View style={styles.avatarWrapper}>
                      {avatar ? (
                        <Image source={{ uri: avatar }} style={[styles.avatarImage, { borderColor: colors.primary }]} />
                      ) : (
                        <View style={[styles.avatarFallback, { backgroundColor: colors.avatarBg, borderColor: colors.primary }]}>
                          <Text style={[styles.avatarInitial, { color: colors.textPrimary }]}>{initial}</Text>
                        </View>
                      )}
                      <View style={[styles.onlineDot, { backgroundColor: colors.primary, borderColor: colors.card }]} />
                    </View>

                    {/* Friend Details */}
                    <View style={styles.friendInfo}>
                      <Text style={[styles.friendName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {friend.name}
                      </Text>
                      <View style={styles.friendBadges}>
                        <View style={[styles.levelTag, { backgroundColor: colors.cardSubtle, borderColor: colors.cardBorder }]}>
                          <Text style={[styles.levelTagText, { color: colors.primary }]}>L{friend.level || 1}</Text>
                        </View>
                        <Text style={[styles.rankText, { color: colors.textSecondary }]}>
                          {friend.rank || 'Runner'}
                        </Text>
                      </View>
                    </View>

                    {/* Selection Pill */}
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.cardSubtle,
                          borderColor: isSelected ? colors.primary : colors.cardBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: isSelected ? '#000000' : colors.textMuted },
                        ]}
                      >
                        {isSelected ? 'SELECTED' : 'ADD'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* Launch Squad Run Button */}
          <View style={styles.footerContainer}>
            <TouchableOpacity
              style={[
                styles.launchBtn,
                {
                  backgroundColor: selectedCount >= 2 ? colors.primary : colors.cardSubtle,
                  borderColor: selectedCount >= 2 ? colors.primary : colors.cardBorder,
                  opacity: selectedCount >= 2 ? 1 : 0.6,
                },
              ]}
              onPress={handleLaunchGroupRun}
              activeOpacity={0.85}
              disabled={selectedCount < 2}
            >
              <Ionicons name="flash" size={18} color={selectedCount >= 2 ? '#000000' : colors.textMuted} />
              <Text
                style={[
                  styles.launchBtnText,
                  { color: selectedCount >= 2 ? '#000000' : colors.textMuted },
                ]}
              >
                {selectedCount >= 2
                  ? `START GROUP RUN (${selectedCount} SELECTED)`
                  : 'SELECT AT LEAST 2 FRIENDS'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '85%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingTop: 8,
  },
  grabberContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  selectionCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  countCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countNumber: {
    fontSize: 11,
    fontWeight: '900',
  },
  selectionText: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  selectAllText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  friendsList: {
    maxHeight: 320,
  },
  friendsListContent: {
    paddingHorizontal: 20,
    gap: 10,
    paddingBottom: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  emptySubtitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  inviteEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    marginTop: 6,
  },
  inviteEmptyBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '900',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 14,
    fontWeight: '900',
  },
  friendBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  levelTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  levelTagText: {
    fontSize: 9,
    fontWeight: '900',
  },
  rankText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  footerContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  launchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    elevation: 4,
  },
  launchBtnText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
