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

// Cache for towers data (shared across all instances)
let cachedTowers: Tower[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = 'wtmap_towers_cache';
const STORAGE_TIMESTAMP_KEY = 'wtmap_towers_timestamp';

// Try to load from localStorage on initialization
if (typeof window !== 'undefined') {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    const storedTimestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);
    
    if (storedData && storedTimestamp) {
      const timestamp = parseInt(storedTimestamp, 10);
      if (Date.now() - timestamp < CACHE_DURATION) {
        cachedTowers = JSON.parse(storedData);
        cacheTimestamp = timestamp;
      }
    }
  } catch (error) {
    console.error('Error loading cached towers from localStorage:', error);
  }
}

export const useTowers = () => {
  const [towers, setTowers] = useState<Tower[]>(cachedTowers || []); // Use cache initially
  const [loading, setLoading] = useState(!cachedTowers); // Don't show loading if we have cache
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClientComponentClient();
  const fetchedRef = useRef(false);

  useEffect(() => {
    // If we already have valid cached data, use it
    if (cachedTowers && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
      setTowers(cachedTowers);
      setLoading(false);
      return;
    }

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

        // Update cache
        cachedTowers = towersWithImages;
        cacheTimestamp = Date.now();
        
        // Also save to localStorage for persistence across sessions
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(towersWithImages));
            localStorage.setItem(STORAGE_TIMESTAMP_KEY, cacheTimestamp.toString());
          } catch (error) {
            console.error('Error saving towers to localStorage:', error);
          }
        }
        
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

// Function to manually clear cache (useful for admin updates)
export const clearTowersCache = () => {
  cachedTowers = null;
  cacheTimestamp = null;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
    } catch (error) {
      console.error('Error clearing localStorage cache:', error);
    }
  }
};