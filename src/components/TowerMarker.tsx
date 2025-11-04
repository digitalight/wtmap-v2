'use client';

import React from 'react';

interface Tower {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

interface TowerMarkerProps {
  tower: Tower;
}

const TowerMarker: React.FC<TowerMarkerProps> = ({ tower }) => {
  return (
    <div className="tower-marker p-2 border rounded">
      <h4 className="font-semibold">{tower.name}</h4>
      <p className="text-sm text-gray-600">
        {tower.latitude.toFixed(6)}, {tower.longitude.toFixed(6)}
      </p>
    </div>
  );
};

export default TowerMarker;