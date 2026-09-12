import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Line, Defs, LinearGradient, Stop } from 'react-native-svg';

export const MiniTelemetryChart: React.FC = () => {
  return (
    <View style={styles.container}>
      <Svg width="44" height="44" viewBox="0 0 44 44">
        <Defs>
          <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FF3B30" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#FF3B30" stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        <Line x1="4" y1="12" x2="40" y2="12" stroke="#2C2C2E" strokeWidth="1" strokeDasharray="2,2" />
        <Line x1="4" y1="22" x2="40" y2="22" stroke="#2C2C2E" strokeWidth="1" strokeDasharray="2,2" />
        <Line x1="4" y1="32" x2="40" y2="32" stroke="#2C2C2E" strokeWidth="1" strokeDasharray="2,2" />

        {/* Shaded area */}
        <Path
          d="M 6,36 L 14,30 L 22,26 L 30,16 L 38,10 L 38,38 L 6,38 Z"
          fill="url(#chartGradient)"
        />

        {/* Red line */}
        <Path
          d="M 6,36 L 14,30 L 22,26 L 30,16 L 38,10"
          fill="none"
          stroke="#FF3B30"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1E1E20',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2C',
  },
});
