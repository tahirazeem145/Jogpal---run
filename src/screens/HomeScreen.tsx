import React from 'react';
import { StyleSheet, View, ScrollView, StatusBar, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { WeeklyMomentumCard } from '../components/WeeklyMomentumCard';
import { YourCrewSection } from '../components/YourCrewSection';
import { UpcomingSessionCard } from '../components/UpcomingSessionCard';
import { PersonalBestsSection } from '../components/PersonalBestsSection';
import { FloatingSparkleButton } from '../components/FloatingSparkleButton';
import { useApp } from '../context/AppContext';
import { useSoloRun } from '../context/SoloRunContext';
import { SoloRunModal } from '../components/SoloRunModal';
import { useTheme } from '../context/ThemeContext';

export const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user, userProfile, weeklyKm, crew, upcomingSession, personalBests, logNewRun, addCrewMember, scheduleSession } = useApp();
  const { colors } = useTheme();

  const [soloRunModalVisible, setSoloRunModalVisible] = React.useState(false);
  const { startPreparation } = useSoloRun();

  const handleStartSoloRun = async () => {
    setSoloRunModalVisible(true);
    await startPreparation();
  };

  const handleNotificationPress = () => {
    Alert.alert('Notifications', 'All running alerts and crew invites will appear here.');
  };

  const handleProfilePress = () => {
    Alert.alert('Profile', `Logged in as ${userProfile?.displayName || 'Runner'}`);
  };

  const handleAddCrew = async (name: string, email?: string, userId?: string) => {
    await addCrewMember(name, email, userId);
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

  const handleSparklePress = () => {
    Alert.alert('AI Running Coach', 'Jogpal AI is analyzing your pacing and recovery metrics from Firebase.');
  };

  return (
    <View style={[styles.rootContainer, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Header
          userName={userProfile?.displayName || 'Runner'}
          avatarUrl={userProfile?.photoURL}
          onNotificationPress={handleNotificationPress}
          onProfilePress={handleProfilePress}
        />

        {/* Weekly Momentum Hero Card */}
        <WeeklyMomentumCard
          distance={weeklyKm > 0 ? weeklyKm.toFixed(1) : '0.0'}
          onStartRunPress={handleStartSoloRun}
        />

        {/* Your Crew Section */}
        <YourCrewSection
          crew={crew}
          currentUserId={userProfile?.id || user?.uid}
          onAddCrewPress={handleAddCrew}
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

      {/* Floating Sparkle Action Button */}
      <FloatingSparkleButton onPress={handleSparklePress} />

      {/* Solo Run Feature Modal */}
      <SoloRunModal
        visible={soloRunModalVisible}
        onClose={() => setSoloRunModalVisible(false)}
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
