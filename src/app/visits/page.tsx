'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '../../hooks/useAuth';
import Navigation from '../../components/Navigation';

interface VisitedTower {
  id: string;
  tower_id: string;
  visited_at: string;
  tower: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  };
  comment?: {
    rating?: number;
    comment?: string;
    created_at?: string;
  };
}

const VisitsPage = () => {
  const { user, loading } = useAuth();
  const [visits, setVisits] = useState<VisitedTower[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'rating'>('date');
  const [filterBy, setFilterBy] = useState<'all' | 'commented' | 'rated'>('all');
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (user) {
      fetchVisits();
    }
  }, [user]);

  const fetchVisits = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      console.log('Fetching visits for user:', user.id);

      // Fetch all visits with rating and comment from user_visits table
      const { data: visitsData, error: visitsError } = await supabase
        .from('user_visits')
        .select('id, tower_id, rating, comment, visited_at')
        .eq('user_id', user.id)
        .order('visited_at', { ascending: false });

      console.log('Visits data:', visitsData);
      console.log('Visits error:', visitsError);

      if (visitsError) {
        console.error('Error fetching visits:', visitsError);
        throw visitsError;
      }

      if (!visitsData || visitsData.length === 0) {
        console.log('No visits found');
        setVisits([]);
        setIsLoading(false);
        return;
      }

      console.log('Found', visitsData.length, 'visits');

      // Fetch tower details
      const towerIds = visitsData.map(v => v.tower_id);
      console.log('Fetching towers:', towerIds);
      
      const { data: towersData, error: towersError } = await supabase
        .from('water_towers')
        .select('id, name, latitude, longitude')
        .in('id', towerIds);

      console.log('Towers data:', towersData);
      console.log('Towers error:', towersError);

      if (towersError) {
        console.error('Error fetching towers:', towersError);
        throw towersError;
      }

      // Combine the data
      const towersMap = new Map(towersData?.map(tower => [tower.id, tower]) || []);

      const combinedVisits: VisitedTower[] = visitsData.map(visit => ({
        id: visit.id,
        tower_id: visit.tower_id,
        visited_at: visit.visited_at || new Date().toISOString(),
        tower: towersMap.get(visit.tower_id) || {
          id: visit.tower_id,
          name: 'Unknown Tower',
          latitude: 0,
          longitude: 0
        },
        comment: visit.rating || visit.comment ? {
          rating: visit.rating,
          comment: visit.comment,
          created_at: visit.visited_at || new Date().toISOString()
        } : undefined
      }));

      console.log('Combined visits:', combinedVisits);
      setVisits(combinedVisits);
    } catch (error) {
      console.error('Error fetching visits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSortedAndFilteredVisits = () => {
    let filteredVisits = [...visits];

    // Apply filters
    switch (filterBy) {
      case 'commented':
        filteredVisits = filteredVisits.filter(visit => visit.comment?.comment);
        break;
      case 'rated':
        filteredVisits = filteredVisits.filter(visit => visit.comment?.rating);
        break;
    }

    // Apply sorting
    switch (sortBy) {
      case 'date':
        return filteredVisits.sort((a, b) => new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime());
      case 'name':
        return filteredVisits.sort((a, b) => a.tower.name.localeCompare(b.tower.name));
      case 'rating':
        return filteredVisits.sort((a, b) => (b.comment?.rating || 0) - (a.comment?.rating || 0));
      default:
        return filteredVisits;
    }
  };

  const updateVisitDate = async (visitId: string, newDate: string) => {
    try {
      const { error } = await supabase
        .from('user_visits')
        .update({ visited_at: newDate })
        .eq('id', visitId);

      if (error) throw error;

      // Update local state
      setVisits(visits.map(visit => 
        visit.id === visitId 
          ? { ...visit, visited_at: newDate }
          : visit
      ));

      setEditingVisitId(null);
      setEditDate('');
    } catch (error) {
      console.error('Error updating visit date:', error);
      alert('Failed to update visit date');
    }
  };

  const startEditingDate = (visit: VisitedTower) => {
    setEditingVisitId(visit.id);
    // Format date for datetime-local input: YYYY-MM-DDTHH:mm
    const date = new Date(visit.visited_at);
    const formatted = date.toISOString().slice(0, 16);
    setEditDate(formatted);
  };

  const cancelEditing = () => {
    setEditingVisitId(null);
    setEditDate('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDistanceFromHome = (lat: number, lng: number) => {
    // Using approximate center of UK as reference point
    const ukCenterLat = 54.7;
    const ukCenterLng = -2.5;
    
    const R = 6371; // Earth's radius in km
    const dLat = (lat - ukCenterLat) * Math.PI / 180;
    const dLng = (lng - ukCenterLng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(ukCenterLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <div>Loading your visits...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please log in to view your visits</h1>
            <p className="text-gray-600">You need to be logged in to see your tower visit history.</p>
          </div>
        </div>
      </div>
    );
  }

  const sortedVisits = getSortedAndFilteredVisits();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📍 My Tower Visits</h1>
              <p className="text-gray-600 mt-1">
                {visits.length} towers visited • {visits.filter(v => v.comment?.comment).length} commented • {visits.filter(v => v.comment?.rating).length} rated
              </p>
            </div>
            
            {/* Controls */}
            <div className="flex gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="ml-2 border border-gray-300 rounded-md px-3 py-1 text-sm"
                >
                  <option value="date">Visit Date</option>
                  <option value="name">Tower Name</option>
                  <option value="rating">My Rating</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Filter:</label>
                <select 
                  value={filterBy} 
                  onChange={(e) => setFilterBy(e.target.value as any)}
                  className="ml-2 border border-gray-300 rounded-md px-3 py-1 text-sm"
                >
                  <option value="all">All Visits</option>
                  <option value="commented">With Comments</option>
                  <option value="rated">With Ratings</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Visits List - Compact View */}
        {sortedVisits.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            {visits.length === 0 ? (
              <>
                <div className="text-4xl mb-4">🗼</div>
                <h2 className="text-xl font-semibold mb-2">No visits yet</h2>
                <p className="text-gray-600 mb-4">
                  Start exploring UK water towers and mark them as visited to track your journey!
                </p>
                <a
                  href="/dashboard"
                  className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Explore Water Towers
                </a>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold mb-2">No visits match your filters</h2>
                <p className="text-gray-600">Try adjusting your filter settings above.</p>
              </>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tower Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Visit Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Comment
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedVisits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{visit.tower.name}</div>
                        <div className="text-xs text-gray-500">
                          {visit.tower.latitude.toFixed(4)}, {visit.tower.longitude.toFixed(4)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {editingVisitId === visit.id ? (
                          <div className="flex flex-col gap-1">
                            <input
                              type="datetime-local"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="text-xs px-2 py-1 border border-gray-300 rounded"
                            />
                            <div className="flex gap-1">
                              <button
                                onClick={() => updateVisitDate(visit.id, editDate)}
                                className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                              >
                                ✓
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="text-xs bg-gray-400 text-white px-2 py-1 rounded hover:bg-gray-500"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-900">
                            {formatDate(visit.visited_at)}
                            <button
                              onClick={() => startEditingDate(visit)}
                              className="ml-2 text-blue-600 hover:text-blue-700"
                              title="Edit date"
                            >
                              ✏️
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {visit.comment?.rating ? (
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-500 text-sm">
                              {'★'.repeat(visit.comment.rating)}
                            </span>
                            <span className="text-xs text-gray-600">
                              {visit.comment.rating}/5
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {visit.comment?.comment ? (
                          <div className="max-w-xs">
                            <p className="text-sm text-gray-700 truncate" title={visit.comment.comment}>
                              {visit.comment.comment}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-2">
                          <a
                            href={`https://www.google.com/maps?q=${visit.tower.latitude},${visit.tower.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700"
                            title="View on Map"
                          >
                            🗺️
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisitsPage;