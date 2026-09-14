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
  const [notificationsVisible, setNotificationsVisible] = React.useState(false);
  const { startPreparation } = useSoloRun();

  const handleStartSoloRun = async () => {
    setSoloRunModalVisible(true);
    await startPreparation('SOLO RUN', 'SOLO');
  };

  const handleStartDuoRunWithFriend = async (friend?: CrewMember) => {
    setSoloRunModalVisible(true);
    await startPreparation(friend ? `DUO RUN • ${friend.name.toUpperCase()}` : 'DUO RUN', 'CREW');
  };

  const handleStartGroupRunWithFriend = async (friend?: CrewMember) => {
    setSoloRunModalVisible(true);
    await startPreparation(friend ? `GROUP RUN • ${friend.name.toUpperCase()} & CREW` : 'GROUP SQUAD RUN', 'CREW');
  };

  const handleGeneralDuoRun = async () => {
    setSoloRunModalVisible(true);
    await startPreparation('DUO RUN', 'CREW');
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
