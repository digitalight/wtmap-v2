'use client';

import React, { useEffect, useState, useMemo, Fragment } from 'react';
import dynamic from 'next/dynamic';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import TowerComments from './TowerComments';
import TowerImageGallery from './TowerImageGallery';
import TowerImageUpload from './TowerImageUpload';
import StreetViewModal from './StreetViewModal';
import type { User } from '@supabase/supabase-js';

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const ZoomControl = dynamic(() => import('react-leaflet').then(mod => mod.ZoomControl), { ssr: false });
const GeoJSON = dynamic(() => import('react-leaflet').then(mod => mod.GeoJSON), { ssr: false });
const MapController = dynamic(() => import('./MapController'), { ssr: false });

interface Tower {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
  construction_year?: number;
  height?: number;
  material?: string;
  capacity?: number;
  operational?: boolean;
  condition?: string;
  county_id?: number;
  image_url?: string;
  image_uploaded_by?: string;
  image_uploaded_at?: string;
}

interface County {
  id: number;
  name: string;
  geometry: any; // GeoJSON geometry
}

interface MapProps {
  towers?: Tower[];
  user?: User | null;
  selectedTowerId?: string | null;
}

const Map: React.FC<MapProps> = ({ towers = [], user = null, selectedTowerId = null }) => {
  const [mounted, setMounted] = useState(false);
  const [L, setL] = useState<any>(null);
  const [selectedTower, setSelectedTower] = useState<Tower | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [visitedTowers, setVisitedTowers] = useState<Set<string>>(new Set());
  const [counties, setCounties] = useState<County[]>([]);
  const [selectedCounty, setSelectedCounty] = useState<number | null>(null);
  const [showBoundaries, setShowBoundaries] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [map, setMap] = useState<any>(null);
  const [hasZoomedToLocation, setHasZoomedToLocation] = useState(false);
  const [isStreetViewOpen, setIsStreetViewOpen] = useState(false);
  const [streetViewTower, setStreetViewTower] = useState<Tower | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Import Leaflet only on client side
    import('leaflet').then((leaflet) => {
      // Fix Leaflet default markers
      delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
      setL(leaflet);
      setMounted(true);
    });
  }, []);

  // Fetch visited towers when user changes
  useEffect(() => {
    if (user) {
      fetchVisitedTowers();
    } else {
      setVisitedTowers(new Set());
    }
  }, [user]);

  // Fetch counties on mount
  useEffect(() => {
    fetchCounties();
  }, []);

  // Handle selectedTowerId from URL parameter
  useEffect(() => {
    if (selectedTowerId && towers.length > 0) {
      const tower = towers.find(t => t.id === selectedTowerId);
      if (tower) {
        setSelectedTower(tower);
        setIsModalOpen(true);
      }
    }
  }, [selectedTowerId, towers]);

  const fetchCounties = async () => {
    try {
      // Fetch counties with geometry
      const { data, error } = await supabase
        .from('counties')
        .select('id, name, geometry');

      if (error) {
        console.error('Error fetching counties:', error);
        return;
      }

      // Parse geometry - it's stored as JSON string
      const parsedCounties = (data || []).map(county => {
        let geometry = null;
        if (county.geometry) {
          try {
            // Parse the JSON string
            geometry = typeof county.geometry === 'string' 
              ? JSON.parse(county.geometry)
              : county.geometry;
          } catch (e) {
            console.error(`Error parsing geometry for ${county.name}:`, e);
          }
        }
        return { ...county, geometry };
      }).filter(c => c.geometry !== null);

      setCounties(parsedCounties);
    } catch (error) {
      console.error('Error fetching counties:', error);
    }
  };

  const fetchVisitedTowers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_visits')
        .select('tower_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching visited towers:', error);
        return;
      }

      const visitedIds = new Set(data?.map(visit => visit.tower_id) || []);
      setVisitedTowers(visitedIds);
    } catch (error) {
      console.error('Error fetching visited towers:', error);
    }
  };

  // Track user location
  useEffect(() => {
    if (!mounted) return;

    const updateLocation = () => {
      if (!('geolocation' in navigator)) {
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(newLocation);
          setLocationError(null);

          // Zoom to location on first load
          if (map && !hasZoomedToLocation) {
            map.setView([newLocation.lat, newLocation.lng], 13);
            setHasZoomedToLocation(true);
          }
        },
        (error) => {
          let errorMsg = 'Location unavailable';
          if (error.code === 1) {
            errorMsg = 'Location permission denied. Please enable location in your browser settings.';
          } else if (error.code === 2) {
            errorMsg = 'Location unavailable. Please check your device settings.';
          } else if (error.code === 3) {
            errorMsg = 'Location request timed out.';
          }
          setLocationError(errorMsg);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    };

    // Get initial location
    updateLocation();

    // Update location every 5 seconds
    const intervalId = setInterval(updateLocation, 5000);

    return () => clearInterval(intervalId);
  }, [mounted, map, hasZoomedToLocation]);

  // Zoom to user location when both map and location are ready
  useEffect(() => {
    if (map && userLocation && !hasZoomedToLocation) {
      try {
        map.setView([userLocation.lat, userLocation.lng], 13);
        setHasZoomedToLocation(true);
      } catch (error) {
        console.error('Zoom failed:', error);
      }
    }
  }, [map, userLocation, hasZoomedToLocation]);

  // Create custom icons for visited/unvisited towers
  const createTowerIcon = (isVisited: boolean) => {
    if (!L) return undefined;
    
    const iconUrl = isVisited 
      ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png'
      : 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png';
    
    return new L.Icon({
      iconUrl,
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
  };

  // Create rabbit icon for user location
  const rabbitIcon = useMemo(() => {
    if (!L) return undefined;
    
    return new L.DivIcon({
      html: '<div style="width: 30px; height: 30px; background: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15],
      className: 'custom-user-location-icon'
    });
  }, [L]);

  const handleQuickVisit = async (towerId: string, currentlyVisited: boolean) => {
    if (!user) return;

    try {
      if (currentlyVisited) {
        const { error } = await supabase
          .from('user_visits')
          .delete()
          .eq('tower_id', towerId)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error removing visit:', error);
        } else {
          setVisitedTowers(prev => {
            const newSet = new Set(prev);
            newSet.delete(towerId);
            return newSet;
          });
        }
      } else {
        const { error } = await supabase
          .from('user_visits')
          .insert({
            tower_id: towerId,
            user_id: user.id,
          });

        if (error) {
          console.error('Error marking visit:', error);
        } else {
          setVisitedTowers(prev => {
            const newSet = new Set(prev);
            newSet.add(towerId);
            return newSet;
          });
        }
      }
    } catch (error) {
      console.error('Error updating visit status:', error);
    }
  };

  // Filter towers by selected county
  const filteredTowers = selectedCounty 
    ? towers.filter(tower => tower.county_id === selectedCounty)
    : towers;

  // Get county statistics
  const getCountyStats = (countyId: number) => {
    const countyTowers = towers.filter(t => t.county_id === countyId);
    const visitedInCounty = countyTowers.filter(t => visitedTowers.has(t.id)).length;
    return {
      total: countyTowers.length,
      visited: visitedInCounty,
      unvisited: countyTowers.length - visitedInCounty
    };
  };

  // Style for county boundaries
  const countyStyle = (feature: any) => {
    const isSelected = feature.properties?.id === selectedCounty;
    return {
      fillColor: isSelected ? '#3b82f6' : '#94a3b8',
      weight: 2,
      opacity: 1,
      color: isSelected ? '#1e40af' : '#64748b',
      fillOpacity: isSelected ? 0.3 : 0.1
    };
  };

  const onCountyClick = (countyId: number) => {
    setSelectedCounty(selectedCounty === countyId ? null : countyId);
  };

  if (!mounted || !L) {
    return (
      <div className="map-wrapper flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div>Loading map...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="map-wrapper relative h-[calc(100vh-4rem)] md:h-screen">
      {/* Location Error Notification */}
      {locationError && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-[2000] bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-2 rounded-lg shadow-lg max-w-md text-sm">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{locationError}</span>
          </div>
        </div>
      )}

      {/* County Controls - Mobile Optimized - Hidden by Default */}
      {showFilters && (
        <div className="absolute top-2 left-2 right-2 md:top-4 md:left-4 md:right-auto z-[40] md:z-[1000] bg-white rounded-lg shadow-lg p-3 md:p-4 md:max-w-xs">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <h3 className="text-sm md:text-base font-semibold">Filters</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close filters"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="mb-2 md:mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showBoundaries}
                onChange={(e) => setShowBoundaries(e.target.checked)}
                className="rounded w-4 h-4"
              />
              <span className="text-xs md:text-sm font-medium">Show County Boundaries</span>
            </label>
          </div>

          {counties.length > 0 && (
            <div>
              <label className="block text-xs md:text-sm font-medium mb-1 md:mb-2">Filter by County:</label>
              <select
                value={selectedCounty || ''}
                onChange={(e) => setSelectedCounty(e.target.value ? Number(e.target.value) : null)}
                className="w-full p-2 md:p-2 border rounded text-xs md:text-sm touch-manipulation"
              >
                <option value="">All Counties</option>
                {counties
                  .filter(county => {
                    const stats = getCountyStats(county.id);
                    return stats.total > 0;
                  })
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(county => {
                    const stats = getCountyStats(county.id);
                    return (
                      <option key={county.id} value={county.id}>
                        {county.name} ({stats.total} towers, {stats.visited} visited)
                      </option>
                    );
                  })}
              </select>
            </div>
          )}

          {selectedCounty && (
            <div className="mt-2 md:mt-3 p-2 bg-blue-50 rounded text-xs md:text-sm">
              <div className="font-medium mb-1">
                {counties.find(c => c.id === selectedCounty)?.name}
              </div>
              {(() => {
                const stats = getCountyStats(selectedCounty);
                return (
                  <>
                    <div>Total: {stats.total}</div>
                    <div>Visited: {stats.visited}</div>
                    <div>Remaining: {stats.unvisited}</div>
                    {stats.total > 0 && (
                      <div className="mt-1">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${(stats.visited / stats.total) * 100}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {Math.round((stats.visited / stats.total) * 100)}% complete
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Filter Toggle Button - Bottom Left */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="absolute bottom-24 left-2 md:bottom-28 md:left-4 z-[1000] bg-white rounded-lg shadow-lg p-3 hover:bg-gray-50 transition-colors touch-manipulation"
        aria-label="Toggle filters"
        title="Toggle filters"
      >
        <svg 
          className="w-6 h-6 text-gray-700" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
      </button>

      <MapContainer
        center={[52.24, -0.75]}
        zoom={8}
        style={{ 
          height: '100%', 
          width: '100%'
        }}
        className="w-full h-full"
        zoomControl={false}
        ref={setMap}
      >
        <MapController 
          userLocation={userLocation}
          hasZoomedToLocation={hasZoomedToLocation}
          setHasZoomedToLocation={setHasZoomedToLocation}
          setMapInstance={setMap}
        />
        <ZoomControl position="bottomright" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* County Boundaries */}
        {showBoundaries && counties.map(county => {
          if (!county.geometry) return null;
          return (
            <GeoJSON
              key={county.id}
              data={county.geometry}
              style={() => countyStyle({ properties: { id: county.id } })}
              eventHandlers={{
                click: () => onCountyClick(county.id)
              }}
            >
              <Popup>
                <div className="text-sm">
                  <h3 className="font-semibold mb-1">{county.name}</h3>
                  {(() => {
                    const stats = getCountyStats(county.id);
                    return (
                      <>
                        <div>Total Towers: {stats.total}</div>
                        <div>Visited: {stats.visited}</div>
                        <div>Remaining: {stats.unvisited}</div>
                      </>
                    );
                  })()}
                </div>
              </Popup>
            </GeoJSON>
          );
        })}
        
        {/* Debug info */}
        <div className="absolute top-4 right-4 bg-white p-2 rounded shadow z-[1000] text-xs">
          Showing: {filteredTowers?.length || 0} / {towers?.length || 0} towers
        </div>

        {/* Render towers */}
        {filteredTowers && Array.isArray(filteredTowers) && filteredTowers.map((tower) => {
          const isVisited = visitedTowers.has(tower.id);
          return (
            <Marker
              key={tower.id}
              position={[tower.latitude, tower.longitude]}
              icon={createTowerIcon(isVisited)}
            >
              <Popup>
                <div>
                  <h3 className="font-semibold mb-2">{tower.name}</h3>
                  
                  {/* Tower Image */}
                  {tower.image_url && (
                    <div className="mb-2">
                      <img
                        src={tower.image_url}
                        alt={tower.name}
                        className="w-full aspect-square object-cover rounded"
                        onError={(e) => {
                          console.error('Image failed to load:', tower.image_url);
                          e.currentTarget.style.display = 'none';
                        }}
                        onLoad={() => {
                          console.log('Image loaded successfully:', tower.image_url);
                        }}
                      />
                    </div>
                  )}
                  {!tower.image_url && (
                    <div className="text-xs text-gray-400 mb-2">No image available</div>
                  )}
                  
                  {user && (
                    <button
                      onClick={() => handleQuickVisit(tower.id, isVisited)}
                      className={`w-full mb-2 px-3 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                        isVisited 
                          ? 'text-green-700 bg-green-100 hover:bg-green-200 border border-green-300' 
                          : 'text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300'
                      }`}
                    >
                      {isVisited ? 'Visited ✓' : 'Mark as Visited'}
                    </button>
                  )}
                  
                  {user ? (
                    <button
                      onClick={() => {
                        setSelectedTower(tower);
                        setIsModalOpen(true);
                      }}
                      className="bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700 w-full"
                    >
                      View Details
                    </button>
                  ) : (
                    <a
                      href="/login"
                      className="block text-center bg-gray-100 text-gray-900 px-3 py-1 rounded text-sm hover:bg-gray-200 w-full font-medium border border-gray-300"
                    >
                      Login to View Details
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* User location marker */}
        {userLocation && rabbitIcon && (
          <>
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={rabbitIcon}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold mb-1">📍 Your Location</div>
                  <div className="text-xs text-gray-600">
                    {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Updates every 5 seconds
                  </div>
                </div>
              </Popup>
            </Marker>
          </>
        )}
      </MapContainer>

      {/* Tower Details Modal */}
      <TowerDetailsModal
        tower={selectedTower}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTower(null);
        }}
        visitedTowers={visitedTowers}
        onVisitUpdate={fetchVisitedTowers}
        user={user}
        onOpenStreetView={(tower) => {
          setStreetViewTower(tower);
          setIsStreetViewOpen(true);
        }}
      />

      {/* Street View Modal */}
      {streetViewTower && (
        <StreetViewModal
          isOpen={isStreetViewOpen}
          onClose={() => setIsStreetViewOpen(false)}
          latitude={streetViewTower.latitude}
          longitude={streetViewTower.longitude}
          towerName={streetViewTower.name}
        />
      )}
    </div>
  );
};

// Tower Details Modal Component
function TowerDetailsModal({ 
  tower, 
  isOpen, 
  onClose,
  visitedTowers,
  onVisitUpdate,
  user,
  onOpenStreetView
}: { 
  tower: Tower | null; 
  isOpen: boolean; 
  onClose: () => void;
  visitedTowers: Set<string>;
  onVisitUpdate: () => Promise<void>;
  user: User | null;
  onOpenStreetView: (tower: Tower) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [galleryRefreshKey, setGalleryRefreshKey] = useState(0);
  const supabase = createClientComponentClient();

  const hasVisited = tower ? visitedTowers.has(tower.id) : false;

  const handleMarkVisited = async () => {
    if (!tower || !user) return;

    setIsLoading(true);
    try {
      if (hasVisited) {
        const { error } = await supabase
          .from('user_visits')
          .delete()
          .eq('tower_id', tower.id)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error removing visit:', error);
        } else {
          await onVisitUpdate(); // Refresh the visited towers state
        }
      } else {
        const { error } = await supabase
          .from('user_visits')
          .insert({
            tower_id: tower.id,
            user_id: user.id,
          });

        if (error) {
          console.error('Error marking visit:', error);
        } else {
          await onVisitUpdate(); // Refresh the visited towers state
        }
      }
    } catch (error) {
      console.error('Error updating visit status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!tower) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-end md:items-center justify-center p-0 md:p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-full md:translate-y-0 md:scale-95"
              enterTo="opacity-100 translate-y-0 md:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 md:scale-100"
              leaveTo="opacity-0 translate-y-full md:translate-y-0 md:scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-t-2xl md:rounded-2xl bg-white p-4 md:p-6 text-left align-middle shadow-xl transition-all max-h-[90vh] overflow-y-auto">
                <div className="flex items-start justify-between mb-3">
                  <Dialog.Title
                    as="h3"
                    className="text-base md:text-lg font-medium leading-6 text-gray-900 pr-8"
                  >
                    {tower.name}
                  </Dialog.Title>
                  <button
                    type="button"
                    className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Location:</span>
                      <p className="text-gray-600">
                        {tower.latitude.toFixed(6)}, {tower.longitude.toFixed(6)}
                      </p>
                    </div>
                    {tower.construction_year && (
                      <div>
                        <span className="font-medium text-gray-700">Built:</span>
                        <p className="text-gray-600">{tower.construction_year}</p>
                      </div>
                    )}
                    {tower.height && (
                      <div>
                        <span className="font-medium text-gray-700">Height:</span>
                        <p className="text-gray-600">{tower.height}m</p>
                      </div>
                    )}
                    {tower.material && (
                      <div>
                        <span className="font-medium text-gray-700">Material:</span>
                        <p className="text-gray-600">{tower.material}</p>
                      </div>
                    )}
                  </div>

                  {/* Waze Directions Button */}
                  <div>
                    <a
                      href={`https://waze.com/ul?ll=${tower.latitude},${tower.longitude}&navigate=yes`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#33CCFF] hover:bg-[#2BB8E8] text-white rounded-lg text-sm font-medium transition-colors w-full md:w-auto justify-center"
                    >
                      <svg 
                        className="w-5 h-5" 
                        viewBox="0 0 24 24" 
                        fill="currentColor"
                      >
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      </svg>
                      Directions Using Waze
                    </a>
                  </div>

                  {/* Street View Button */}
                  <div>
                    <button
                      onClick={() => onOpenStreetView(tower)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors w-full md:w-auto justify-center"
                    >
                      <svg 
                        className="w-5 h-5" 
                        viewBox="0 0 24 24" 
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M3 10h18M3 14h18m-9-4v8m-7 2h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                      Street View
                    </button>
                  </div>

                  {tower.description && (
                    <div>
                      <span className="font-medium text-gray-700">Description:</span>
                      <p className="text-gray-600 mt-1">{tower.description}</p>
                    </div>
                  )}

                  {/* Tower Photos Section */}
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Photos</h4>
                    <TowerImageGallery 
                      towerId={tower.id} 
                      currentUserId={user?.id}
                      refreshKey={galleryRefreshKey}
                    />
                    
                    {user && (
                      <div className="mt-4">
                        <TowerImageUpload
                          towerId={tower.id}
                          userId={user.id}
                          onImageUploaded={() => {
                            // Trigger gallery refresh by incrementing the key
                            setGalleryRefreshKey(prev => prev + 1);
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {user && (
                    <div className="flex items-center space-x-4 pt-4 border-t">
                      <button
                        onClick={handleMarkVisited}
                        disabled={isLoading}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          hasVisited
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isLoading ? 'Updating...' : hasVisited ? '✓ Visited' : 'Mark as Visited'}
                      </button>
                    </div>
                  )}

                  {/* Comments and Ratings Section */}
                  <div className="border-t pt-6">
                    <TowerComments towerId={tower.id} towerName={tower.name} />
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

export default Map;