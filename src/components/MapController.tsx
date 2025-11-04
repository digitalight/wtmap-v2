'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface MapControllerProps {
  userLocation: { lat: number; lng: number } | null;
  hasZoomedToLocation: boolean;
  setHasZoomedToLocation: (value: boolean) => void;
  setMapInstance: (map: any) => void;
}

export default function MapController({ 
  userLocation, 
  hasZoomedToLocation, 
  setHasZoomedToLocation,
  setMapInstance
}: MapControllerProps) {
  const map = useMap();
  
  useEffect(() => {
    if (map) {
      console.log('MapController: Setting map instance');
      setMapInstance(map);
    }
  }, [map, setMapInstance]);
  
  useEffect(() => {
    if (map && userLocation && !hasZoomedToLocation) {
      console.log('MapController: Zooming to user location:', userLocation);
      map.setView([userLocation.lat, userLocation.lng], 13);
      setHasZoomedToLocation(true);
    }
  }, [map, userLocation, hasZoomedToLocation, setHasZoomedToLocation]);
  
  return null;
}
