import React from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AppProvider } from './src/context/AppContext';
import { ThemeProvider, useTheme } from './src/theme/colors';

const AppContent: React.FC = () => {
  const { colors, isOrange } = useTheme();

  const customTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: colors.background,
      card: colors.tabBarBg,
      text: colors.textPrimary,
      border: colors.tabBarBorder,
      primary: colors.primary,
    },
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <NavigationContainer theme={customTheme}>
        <RootNavigator />
      </NavigationContainer>
    </View>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
