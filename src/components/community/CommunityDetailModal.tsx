import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Community } from '../../types/community';
import { communityService } from '../../services/communityService';
import { CommunityThemeBanner } from './CommunityThemeBanner';
import { HostEventModal } from './HostEventModal';
import { useTheme } from '../../context/ThemeContext';

interface CommunityDetailModalProps {
  visible: boolean;
  onClose: () => void;
  community: Community | null;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  onCommunityUpdated?: (updated: Community) => void;
}

export const CommunityDetailModal: React.FC<CommunityDetailModalProps> = ({
  visible,
  onClose,
  community,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onCommunityUpdated,
}) => {
  const { colors } = useTheme();

  const [hostModalVisible, setHostModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'EVENTS' | 'ABOUT' | 'MEMBERS' | 'REQUESTS'>('EVENTS');
  const [localCommunity, setLocalCommunity] = useState<Community | null>(community);

  React.useEffect(() => {
    setLocalCommunity(community);
  }, [community]);

  if (!localCommunity) return null;

  const isHost = localCommunity.hostId === currentUserId;
  const isMember = localCommunity.memberIds.includes(currentUserId);
  const isPending = localCommunity.pendingRequestIds.includes(currentUserId);

  const events = localCommunity.events || [];

  const handleJoinOrRequest = async () => {
    const res = await communityService.joinOrRequestCommunity(
      localCommunity,
      currentUserId,
      currentUserName,
      currentUserAvatar
    );

    Alert.alert(res.isJoined ? 'Welcome!' : 'Request Sent', res.message);

    if (res.isJoined) {
      const updated: Community = {
        ...localCommunity,
        memberIds: [...localCommunity.memberIds, currentUserId],
        membersCount: localCommunity.membersCount + 1,
      };
      setLocalCommunity(updated);
      if (onCommunityUpdated) onCommunityUpdated(updated);
    } else {
      const updated: Community = {
        ...localCommunity,
        pendingRequestIds: [...localCommunity.pendingRequestIds, currentUserId],
      };
      setLocalCommunity(updated);
      if (onCommunityUpdated) onCommunityUpdated(updated);
    }
  };

  const handleApproveUser = async (userId: string) => {
    await communityService.approveJoinRequest(localCommunity.id, userId);
    Alert.alert('Approved! ✅', 'Runner is now a member of this community.');
    const updated: Community = {
      ...localCommunity,
      memberIds: [...localCommunity.memberIds, userId],
      membersCount: localCommunity.membersCount + 1,
      pendingRequestIds: localCommunity.pendingRequestIds.filter((id) => id !== userId),
    };
    setLocalCommunity(updated);
    if (onCommunityUpdated) onCommunityUpdated(updated);
  };

  const handleRejectUser = async (userId: string) => {
    await communityService.rejectJoinRequest(localCommunity.id, userId);
    const updated: Community = {
      ...localCommunity,
      pendingRequestIds: localCommunity.pendingRequestIds.filter((id) => id !== userId),
    };
    setLocalCommunity(updated);
    if (onCommunityUpdated) onCommunityUpdated(updated);
  };

  const handleToggleEventParticipation = async (eventId: string) => {
    const updatedEvents = await communityService.toggleEventParticipation(
      localCommunity.id,
      eventId,
      currentUserId,
      events
    );

    const updatedCommunity: Community = {
      ...localCommunity,
      events: updatedEvents,
    };

    setLocalCommunity(updatedCommunity);
    if (onCommunityUpdated) onCommunityUpdated(updatedCommunity);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {/* Cover Theme Banner */}
          <View style={styles.bannerContainer}>
            <CommunityThemeBanner
              themeId={localCommunity.coverTheme}
              title={localCommunity.name}
              tagline={localCommunity.tagline}
              categoryName={localCommunity.category}
              location={localCommunity.location}
              membersCount={localCommunity.membersCount}
              imageUrl={localCommunity.coverImageUrl}
              height={170}
            />
            <TouchableOpacity style={styles.closeBtnOverlay} onPress={onClose}>
              <Feather name="x" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Action Bar / Status */}
          <View style={[styles.actionBar, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <View style={styles.hostInfoRow}>
              <View style={[styles.hostAvatar, { backgroundColor: colors.accentSubtle, borderColor: colors.primary }]}>
                {localCommunity.hostAvatar ? (
                  <Image source={{ uri: localCommunity.hostAvatar }} style={styles.avatarImg} />
                ) : (
                  <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                    {localCommunity.hostName.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <View>
                <Text style={[styles.hostLabel, { color: colors.textSecondary }]}>HOSTED BY</Text>
                <Text style={[styles.hostName, { color: colors.textPrimary }]}>{localCommunity.hostName}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            {isHost ? (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={() => setHostModalVisible(true)}
              >
                <Ionicons name="add-circle-outline" size={16} color="#000000" />
                <Text style={styles.primaryBtnText}>HOST EVENT</Text>
              </TouchableOpacity>
            ) : isMember ? (
              <View style={[styles.statusBadge, { backgroundColor: colors.accentSubtle, borderColor: colors.primary }]}>
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                <Text style={[styles.statusBadgeText, { color: colors.primary }]}>MEMBER</Text>
              </View>
            ) : isPending ? (
              <View style={[styles.statusBadge, { backgroundColor: 'rgba(255, 165, 0, 0.15)', borderColor: '#FFA500' }]}>
                <Ionicons name="time-outline" size={16} color="#FFA500" />
                <Text style={[styles.statusBadgeText, { color: '#FFA500' }]}>PENDING</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={handleJoinOrRequest}
              >
                <Ionicons name="people-outline" size={16} color="#000000" />
                <Text style={styles.primaryBtnText}>
                  {localCommunity.isPublic ? 'JOIN COMMUNITY' : 'REQUEST TO JOIN'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Navigation Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[
                styles.tabItem,
                { borderBottomColor: activeTab === 'EVENTS' ? colors.primary : 'transparent' },
              ]}
              onPress={() => setActiveTab('EVENTS')}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'EVENTS' ? colors.primary : colors.textSecondary },
                ]}
              >
                EVENTS ({events.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabItem,
                { borderBottomColor: activeTab === 'ABOUT' ? colors.primary : 'transparent' },
              ]}
              onPress={() => setActiveTab('ABOUT')}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'ABOUT' ? colors.primary : colors.textSecondary },
                ]}
              >
                ABOUT & RULES
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabItem,
                { borderBottomColor: activeTab === 'MEMBERS' ? colors.primary : 'transparent' },
              ]}
              onPress={() => setActiveTab('MEMBERS')}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'MEMBERS' ? colors.primary : colors.textSecondary },
                ]}
              >
                MEMBERS ({localCommunity.membersCount})
              </Text>
            </TouchableOpacity>

            {isHost && (
              <TouchableOpacity
                style={[
                  styles.tabItem,
                  { borderBottomColor: activeTab === 'REQUESTS' ? colors.primary : 'transparent' },
                ]}
                onPress={() => setActiveTab('REQUESTS')}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === 'REQUESTS' ? colors.primary : colors.textSecondary },
                  ]}
                >
                  REQUESTS ({localCommunity.pendingRequestIds.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Tab Content */}
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* TAB 1: HOSTED EVENTS & WEATHER CHECK */}
            {activeTab === 'EVENTS' && (
              <View style={styles.eventsSection}>
                {events.length === 0 ? (
                  <View style={[styles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                    <Feather name="calendar" size={24} color={colors.primary} />
                    <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>NO UPCOMING EVENTS</Text>
                    <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                      {isHost
                        ? 'Tap "HOST EVENT" above to create an event for your community!'
                        : 'The community host hasn\'t scheduled an event yet.'}
                    </Text>
                  </View>
                ) : (
                  events.map((evt) => {
                    const isParticipating = evt.participantIds.includes(currentUserId);
                    return (
                      <View
                        key={evt.id}
                        style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                      >
                        {/* Event Header */}
                        <View style={styles.eventHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.eventTitle, { color: colors.textPrimary }]}>{evt.title}</Text>
                            <View style={styles.eventSubRow}>
                              <Ionicons name="time-outline" size={13} color={colors.primary} />
                              <Text style={[styles.eventTimeText, { color: colors.primary }]}>{evt.date}</Text>
                              <Text style={[styles.dotSep, { color: colors.textMuted }]}>•</Text>
                              <Ionicons name="navigate-outline" size={13} color={colors.textSecondary} />
                              <Text style={[styles.eventLocText, { color: colors.textSecondary }]}>{evt.distanceKm}</Text>
                            </View>
                          </View>

                          <View style={[styles.pacePill, { backgroundColor: colors.accentSubtle, borderColor: colors.primaryMuted }]}>
                            <Text style={[styles.pacePillText, { color: colors.primary }]}>{evt.targetPace}</Text>
                          </View>
                        </View>

                        <Text style={[styles.eventLocation, { color: colors.textPrimary }]}>
                          📍 {evt.location}
                        </Text>
                        <Text style={[styles.eventDesc, { color: colors.textSecondary }]}>
                          {evt.description}
                        </Text>

                        {/* LIVE WEATHER CONDITION ASSESSMENT BADGE */}
                        {evt.weather && (
                          <View style={[styles.weatherBadge, { backgroundColor: colors.card, borderColor: colors.primaryMuted }]}>
                            <View style={styles.weatherBadgeHeader}>
                              <Ionicons name="cloudy-night-outline" size={16} color={colors.primary} />
                              <Text style={[styles.weatherBadgeTitle, { color: colors.primary }]}>
                                WEATHER CHECK: {evt.weather.temp} • {evt.weather.condition}
                              </Text>
                            </View>

                            <View style={styles.weatherMetricsRow}>
                              <Text style={[styles.weatherMetric, { color: colors.textSecondary }]}>
                                💧 Humidity: {evt.weather.humidity}
                              </Text>
                              <Text style={[styles.weatherMetric, { color: colors.textSecondary }]}>
                                💨 Wind: {evt.weather.windSpeed}
                              </Text>
                            </View>

                            {evt.weather.advice ? (
                              <Text style={[styles.weatherAdvice, { color: colors.textPrimary }]}>
                                💡 {evt.weather.advice}
                              </Text>
                            ) : null}
                          </View>
                        )}

                        {/* Event Footer / Participate Action */}
                        <View style={styles.eventFooter}>
                          <View style={styles.participantsInfo}>
                            <Feather name="users" size={14} color={colors.textSecondary} />
                            <Text style={[styles.participantsText, { color: colors.textSecondary }]}>
                              {evt.participantIds.length} Runners Participating
                            </Text>
                          </View>

                          <TouchableOpacity
                            style={[
                              styles.participateBtn,
                              {
                                backgroundColor: isParticipating ? colors.accentSubtle : colors.primary,
                                borderColor: colors.primary,
                              },
                            ]}
                            onPress={() => handleToggleEventParticipation(evt.id)}
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name={isParticipating ? 'checkmark-circle' : 'flash-outline'}
                              size={15}
                              color={isParticipating ? colors.primary : '#000000'}
                            />
                            <Text
                              style={[
                                styles.participateBtnText,
                                { color: isParticipating ? colors.primary : '#000000' },
                              ]}
                            >
                              {isParticipating ? 'PARTICIPATING' : 'JOIN EVENT'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* TAB 2: ABOUT & MANDATORY RULES */}
            {activeTab === 'ABOUT' && (
              <View style={styles.aboutSection}>
                {/* Description */}
                <View style={[styles.cardBlock, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.blockTitle, { color: colors.primary }]}>ABOUT COMMUNITY</Text>
                  <Text style={[styles.blockText, { color: colors.textPrimary }]}>{localCommunity.description}</Text>
                </View>

                {/* Mandatory Rules */}
                <View style={[styles.cardBlock, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                  <View style={styles.blockTitleRow}>
                    <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                    <Text style={[styles.blockTitle, { color: colors.primary }]}>MANDATORY RULES & GUIDELINES</Text>
                  </View>
                  {localCommunity.mandatoryRules.map((rule, idx) => (
                    <View key={idx} style={styles.listRow}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                      <Text style={[styles.listText, { color: colors.textPrimary }]}>{rule}</Text>
                    </View>
                  ))}
                </View>

                {/* What Members Will See & Get */}
                <View style={[styles.cardBlock, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                  <View style={styles.blockTitleRow}>
                    <Ionicons name="gift-outline" size={18} color={colors.primary} />
                    <Text style={[styles.blockTitle, { color: colors.primary }]}>WHAT MEMBERS WILL GET & SEE</Text>
                  </View>
                  {localCommunity.memberPerks.map((perk, idx) => (
                    <View key={idx} style={styles.listRow}>
                      <Feather name="star" size={13} color={colors.primary} />
                      <Text style={[styles.listText, { color: colors.textPrimary }]}>{perk}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* TAB 3: MEMBERS */}
            {activeTab === 'MEMBERS' && (
              <View style={styles.membersSection}>
                <View style={[styles.cardBlock, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.blockTitle, { color: colors.primary }]}>
                    COMMUNITY MEMBERS ({localCommunity.memberIds.length})
                  </Text>
                  <View style={styles.membersGrid}>
                    {localCommunity.memberIds.map((mId, idx) => {
                      const isHostMember = mId === localCommunity.hostId;
                      return (
                        <View
                          key={idx}
                          style={[styles.memberPill, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                        >
                          <Ionicons name="person-circle-outline" size={18} color={colors.primary} />
                          <Text style={[styles.memberPillText, { color: colors.textPrimary }]}>
                            {isHostMember ? `${localCommunity.hostName} (Host)` : `Runner #${mId.slice(0, 6)}`}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            {/* TAB 4: REQUESTS (Host Only) */}
            {activeTab === 'REQUESTS' && isHost && (
              <View style={styles.requestsSection}>
                {localCommunity.pendingRequestIds.length === 0 ? (
                  <View style={[styles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                    <Feather name="check-circle" size={24} color={colors.primary} />
                    <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>NO PENDING REQUESTS</Text>
                    <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                      All join requests for this community have been reviewed.
                    </Text>
                  </View>
                ) : (
                  localCommunity.pendingRequestIds.map((reqUserId) => (
                    <View
                      key={reqUserId}
                      style={[styles.requestRow, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                    >
                      <View style={styles.reqUserInfo}>
                        <Ionicons name="person-circle" size={28} color={colors.primary} />
                        <View>
                          <Text style={[styles.reqUserName, { color: colors.textPrimary }]}>
                            Runner ID: #{reqUserId.slice(0, 8)}
                          </Text>
                          <Text style={[styles.reqSub, { color: colors.textSecondary }]}>
                            Requested to join community
                          </Text>
                        </View>
                      </View>

                      <View style={styles.reqBtnRow}>
                        <TouchableOpacity
                          style={[styles.approveBtn, { backgroundColor: colors.primary }]}
                          onPress={() => handleApproveUser(reqUserId)}
                        >
                          <Text style={styles.approveBtnText}>APPROVE</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.rejectBtn, { borderColor: colors.cardBorder }]}
                          onPress={() => handleRejectUser(reqUserId)}
                        >
                          <Feather name="x" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Host Event Modal */}
      <HostEventModal
        visible={hostModalVisible}
        onClose={() => setHostModalVisible(false)}
        communityId={localCommunity.id}
        hostId={currentUserId}
        hostName={currentUserName}
        hostAvatar={currentUserAvatar}
        onEventCreated={(newEvt) => {
          const updated: Community = {
            ...localCommunity,
            events: [...events, newEvt],
          };
          setLocalCommunity(updated);
          if (onCommunityUpdated) onCommunityUpdated(updated);
        }}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '92%',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
  },
  bannerContainer: {
    position: 'relative',
  },
  closeBtnOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  hostInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hostAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '900',
  },
  hostLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  hostName: {
    fontSize: 13,
    fontWeight: '900',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  primaryBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    gap: 5,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabItem: {
    paddingVertical: 10,
    marginRight: 16,
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  scrollContent: {
    padding: 16,
    maxHeight: 380,
  },
  eventsSection: {
    gap: 12,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  emptySub: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  eventCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 8,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  eventSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  eventTimeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  eventLocText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dotSep: {
    fontSize: 10,
  },
  pacePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  pacePillText: {
    fontSize: 10,
    fontWeight: '900',
  },
  eventLocation: {
    fontSize: 11,
    fontWeight: '800',
  },
  eventDesc: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
  },
  weatherBadge: {
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    gap: 4,
    marginTop: 2,
  },
  weatherBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weatherBadgeTitle: {
    fontSize: 11,
    fontWeight: '900',
  },
  weatherMetricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  weatherMetric: {
    fontSize: 10,
    fontWeight: '700',
  },
  weatherAdvice: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  participantsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  participantsText: {
    fontSize: 11,
    fontWeight: '700',
  },
  participateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  participateBtnText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  aboutSection: {
    gap: 12,
  },
  cardBlock: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 8,
  },
  blockTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  blockTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  blockText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listText: {
    fontSize: 11,
    fontWeight: '600',
  },
  membersSection: {
    gap: 12,
  },
  membersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  memberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  memberPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  requestsSection: {
    gap: 10,
  },
  requestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  reqUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reqUserName: {
    fontSize: 12,
    fontWeight: '800',
  },
  reqSub: {
    fontSize: 10,
    fontWeight: '600',
  },
  reqBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  approveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  approveBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
  },
  rejectBtn: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
});
