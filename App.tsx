import React from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AppProvider } from './src/context/AppContext';
import { colors } from './src/theme/colors';

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.tabBarBg,
    text: colors.textPrimary,
    border: colors.tabBarBorder,
    primary: colors.limePrimary,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <View style={styles.container}>
          <StatusBar style="light" />
          <NavigationContainer theme={CustomDarkTheme}>
            <RootNavigator />
          </NavigationContainer>
        </View>
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
