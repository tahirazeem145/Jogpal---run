import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode, ThemeColors, themes, defaultTheme } from '../theme/colors';

interface ThemeContextType {
  theme: ThemeMode;
  colors: ThemeColors;
  isOrange: boolean;
  setTheme: (newTheme: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const STORAGE_KEY = '@jogpal_theme_mode';

const ThemeContext = createContext<ThemeContextType>({
  theme: 'default',
  colors: defaultTheme,
  isOrange: false,
  setTheme: async () => {},
  toggleTheme: async () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>('default');

  // Load saved theme on mount
  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'orange' || saved === 'default') {
          setThemeState(saved);
        }
      } catch (e) {
        console.warn('Failed to load theme preference', e);
      }
    };
    loadSavedTheme();
  }, []);

  const setTheme = async (newTheme: ThemeMode) => {
    try {
      setThemeState(newTheme);
      await AsyncStorage.setItem(STORAGE_KEY, newTheme);
    } catch (e) {
      console.warn('Failed to save theme preference', e);
    }
  };

  const toggleTheme = async () => {
    const next = theme === 'default' ? 'orange' : 'default';
    await setTheme(next);
  };

  const currentColors = themes[theme] || defaultTheme;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colors: currentColors,
        isOrange: theme === 'orange',
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'default',
      colors: defaultTheme,
      isOrange: false,
      setTheme: async () => {},
      toggleTheme: async () => {},
    };
  }
  return context;
};
