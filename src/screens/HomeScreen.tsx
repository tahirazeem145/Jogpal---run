import React from 'react';
import { StyleSheet, View, ScrollView, StatusBar, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { WeeklyMomentumCard } from '../components/WeeklyMomentumCard';
import { YourFriendsSection } from '../components/YourFriendsSection';
import { PersonalBestsSection } from '../components/PersonalBestsSection';
import { FloatingSparkleButton } from '../components/FloatingSparkleButton';
import { useApp } from '../context/AppContext';
import { useSoloRun } from '../context/SoloRunContext';
import { SoloRunModal } from '../components/SoloRunModal';
import { DuoRunnerSelectModal } from '../components/DuoRunnerSelectModal';
import { IncomingDuoInviteModal } from '../components/IncomingDuoInviteModal';
import { NotificationsModal } from '../components/NotificationsModal';
import { useTheme } from '../context/ThemeContext';
import { CrewMember, DuoRunSession, CrewRequest } from '../types/data';
import { duoRunService } from '../services/duoRunService';

export const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {
    user,
    userProfile,
    weeklyKm,
    crew,
    friends,
    otherRunners,
    sentRequestIds,
    personalBests,
    incomingRequests,
    unreadRequestCount,
    logNewRun,
    addCrewMember,
    sendCrewRequest,
    acceptCrewRequest,
    rejectCrewRequest,
  } = useApp();
  const { colors } = useTheme();

  const [soloRunModalVisible, setSoloRunModalVisible] = React.useState(false);
  const [duoSelectModalVisible, setDuoSelectModalVisible] = React.useState(false);
  const [notificationsVisible, setNotificationsVisible] = React.useState(false);
  const [incomingDuoInvite, setIncomingDuoInvite] = React.useState<DuoRunSession | null>(null);
  const { startPreparation } = useSoloRun();

  const activeUserId = userProfile?.id || user?.uid || '';

  // Real-time listener for incoming Duo Run invitations
  React.useEffect(() => {
    if (!activeUserId) return;

    const unsub = duoRunService.listenForIncomingDuoInvites(activeUserId, (session) => {
      setIncomingDuoInvite(session);
    });

    return () => unsub();
  }, [activeUserId]);

  const handleStartSoloRun = async () => {
    setSoloRunModalVisible(true);
    await startPreparation('SOLO RUN', 'SOLO');
  };

  const handleSelectDuoPartner = async (partner: CrewMember) => {
    if (!userProfile) {
      Alert.alert('Sign In Required', 'Please sign in to invite friends to a synchronized Duo Run.');
      return;
    }

    try {
      setSoloRunModalVisible(true);
      const { session } = await duoRunService.createDuoSession(userProfile, partner);
      await startPreparation(`DUO RUN • ${partner.name.toUpperCase()}`, 'CREW', null, partner, session.id);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not send Duo Run invitation');
    }
  };

  const handleAcceptDuoInvite = async (session: DuoRunSession) => {
    try {
      setIncomingDuoInvite(null);
      await duoRunService.acceptDuoSession(session.id);
      const hostPartner: CrewMember = {
        id: session.hostUserId,
        userId: session.hostUserId,
        name: session.hostName,
        initial: (session.hostName?.trim().charAt(0) || 'R').toUpperCase(),
        avatarUrl: session.hostAvatar,
        photoURL: session.hostAvatar,
        status: 'ACTIVE',
        isOnline: true,
      };
      setSoloRunModalVisible(true);
      await startPreparation(`DUO RUN • ${session.hostName.toUpperCase()}`, 'CREW', null, hostPartner, session.id);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to accept Duo Run');
    }
  };

  const handleDeclineDuoInvite = async (session: DuoRunSession) => {
    setIncomingDuoInvite(null);
    await duoRunService.declineDuoSession(session.id);
  };

  const handleAcceptRequestFromNotifications = async (req: CrewRequest) => {
    if (req.type === 'RUN_INVITE' && req.sessionId) {
      setNotificationsVisible(false);
      const hostPartner: CrewMember = {
        id: req.fromUserId,
        userId: req.fromUserId,
        name: req.fromUserName,
        initial: (req.fromUserName?.trim().charAt(0) || 'R').toUpperCase(),
        avatarUrl: req.fromUserAvatar,
        photoURL: req.fromUserAvatar,
        status: 'ACTIVE',
        isOnline: true,
      };
      await duoRunService.acceptDuoSession(req.sessionId);
      await acceptCrewRequest(req);
      setSoloRunModalVisible(true);
      await startPreparation(`DUO RUN • ${req.fromUserName.toUpperCase()}`, 'CREW', null, hostPartner, req.sessionId);
    } else {
      await acceptCrewRequest(req);
    }
  };

  const handleStartDuoRunWithFriend = async (friend?: CrewMember) => {
    if (friend) {
      await handleSelectDuoPartner(friend);
    } else {
      setDuoSelectModalVisible(true);
    }
  };

  const handleStartGroupRunWithFriend = async (friend?: CrewMember) => {
    setSoloRunModalVisible(true);
    await startPreparation(friend ? `GROUP RUN • ${friend.name.toUpperCase()} & CREW` : 'GROUP SQUAD RUN', 'CREW');
  };

  const handleGeneralDuoRun = () => {
    setDuoSelectModalVisible(true);
  };

  const handleNotificationPress = () => {
    setNotificationsVisible(true);
  };

  const handleProfilePress = () => {
    Alert.alert('Profile', `Logged in as ${userProfile?.displayName || 'Runner'}`);
  };

  const handleAddFriend = async (userId: string, name?: string) => {
    await addCrewMember(name || userId, undefined, userId);
  };

  return (
    <View style={[styles.rootContainer, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Live Notification Badge */}
        <Header
          userName={userProfile?.displayName || 'Runner'}
          avatarUrl={userProfile?.photoURL}
          unreadCount={unreadRequestCount}
          onNotificationPress={handleNotificationPress}
          onProfilePress={handleProfilePress}
        />

        {/* Weekly Momentum Hero Card */}
        <WeeklyMomentumCard
          distance={weeklyKm > 0 ? weeklyKm.toFixed(1) : '0.0'}
          onStartRunPress={handleStartSoloRun}
          onDuoRunPress={handleGeneralDuoRun}
          onGroupRunPress={() => handleStartGroupRunWithFriend()}
        />

        {/* YOUR FRIENDS SECTION (Accepted friends show here + discover & add friends below) */}
        <YourFriendsSection
          friends={friends}
          discoverableRunners={otherRunners}
          currentUserId={userProfile?.id || user?.uid}
          sentRequestIds={sentRequestIds}
          onStartDuoRun={handleStartDuoRunWithFriend}
          onStartGroupRun={handleStartGroupRunWithFriend}
          onSendRequest={sendCrewRequest}
          onInviteById={handleAddFriend}
        />

        {/* Personal Bests Section */}
        <PersonalBestsSection records={personalBests} />
      </ScrollView>

      {/* Solo / Duo / Group Run Feature Modal */}
      <SoloRunModal
        visible={soloRunModalVisible}
        onClose={() => setSoloRunModalVisible(false)}
      />

      {/* Duo Partner Picker Modal (Select from Friends List) */}
      <DuoRunnerSelectModal
        visible={duoSelectModalVisible}
        onClose={() => setDuoSelectModalVisible(false)}
        friends={friends}
        onSelectPartner={handleSelectDuoPartner}
      />

      {/* Real-time Incoming Duo Run Invitation Pop-up Modal */}
      <IncomingDuoInviteModal
        session={incomingDuoInvite}
        onAccept={handleAcceptDuoInvite}
        onDecline={handleDeclineDuoInvite}
      />

      {/* Real-time Notifications & Crew Requests Modal */}
      <NotificationsModal
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
        requests={incomingRequests}
        onAccept={handleAcceptRequestFromNotifications}
        onReject={rejectCrewRequest}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
});
