import React from 'react';
import { JogpalMap } from './map/JogpalMap';
import { JogpalMapProps } from '../types/map';

export const JogpalMapView: React.FC<JogpalMapProps> = (props) => {
  return <JogpalMap {...props} />;
};
