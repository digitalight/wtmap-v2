'use client';

import { useState, useEffect } from 'react';

interface Tower {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  county_id?: number;
  osm_id?: string;
  geometry_type?: string;
  created_at?: string;
}

export const useTowers = () => {
  const [towers, setTowers] = useState<Tower[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Mock UK water towers for testing
    setTimeout(() => {
      const mockTowers: Tower[] = [
        {
          id: '1',
          name: 'Hornsey Water Tower',
          latitude: 51.5885,
          longitude: -0.1178,
          geometry_type: 'Point'
        },
        {
          id: '2',
          name: 'Kempton Park Water Tower',
          latitude: 51.4167,
          longitude: -0.4103,
          geometry_type: 'Point'
        },
        {
          id: '3',
          name: 'Shooters Hill Water Tower',
          latitude: 51.4631,
          longitude: 0.0589,
          geometry_type: 'Point'
        },
        {
          id: '4',
          name: 'Northolt Water Tower',
          latitude: 51.5481,
          longitude: -0.3667,
          geometry_type: 'Point'
        },
        {
          id: '5',
          name: 'Didcot Water Tower',
          latitude: 51.6089,
          longitude: -1.2406,
          geometry_type: 'Point'
        },
        {
          id: '6',
          name: 'Birmingham Edgbaston Tower',
          latitude: 52.4539,
          longitude: -1.9308,
          geometry_type: 'Point'
        },
        {
          id: '7',
          name: 'Manchester Heaton Park Tower',
          latitude: 53.5264,
          longitude: -2.2794,
          geometry_type: 'Point'
        },
        {
          id: '8',
          name: 'Leeds Roundhay Tower',
          latitude: 53.8372,
          longitude: -1.5003,
          geometry_type: 'Point'
        },
        {
          id: '9',
          name: 'Cardiff Llandaff Tower',
          latitude: 51.5081,
          longitude: -3.2153,
          geometry_type: 'Point'
        },
        {
          id: '10',
          name: 'Glasgow Queens Park Tower',
          latitude: 55.8319,
          longitude: -4.2625,
          geometry_type: 'Point'
        }
      ];
      
      setTowers(mockTowers);
      setLoading(false);
    }, 1000); // Simulate loading time
  }, []);

  return { towers, loading, error };
};