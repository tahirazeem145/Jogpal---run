import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather, Ionicons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/HomeScreen';
import { TransformationScreen } from '../screens/TransformationScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { RootTabParamList } from '../types/navigation';
import { useTheme } from '../context/ThemeContext';

const Tab = createBottomTabNavigator<RootTabParamList>();

export const TabNavigator: React.FC = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: colors.tabBarBg,
            borderTopColor: colors.tabBarBorder,
          },
        ],
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      {/* Home Tab */}
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'HOME',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrapper}>
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={22}
                color={color}
              />
            </View>
          ),
        }}
      />

      {/* 30-Day Transformation Camera Tab (Replaces Rank) */}
      <Tab.Screen
        name="Transformation"
        component={TransformationScreen}
        options={{
          tabBarLabel: '30 DAYS',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrapper}>
              <Ionicons
                name={focused ? 'camera' : 'camera-outline'}
                size={22}
                color={color}
              />
            </View>
          ),
        }}
      />

      {/* History Tab */}
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'HISTORY',
          tabBarIcon: ({ color }) => (
            <View style={styles.iconWrapper}>
              <Ionicons name="time-outline" size={22} color={color} />
            </View>
          ),
        }}
      />

      {/* Profile Tab */}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'PROFILE',
          tabBarIcon: ({ color }) => (
            <View style={styles.iconWrapper}>
              <Feather name="user" size={22} color={color} />
            </View>
          ),
        }}
      />

      {/* Settings Tab */}
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'SETTINGS',
          tabBarIcon: ({ color }) => (
            <View style={styles.iconWrapper}>
              <Feather name="settings" size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    height: 68,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: 1,
    elevation: 0,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 26,
  },
});
