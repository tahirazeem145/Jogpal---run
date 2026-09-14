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
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CrewMember } from '../types/data';
import { useTheme } from '../context/ThemeContext';

interface DuoRunnerSelectModalProps {
  visible: boolean;
  onClose: () => void;
  friends: CrewMember[];
  onSelectPartner: (friend: CrewMember) => void;
  onInviteFriendsPress?: () => void;
}

export const DuoRunnerSelectModal: React.FC<DuoRunnerSelectModalProps> = ({
  visible,
  onClose,
  friends = [],
  onSelectPartner,
  onInviteFriendsPress,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  if (!visible) return null;

  const filteredFriends = friends.filter((f) =>
    f.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.userId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (friend: CrewMember) => {
    onClose();
    onSelectPartner(friend);
  };

  const handleOpenInvite = () => {
    onClose();
    if (onInviteFriendsPress) {
      onInviteFriendsPress();
    }
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
          {/* Top Handle / Grabber */}
          <View style={styles.grabberContainer}>
            <View style={[styles.grabber, { backgroundColor: colors.cardBorder }]} />
          </View>

          {/* Header Bar */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.iconPill, { backgroundColor: colors.crewAddBg, borderColor: colors.primary }]}>
                <Ionicons name="people" size={18} color={colors.primary} />
              </View>
              <View style={styles.headerTextGroup}>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                  SELECT DUO PARTNER
                </Text>
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                  Choose a running buddy to pair and sync your live pace
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

          {/* Search Bar (if friends exist) */}
          {friends.length > 0 && (
            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <Ionicons name="search" size={16} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Search friends by name or ID..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Friends List or Empty States */}
          <ScrollView
            style={styles.friendsList}
            contentContainerStyle={styles.friendsListContent}
            showsVerticalScrollIndicator={false}
          >
            {friends.length === 0 ? (
              // Empty State: No friends in friends list yet
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconCircle, { borderColor: colors.primary, backgroundColor: colors.crewAddBg }]}>
                  <MaterialCommunityIcons name="account-multiple-plus-outline" size={40} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  NO RUNNING BUDDIES YET
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  You need to add friends to your crew before you can launch a synchronized Duo Run.
                </Text>

                <TouchableOpacity
                  style={[styles.inviteActionBtn, { backgroundColor: colors.primary }]}
                  onPress={handleOpenInvite}
                  activeOpacity={0.85}
                >
                  <Ionicons name="person-add" size={16} color="#000000" />
                  <Text style={styles.inviteActionBtnText}>FIND & ADD FRIENDS</Text>
                </TouchableOpacity>
              </View>
            ) : filteredFriends.length === 0 ? (
              // Empty State: Search yielded no matches
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={36} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary, marginTop: 12 }]}>
                  NO FRIENDS MATCHED
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {`No crew members found matching "${searchQuery}".`}
                </Text>
              </View>
            ) : (
              // Render Friends Cards
              filteredFriends.map((friend) => {
                const photo = friend.avatarUrl || friend.photoURL;
                const initial = String(friend.initial || (friend.name ? friend.name.charAt(0).toUpperCase() : 'R'));

                return (
                  <TouchableOpacity
                    key={friend.id || friend.userId}
                    style={[
                      styles.friendCard,
                      {
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        borderColor: colors.cardBorder,
                      },
                    ]}
                    onPress={() => handleSelect(friend)}
                    activeOpacity={0.8}
                  >
                    {/* Avatar with live online dot */}
                    <View style={styles.avatarWrapper}>
                      {photo ? (
                        <Image source={{ uri: photo }} style={styles.avatarImage} />
                      ) : (
                        <View style={[styles.avatarFallback, { backgroundColor: colors.crewAddBg, borderColor: colors.primary }]}>
                          <Text style={[styles.avatarInitial, { color: colors.primary }]}>{initial}</Text>
                        </View>
                      )}
                      <View style={[styles.onlineIndicator, { backgroundColor: colors.primary }]} />
                    </View>

                    {/* Friend Details */}
                    <View style={styles.friendDetails}>
                      <Text style={[styles.friendName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {friend.name || 'Runner Buddy'}
                      </Text>
                      <View style={styles.badgeRow}>
                        <View style={[styles.miniBadge, { borderColor: colors.cardBorder }]}>
                          <Text style={[styles.miniBadgeText, { color: colors.textSecondary }]}>
                            LVL {friend.level || 1}
                          </Text>
                        </View>
                        {friend.streakDays ? (
                          <View style={[styles.miniBadge, { borderColor: 'rgba(255,100,50,0.3)', backgroundColor: 'rgba(255,100,50,0.08)' }]}>
                            <Text style={[styles.miniBadgeText, { color: '#FF7A45' }]}>
                              🔥 {friend.streakDays}D
                            </Text>
                          </View>
                        ) : null}
                        <View style={[styles.miniBadge, { borderColor: 'rgba(0,255,150,0.3)', backgroundColor: 'rgba(0,255,150,0.08)' }]}>
                          <Text style={[styles.miniBadgeText, { color: colors.primary }]}>
                            SYNC READY
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Pair & Run Action Button */}
                    <View style={[styles.pairButton, { backgroundColor: colors.primary }]}>
                      <Ionicons name="flash" size={14} color="#000000" />
                      <Text style={styles.pairButtonText}>PAIR</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '85%',
    paddingTop: 12,
  },
  grabberContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  grabber: {
    width: 44,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '400',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  friendsList: {
    paddingHorizontal: 20,
  },
  friendsListContent: {
    paddingBottom: 20,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImage: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '800',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#121212',
  },
  friendDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  friendName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  miniBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  pairButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
    marginLeft: 8,
  },
  pairButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 260,
  },
  inviteActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  inviteActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.8,
  },
});
