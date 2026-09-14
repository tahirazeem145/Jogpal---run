import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Community } from '../../types/community';
import { communityService } from '../../services/communityService';
import { CommunityThemeBanner } from './CommunityThemeBanner';
import { CommunityHubModal } from './CommunityHubModal';
import { CommunityDetailModal } from './CommunityDetailModal';
import { CreateCommunityModal } from './CreateCommunityModal';
import { useTheme } from '../../context/ThemeContext';

interface CommunitySectionCardProps {
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  onOpenHub?: () => void;
}

export const CommunitySectionCard: React.FC<CommunitySectionCardProps> = ({
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onOpenHub,
}) => {
  const { colors } = useTheme();

  const [communities, setCommunities] = useState<Community[]>([]);
  const [hubVisible, setHubVisible] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);

  useEffect(() => {
    const unsub = communityService.subscribeToCommunities((comms) => {
      setCommunities(comms);
    });
    return () => unsub();
  }, []);

  const handleOpenHub = () => {
    if (onOpenHub) onOpenHub();
    setHubVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.titleWithBadge} onPress={handleOpenHub} activeOpacity={0.8}>
          <View style={[styles.iconBox, { backgroundColor: colors.accentSubtle, borderColor: colors.primary }]}>
            <Ionicons name="people" size={16} color={colors.primary} />
          </View>
          <Text style={[styles.titleText, { color: colors.textPrimary }]}>COMMUNITY & EVENTS</Text>
          <View style={[styles.countBadge, { backgroundColor: colors.accentSubtle, borderColor: colors.crewAddBorder }]}>
            <Text style={[styles.countText, { color: colors.primary }]}>{communities.length}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleOpenHub} activeOpacity={0.7} style={styles.viewAllBtn}>
          <Text style={[styles.viewAllText, { color: colors.primary }]}>VIEW HUB</Text>
          <Feather name="chevron-right" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Host New Community Bar */}
      <TouchableOpacity
        style={[styles.hostBanner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        onPress={() => setCreateVisible(true)}
        activeOpacity={0.85}
      >
        <View style={styles.bannerLeft}>
          <View style={[styles.sparkleCircle, { backgroundColor: colors.accentSubtle, borderColor: colors.primary }]}>
            <Ionicons name="sparkles" size={15} color={colors.primary} />
          </View>
          <View style={styles.bannerTextCol}>
            <Text style={[styles.bannerTitle, { color: colors.textPrimary }]}>CREATE A COMMUNITY</Text>
            <Text style={[styles.bannerSub, { color: colors.textSecondary }]} numberOfLines={1}>
              Cover themes, questions guide & live weather events
            </Text>
          </View>
        </View>

        <View style={[styles.hostBtn, { backgroundColor: colors.primary }]}>
          <Feather name="plus" size={13} color="#000000" />
          <Text style={styles.hostBtnText}>HOST</Text>
        </View>
      </TouchableOpacity>

      {/* Horizontal Cards Scroll */}
      {communities.length === 0 ? (
        <View style={styles.emptyWrap}>
          <TouchableOpacity
            style={[styles.emptySectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => setCreateVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="people-outline" size={24} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.emptySectionTitle, { color: colors.textPrimary }]}>NO COMMUNITIES CREATED YET</Text>
              <Text style={[styles.emptySectionSub, { color: colors.textSecondary }]}>
                Tap HOST above to create the very first community & host live events!
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {communities.map((comm) => {
            const isHost = comm.hostId === currentUserId;
            const isMember = comm.memberIds.includes(currentUserId);

            return (
              <TouchableOpacity
                key={comm.id}
                style={[styles.commCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={() => setSelectedCommunity(comm)}
                activeOpacity={0.88}
              >
                <CommunityThemeBanner
                  themeId={comm.coverTheme}
                  title={comm.name}
                  categoryName={comm.category}
                  location={comm.location}
                  membersCount={comm.membersCount}
                  imageUrl={comm.coverImageUrl}
                  height={115}
                />

                <View style={styles.cardFooter}>
                  <View style={styles.hostRow}>
                    <Text style={[styles.hostText, { color: colors.textSecondary }]} numberOfLines={1}>
                      By <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>{comm.hostName}</Text>
                    </Text>
                    {isHost ? (
                      <View style={[styles.badgePill, { backgroundColor: colors.accentSubtle, borderColor: colors.primary }]}>
                        <Text style={[styles.statusText, { color: colors.primary }]}>HOST</Text>
                      </View>
                    ) : isMember ? (
                      <View style={[styles.badgePill, { backgroundColor: colors.accentSubtle, borderColor: colors.primary }]}>
                        <Text style={[styles.statusText, { color: colors.primary }]}>MEMBER</Text>
                      </View>
                    ) : (
                      <View style={[styles.badgePill, { backgroundColor: colors.cardSubtle, borderColor: colors.cardBorder }]}>
                        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                          {comm.isPublic ? 'PUBLIC' : 'APPROVAL'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Modals */}
      <CommunityHubModal
        visible={hubVisible}
        onClose={() => setHubVisible(false)}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserAvatar={currentUserAvatar}
      />

      <CommunityDetailModal
        visible={!!selectedCommunity}
        onClose={() => setSelectedCommunity(null)}
        community={selectedCommunity}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserAvatar={currentUserAvatar}
      />

      <CreateCommunityModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserAvatar={currentUserAvatar}
        onCreated={(newComm) => {
          setSelectedCommunity(newComm);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  countText: {
    fontSize: 10,
    fontWeight: '900',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  hostBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  bannerTextCol: {
    flex: 1,
  },
  sparkleCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  bannerSub: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  hostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
  },
  hostBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  emptyWrap: {
    paddingHorizontal: 16,
  },
  emptySectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  emptySectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  emptySectionSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  commCard: {
    width: 250,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardFooter: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  hostRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hostText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  badgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
