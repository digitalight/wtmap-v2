'use client';

import { useState, useEffect, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Tower {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  county_id?: number;
  osm_id?: string;
  osm_type?: string;
  height?: number;
  material?: string;
  capacity?: number;
  construction_year?: number;
  operational?: boolean;
  condition?: string;
  tags?: any;
  address?: string;
  owner?: string;
  created_at?: string;
  updated_at?: string;
  image_url?: string;
  image_uploaded_by?: string;
  image_uploaded_at?: string;
}

export const useTowers = () => {
  const [towers, setTowers] = useState<Tower[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClientComponentClient();
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate fetches in strict mode
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchTowers = async () => {
      try {
        setLoading(true);
        setError(null);

        // Optimized query - only fetch essential fields for map display
        const { data, error } = await supabase
          .from('water_towers')
          .select(`
            id,
            name,
            latitude,
            longitude,
            county_id,
            tower_images!tower_images_tower_id_fkey(
              image_url,
              is_primary
            )
          `)
          .order('name');

        if (error) throw error;

        // Map towers and add primary image URL
        const towersWithImages = (Array.isArray(data) ? data : []).map(tower => {
          const primaryImage = tower.tower_images?.find((img: any) => img.is_primary);
          const anyImage = tower.tower_images?.[0];
          return {
            ...tower,
            image_url: primaryImage?.image_url || anyImage?.image_url,
            tower_images: undefined,
          };
        });
        
        setTowers(towersWithImages);
      } catch (err) {
        console.error('Error fetching towers:', err);
        setError(err as Error);
        setTowers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTowers();
  }, []);

  return { towers, loading, error };
};