import React from 'react';
import { StyleSheet, View, ScrollView, StatusBar, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { WeeklyMomentumCard } from '../components/WeeklyMomentumCard';
import { YourCrewSection } from '../components/YourCrewSection';
import { YourFriendsSection } from '../components/YourFriendsSection';
import { UpcomingSessionCard } from '../components/UpcomingSessionCard';
import { PersonalBestsSection } from '../components/PersonalBestsSection';
import { FloatingSparkleButton } from '../components/FloatingSparkleButton';
import { useApp } from '../context/AppContext';
import { useSoloRun } from '../context/SoloRunContext';
import { SoloRunModal } from '../components/SoloRunModal';
import { NotificationsModal } from '../components/NotificationsModal';
import { useTheme } from '../context/ThemeContext';
import { CrewMember } from '../types/data';

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
    upcomingSession,
    personalBests,
    incomingRequests,
    unreadRequestCount,
    logNewRun,
    addCrewMember,
    scheduleSession,
    sendCrewRequest,
    acceptCrewRequest,
    rejectCrewRequest,
  } = useApp();
  const { colors } = useTheme();

  const [soloRunModalVisible, setSoloRunModalVisible] = React.useState(false);
  const [notificationsVisible, setNotificationsVisible] = React.useState(false);
  const { startPreparation } = useSoloRun();

  const handleStartSoloRun = async () => {
    setSoloRunModalVisible(true);
    await startPreparation('SOLO RUN', 'SOLO');
  };

  const handleStartDuoRunWithFriend = async (friend: CrewMember) => {
    Alert.alert(
      '⚡ Start Duo Run',
      `Synchronizing live telemetry and route with ${friend.name}...\n\nStarting Duo Run now!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: "Let's Go!",
          onPress: async () => {
            setSoloRunModalVisible(true);
            await startPreparation(`DUO RUN • ${friend.name.toUpperCase()}`, 'CREW');
          },
        },
      ]
    );
  };

  const handleStartGroupRunWithFriend = async (friend?: CrewMember) => {
    Alert.alert(
      '👥 Group Run Lobby',
      `Choose an option for your squad run${friend ? ` with ${friend.name}` : ''}:`,
      [
        {
          text: 'Start Live Squad Run',
          onPress: async () => {
            setSoloRunModalVisible(true);
            await startPreparation(friend ? `GROUP RUN • ${friend.name.toUpperCase()} & CREW` : 'GROUP SQUAD RUN', 'CREW');
          },
        },
        {
          text: 'Schedule Group Event',
          onPress: handleSchedulePress,
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleGeneralDuoRun = () => {
    const activeRunners = friends.length > 0 ? friends : crew;
    if (activeRunners.length > 0) {
      const buddyButtons = activeRunners.slice(0, 3).map((member) => ({
        text: `Run with ${member.name}`,
        onPress: () => handleStartDuoRunWithFriend(member),
      }));

      Alert.alert(
        'Duo Run Partner',
        'Choose a partner to start a synced duo run session:',
        [
          ...buddyButtons,
          {
            text: 'Solo Duo Run',
            onPress: async () => {
              setSoloRunModalVisible(true);
              await startPreparation('DUO RUN (SOLO MODE)', 'CREW');
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      Alert.alert(
        'Duo Run',
        'Add friends in the section below to run together in real-time, or start a partner session now!',
        [
          {
            text: 'Start Partner Run',
            onPress: async () => {
              setSoloRunModalVisible(true);
              await startPreparation('PARTNER RUN', 'CREW');
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
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

  const handleSchedulePress = () => {
    Alert.alert('Schedule Session', 'Schedule a new group run session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Schedule Morning Loop',
        onPress: async () => {
          await scheduleSession('morning city loop', 'Tomorrow @ 07:00', '10.00 KM');
        },
      },
    ]);
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

        {/* 1. YOUR CREW SECTION */}
        <YourCrewSection
          crew={crew}
          currentUserId={userProfile?.id || user?.uid}
        />

        {/* 2. YOUR FRIENDS SECTION (Accepted friends show here + discover & add friends below) */}
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

        {/* Upcoming Session Card */}
        <UpcomingSessionCard
          session={upcomingSession}
          onSchedulePress={handleSchedulePress}
          onPress={handleSchedulePress}
        />

        {/* Personal Bests Section */}
        <PersonalBestsSection records={personalBests} />
      </ScrollView>

      {/* Solo / Duo / Group Run Feature Modal */}
      <SoloRunModal
        visible={soloRunModalVisible}
        onClose={() => setSoloRunModalVisible(false)}
      />

      {/* Real-time Notifications & Crew Requests Modal */}
      <NotificationsModal
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
        requests={incomingRequests}
        onAccept={acceptCrewRequest}
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
