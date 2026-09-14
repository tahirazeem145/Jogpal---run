import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Community } from '../../types/community';
import { communityService } from '../../services/communityService';
import { CommunityThemeBanner } from './CommunityThemeBanner';
import { CommunityDetailModal } from './CommunityDetailModal';
import { CreateCommunityModal } from './CreateCommunityModal';
import { useTheme } from '../../context/ThemeContext';

interface CommunityHubModalProps {
  visible: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
}

export const CommunityHubModal: React.FC<CommunityHubModalProps> = ({
  visible,
  onClose,
  currentUserId,
  currentUserName,
  currentUserAvatar,
}) => {
  const { colors } = useTheme();

  const [communities, setCommunities] = useState<Community[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  // Subscribe to communities real-time
  useEffect(() => {
    if (!visible) return;
    const unsub = communityService.subscribeToCommunities((liveComms) => {
      setCommunities(liveComms);
    });
    return () => unsub();
  }, [visible]);

  const categories = [
    { label: 'ALL', value: 'ALL' },
    { label: 'NIGHT RUN', value: 'NIGHT_RUN' },
    { label: 'SPEED SPRINT', value: 'SPEED_SPRINT' },
    { label: 'CASUAL JOG', value: 'CASUAL_JOG' },
    { label: 'MARATHON', value: 'MARATHON' },
    { label: 'TRAIL RUN', value: 'TRAIL_RUN' },
    { label: 'FITNESS SOCIAL', value: 'FITNESS_SOCIAL' },
  ];

  const filteredCommunities = communities.filter((c) => {
    const matchesCat = selectedCategory === 'ALL' || c.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      c.name.toLowerCase().includes(query) ||
      c.location.toLowerCase().includes(query) ||
      c.tagline.toLowerCase().includes(query) ||
      c.hostName.toLowerCase().includes(query);
    return matchesCat && matchesSearch;
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.hubCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleWithIcon}>
              <View style={[styles.iconBox, { backgroundColor: colors.accentSubtle, borderColor: colors.primary }]}>
                <Ionicons name="people" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.hubTitle, { color: colors.textPrimary }]}>COMMUNITY BUILDING HUB</Text>
                <Text style={[styles.hubSubtitle, { color: colors.textSecondary }]}>
                  Discover, create & host communities with live weather events
                </Text>
              </View>
            </View>

            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.cardSubtle }]} onPress={onClose}>
              <Feather name="x" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* CREATE COMMUNITY PROMINENT BANNER */}
          <TouchableOpacity
            style={[styles.createBanner, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
            onPress={() => setCreateModalVisible(true)}
            activeOpacity={0.88}
          >
            <View style={styles.createBannerLeft}>
              <View style={styles.sparkleIconCircle}>
                <Ionicons name="sparkles" size={20} color="#000000" />
              </View>
              <View>
                <Text style={styles.createBannerTitle}>HOST A COMMUNITY & EVENT</Text>
                <Text style={styles.createBannerSub}>
                  Set mandatory rules, cover themes & live weather checks
                </Text>
              </View>
            </View>
            <View style={styles.plusPill}>
              <Feather name="plus" size={18} color="#000000" />
              <Text style={styles.plusPillText}>CREATE</Text>
            </View>
          </TouchableOpacity>

          {/* SEARCH BAR */}
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search by community name, location, host..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Feather name="x-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* CATEGORY FILTER HORIZONTAL SCROLL */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.value;
              return (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.catPill,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.cardBorder,
                    },
                  ]}
                  onPress={() => setSelectedCategory(cat.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.catPillText, { color: isSelected ? '#000000' : colors.textPrimary }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* COMMUNITIES LIST */}
          <ScrollView style={styles.commsList} showsVerticalScrollIndicator={false}>
            {filteredCommunities.length === 0 ? (
              <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                <Ionicons name="people-outline" size={32} color={colors.primary} />
                <Text style={[styles.emptyTextTitle, { color: colors.textPrimary }]}>NO COMMUNITIES FOUND</Text>
                <Text style={[styles.emptyTextSub, { color: colors.textSecondary }]}>
                  Be the first to host a community in this category!
                </Text>
              </View>
            ) : (
              filteredCommunities.map((comm) => {
                const isHost = comm.hostId === currentUserId;
                const isMember = comm.memberIds.includes(currentUserId);
                const isPending = comm.pendingRequestIds.includes(currentUserId);
                const hasEvents = comm.events && comm.events.length > 0;
                const firstEvent = hasEvents ? comm.events![0] : null;

                return (
                  <TouchableOpacity
                    key={comm.id}
                    style={[styles.commCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                    onPress={() => setSelectedCommunity(comm)}
                    activeOpacity={0.9}
                  >
                    {/* Theme Cover Banner */}
                    <CommunityThemeBanner
                      themeId={comm.coverTheme}
                      title={comm.name}
                      tagline={comm.tagline}
                      categoryName={comm.category}
                      location={comm.location}
                      membersCount={comm.membersCount}
                      imageUrl={comm.coverImageUrl}
                      height={125}
                    />

                    {/* Card Body */}
                    <View style={styles.cardBody}>
                      <View style={styles.hostRow}>
                        <View style={styles.hostLeft}>
                          <Ionicons name="person-circle-outline" size={16} color={colors.primary} />
                          <Text style={[styles.hostNameText, { color: colors.textSecondary }]}>
                            Host: <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>{comm.hostName}</Text>
                          </Text>
                        </View>

                        {/* Status Tag */}
                        {isHost ? (
                          <View style={[styles.tag, { backgroundColor: colors.accentSubtle, borderColor: colors.primary }]}>
                            <Text style={[styles.tagText, { color: colors.primary }]}>YOUR COMMUNITY</Text>
                          </View>
                        ) : isMember ? (
                          <View style={[styles.tag, { backgroundColor: colors.accentSubtle, borderColor: colors.primary }]}>
                            <Text style={[styles.tagText, { color: colors.primary }]}>JOINED</Text>
                          </View>
                        ) : isPending ? (
                          <View style={[styles.tag, { backgroundColor: 'rgba(255, 165, 0, 0.15)', borderColor: '#FFA500' }]}>
                            <Text style={[styles.tagText, { color: '#FFA500' }]}>REQUESTED</Text>
                          </View>
                        ) : (
                          <View style={[styles.tag, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                            <Text style={[styles.tagText, { color: colors.textSecondary }]}>
                              {comm.isPublic ? 'PUBLIC' : 'APPROVAL REQ.'}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Event & Weather Highlight */}
                      {firstEvent && (
                        <View style={[styles.eventHighlight, { backgroundColor: colors.card, borderColor: colors.primaryMuted }]}>
                          <View style={styles.evtHilightTitleRow}>
                            <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                            <Text style={[styles.evtTitle, { color: colors.textPrimary }]}>{firstEvent.title}</Text>
                          </View>
                          {firstEvent.weather && (
                            <Text style={[styles.evtWeather, { color: colors.primary }]}>
                              🌤 Weather Check: {firstEvent.weather.temp} • {firstEvent.weather.condition}
                            </Text>
                          )}
                        </View>
                      )}

                      {/* Footer Link */}
                      <View style={styles.cardFooter}>
                        <Text style={[styles.viewDetailsText, { color: colors.primary }]}>VIEW COMMUNITY & EVENTS</Text>
                        <Feather name="chevron-right" size={16} color={colors.primary} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>

      {/* Detail Modal */}
      <CommunityDetailModal
        visible={!!selectedCommunity}
        onClose={() => setSelectedCommunity(null)}
        community={selectedCommunity}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserAvatar={currentUserAvatar}
        onCommunityUpdated={(updated) => {
          setSelectedCommunity(updated);
          setCommunities((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        }}
      />

      {/* Create Community Modal */}
      <CreateCommunityModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserAvatar={currentUserAvatar}
        onCreated={(newComm) => {
          setCommunities((prev) => [newComm, ...prev]);
          setSelectedCommunity(newComm);
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
  hubCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '92%',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hubTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  hubSubtitle: {
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
  createBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    marginBottom: 12,
    elevation: 4,
  },
  createBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sparkleIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createBannerTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.8,
  },
  createBannerSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000000',
    opacity: 0.8,
    marginTop: 1,
  },
  plusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  plusPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  categoryScroll: {
    marginBottom: 12,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 6,
  },
  catPillText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  commsList: {
    maxHeight: 400,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  emptyTextTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  emptyTextSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  commCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
  },
  cardBody: {
    padding: 12,
    gap: 8,
  },
  hostRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hostLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hostNameText: {
    fontSize: 11,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  eventHighlight: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 3,
  },
  evtHilightTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  evtTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  evtWeather: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  viewDetailsText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
