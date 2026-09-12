import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Defs, Pattern, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

interface HoneycombPatternProps {
  edgeWidth?: number;
  opacity?: number;
}

export const HoneycombPattern: React.FC<HoneycombPatternProps> = ({
  edgeWidth = 70,
  opacity = 0.12,
}) => {
  const { colors } = useTheme();

  // Tile dimensions for dense high-tech hexagon lattice
  const tileWidth = 12;
  const tileHeight = 21;

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]} pointerEvents="none">
      {/* Left Edge Honeycomb Badge */}
      <View style={[styles.edgeBadge, { left: 0, width: edgeWidth }]}>
        <View style={[StyleSheet.absoluteFill, { opacity }]}>
          <Svg width="100%" height="100%">
            <Defs>
              <Pattern
                id="hexTileLeft"
                width={tileWidth}
                height={tileHeight}
                patternUnits="userSpaceOnUse"
              >
                {/* Hexagon 1 */}
                <Path
                  d="M 6,0 L 12,3.5 L 12,10.5 L 6,14 L 0,10.5 L 0,3.5 Z"
                  fill="none"
                  stroke="#000000"
                  strokeWidth="0.8"
                />
                {/* Hexagon 2 shifted */}
                <Path
                  d="M 12,10.5 L 18,14 L 18,21 L 12,24.5 L 6,21 L 6,14 Z"
                  fill="none"
                  stroke="#000000"
                  strokeWidth="0.8"
                />
              </Pattern>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#hexTileLeft)" />
          </Svg>
        </View>
        {/* Seamless theme-aware fade towards center with zero hardcoded colors */}
        <LinearGradient
          colors={['transparent', 'rgba(0, 0, 0, 0.0)', colors.primary]}
          locations={[0, 0.35, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Right Edge Honeycomb Badge */}
      <View style={[styles.edgeBadge, { right: 0, width: edgeWidth }]}>
        <View style={[StyleSheet.absoluteFill, { opacity }]}>
          <Svg width="100%" height="100%">
            <Defs>
              <Pattern
                id="hexTileRight"
                width={tileWidth}
                height={tileHeight}
                patternUnits="userSpaceOnUse"
              >
                {/* Hexagon 1 */}
                <Path
                  d="M 6,0 L 12,3.5 L 12,10.5 L 6,14 L 0,10.5 L 0,3.5 Z"
                  fill="none"
                  stroke="#000000"
                  strokeWidth="0.8"
                />
                {/* Hexagon 2 shifted */}
                <Path
                  d="M 12,10.5 L 18,14 L 18,21 L 12,24.5 L 6,21 L 6,14 Z"
                  fill="none"
                  stroke="#000000"
                  strokeWidth="0.8"
                />
              </Pattern>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#hexTileRight)" />
          </Svg>
        </View>
        {/* Seamless theme-aware fade towards center with zero hardcoded colors */}
        <LinearGradient
          colors={[colors.primary, 'rgba(0, 0, 0, 0.0)', 'transparent']}
          locations={[0, 0.65, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    zIndex: 0,
    elevation: 0,
  },
  edgeBadge: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    overflow: 'hidden',
    zIndex: 0,
    elevation: 0,
  },
});
