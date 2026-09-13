import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CrewRequest } from '../types/data';
import { useTheme } from '../context/ThemeContext';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  requests: CrewRequest[];
  onAccept: (request: CrewRequest) => Promise<void>;
  onReject: (requestId: string) => Promise<void>;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  onClose,
  requests = [],
  onAccept,
  onReject,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const formatTimeAgo = (isoDateString: string): string => {
    try {
      const diffMs = Date.now() - new Date(isoDateString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'JUST NOW';
      if (diffMins < 60) return `${diffMins}M AGO`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}H AGO`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}D AGO`;
    } catch {
      return 'RECENT';
    }
  };

  const handleAcceptPress = async (request: CrewRequest) => {
    try {
      setProcessingId(request.id);
      await onAccept(request);
      Alert.alert(
        'Crew Request Accepted! 🎉',
        `You and ${request.fromUserName} are now connected as crew running partners.`
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to accept request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectPress = async (requestId: string, runnerName: string) => {
    Alert.alert(
      'Decline Request',
      `Are you sure you want to decline the crew request from ${runnerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingId(requestId);
              await onReject(requestId);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to decline request');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.cardBorder,
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              <View
                style={[
                  styles.bellIconContainer,
                  { backgroundColor: colors.accentSubtle, borderColor: colors.primaryMuted },
                ]}
              >
                <Ionicons name="notifications" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.titleText, { color: colors.textPrimary }]}>
                  NOTIFICATIONS
                </Text>
                <Text style={[styles.subtitleText, { color: colors.textSecondary }]}>
                  {requests.length === 1
                    ? '1 Pending Crew Request'
                    : `${requests.length} Pending Crew Requests`}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Feather name="x" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* List of Incoming Requests */}
          <ScrollView
            style={styles.listContainer}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {requests.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View
                  style={[
                    styles.emptyIconCircle,
                    { backgroundColor: colors.accentSubtle, borderColor: colors.primaryMuted },
                  ]}
                >
                  <Feather name="check-circle" size={36} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  ALL CAUGHT UP
                </Text>
                <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                  No pending crew run requests. When runners invite you by User ID or from the crew board, they will appear here in real-time.
                </Text>
              </View>
            ) : (
              requests.map((req) => {
                const isProcessing = processingId === req.id;
                const initial = (req.fromUserName.trim().charAt(0) || 'R').toUpperCase();
                const shortId =
                  req.fromUserId.length > 10
                    ? `#${req.fromUserId.slice(0, 8)}...`
                    : `#${req.fromUserId}`;

                return (
                  <View
                    key={req.id}
                    style={[
                      styles.requestCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.cardBorder,
                      },
                    ]}
                  >
                    {/* Top Row: Avatar + Info + Time */}
                    <View style={styles.cardTopRow}>
                      <View
                        style={[
                          styles.avatarCircle,
                          {
                            backgroundColor: colors.accentSubtle,
                            borderColor: colors.primary,
                          },
                        ]}
                      >
                        {req.fromUserAvatar ? (
                          <Image
                            source={{ uri: req.fromUserAvatar }}
                            style={styles.avatarImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                            {initial}
                          </Text>
                        )}
                      </View>

                      <View style={styles.userInfoCol}>
                        <View style={styles.nameRow}>
                          <Text
                            style={[styles.userName, { color: colors.textPrimary }]}
                            numberOfLines={1}
                          >
                            {req.fromUserName}
                          </Text>
                          <View
                            style={[
                              styles.levelBadge,
                              { backgroundColor: colors.accentSubtle, borderColor: colors.primaryMuted },
                            ]}
                          >
                            <Text style={[styles.levelBadgeText, { color: colors.primary }]}>
                              LVL {req.fromUserLevel || 1}
                            </Text>
                          </View>
                        </View>

                        <Text style={[styles.userIdText, { color: colors.textSecondary }]}>
                          {shortId} {req.fromUserEmail ? `• ${req.fromUserEmail}` : ''}
                        </Text>
                        <Text style={[styles.inviteTypeText, { color: colors.primary }]}>
                          Wants to add you as a Crew Running Partner 🏃‍♂️
                        </Text>
                      </View>

                      <Text style={[styles.timeAgoText, { color: colors.textMuted }]}>
                        {formatTimeAgo(req.createdAt)}
                      </Text>
                    </View>

                    {/* Action Buttons: Accept / Reject */}
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[
                          styles.rejectBtn,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.cardBorder,
                          },
                        ]}
                        onPress={() => handleRejectPress(req.id, req.fromUserName)}
                        disabled={isProcessing}
                        activeOpacity={0.7}
                      >
                        <Feather name="x" size={16} color={colors.textSecondary} />
                        <Text style={[styles.rejectBtnText, { color: colors.textSecondary }]}>
                          DECLINE
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.acceptBtn,
                          {
                            backgroundColor: colors.primary,
                            shadowColor: colors.primary,
                          },
                        ]}
                        onPress={() => handleAcceptPress(req)}
                        disabled={isProcessing}
                        activeOpacity={0.85}
                      >
                        {isProcessing ? (
                          <ActivityIndicator size="small" color="#000000" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-sharp" size={18} color="#000000" />
                            <Text style={styles.acceptBtnText}>ACCEPT</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    width: '100%',
    maxHeight: '85%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#222226',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  subtitleText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  listContainer: {
    maxHeight: 480,
  },
  listContent: {
    paddingBottom: 20,
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
  requestCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 23,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '900',
  },
  userInfoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  levelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  levelBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  userIdText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  inviteTypeText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  timeAgoText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#202024',
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  acceptBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    gap: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  acceptBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.8,
  },
});
