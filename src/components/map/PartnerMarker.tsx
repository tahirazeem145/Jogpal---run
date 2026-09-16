import React from 'react';
import { StyleSheet, View, Text, Image, Platform } from 'react-native';
import { PartnerRunner } from '../../types/map';

export interface PartnerMarkerProps {
  runner: PartnerRunner;
  accentColor?: string;
}

export const PartnerBadge: React.FC<{ runner: PartnerRunner; accentColor: string }> = ({
  runner,
  accentColor,
}) => {
  const initial = (runner.name || 'P').charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      {/* Avatar / Initial Ring */}
      <View style={[styles.avatarRing, { borderColor: accentColor }]}>
        {runner.avatarUrl ? (
          <Image source={{ uri: runner.avatarUrl }} style={styles.avatarImg} />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: accentColor }]}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}
      </View>

      {/* Floating Info Tag */}
      <View style={styles.tagContainer}>
        <Text style={styles.nameText} numberOfLines={1}>
          {runner.name}
        </Text>
        {runner.distanceMeters !== undefined && (
          <Text style={[styles.distanceText, { color: accentColor }]}>
            {runner.distanceMeters < 1000
              ? `${Math.round(runner.distanceMeters)}m`
              : `${(runner.distanceMeters / 1000).toFixed(1)}km`}
          </Text>
        )}
      </View>
    </View>
  );
};

export const PartnerMarker: React.FC<PartnerMarkerProps> = React.memo(({
  runner,
  accentColor = '#A8FF00',
}) => {
  return <PartnerBadge runner={runner} accentColor={accentColor} />;
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  avatarRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#1C1C1E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
  },
  tagContainer: {
    backgroundColor: 'rgba(14, 15, 20, 0.92)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A35',
  },
  nameText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  distanceText: {
    fontSize: 8,
    fontWeight: '800',
  },
});
