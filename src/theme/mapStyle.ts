/**
 * Jogpal High-Contrast Dark Map Style
 * Tuned specifically for runners with high-contrast streets, sharp turns,
 * clear arterial routes, and subtle dark backgrounds (similar to Strava/Nike Run Club).
 */
export const jogpalDarkMapStyle = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#14151B' }], // Deep dark asphalt background
  },
  {
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#7E8399' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#14151B' }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#252733' }],
  },
  {
    featureType: 'administrative.country',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9DA3BA' }],
  },
  {
    featureType: 'administrative.land_parcel',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#B0B6CC' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#171E19' }], // Subtle dark green tint for parks
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4E5369' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#282A36' }], // Clear, distinct street geometry
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#888EAA' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#3A3D4E' }], // Higher contrast for arterial avenues
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#4C5167' }], // Brightest road class for major highways
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#B3B8CD' }],
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0A0C12' }], // Deep ink water
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#3F4458' }],
  },
];
