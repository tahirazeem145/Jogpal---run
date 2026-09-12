import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Defs, Pattern, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';

interface HoneycombPatternProps {
  edgeWidth?: number;
  opacity?: number;
}

export const HoneycombPattern: React.FC<HoneycombPatternProps> = ({
  edgeWidth = 70,
  opacity = 0.35,
}) => {
  // Tile dimensions for dense high-tech hexagon lattice
  const tileWidth = 12;
  const tileHeight = 21;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
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
                  strokeWidth="0.85"
                />
                {/* Hexagon 2 shifted */}
                <Path
                  d="M 12,10.5 L 18,14 L 18,21 L 12,24.5 L 6,21 L 6,14 Z"
                  fill="none"
                  stroke="#000000"
                  strokeWidth="0.85"
                />
              </Pattern>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#hexTileLeft)" />
          </Svg>
        </View>
        {/* Gradient Fade towards center */}
        <LinearGradient
          colors={['rgba(204, 255, 0, 0.05)', 'rgba(204, 255, 0, 0.5)', colors.limePrimary]}
          locations={[0, 0.5, 1]}
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
                  strokeWidth="0.85"
                />
                {/* Hexagon 2 shifted */}
                <Path
                  d="M 12,10.5 L 18,14 L 18,21 L 12,24.5 L 6,21 L 6,14 Z"
                  fill="none"
                  stroke="#000000"
                  strokeWidth="0.85"
                />
              </Pattern>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#hexTileRight)" />
          </Svg>
        </View>
        {/* Gradient Fade towards center */}
        <LinearGradient
          colors={[colors.limePrimary, 'rgba(204, 255, 0, 0.5)', 'rgba(204, 255, 0, 0.05)']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  edgeBadge: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    overflow: 'hidden',
  },
});
