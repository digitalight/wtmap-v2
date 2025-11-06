'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '../../hooks/useAuth';
import Navigation from '../../components/Navigation';

interface UserStats {
  towersVisited: number;
  commentsLeft: number;
  averageRating: number;
  totalRatings: number;
}

interface County {
  id: number;
  name: string;
}

interface CountyProgress {
  county: County;
  totalTowers: number;
  visitedTowers: number;
  percentage: number;
}

interface Visit {
  id: string;
  tower_id: string;
  visited_at: string;
  tower: {
    name: string;
    latitude: number;
    longitude: number;
  };
}

interface Comment {
  id: string;
  comment: string;
  rating: number;
  created_at: string;
  tower_id: string;
  tower?: {
    name: string;
  };
}

const ProfilePage = () => {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
  const [recentComments, setRecentComments] = useState<Comment[]>([]);
  const [countyProgress, setCountyProgress] = useState<CountyProgress[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'visits' | 'comments' | 'progress'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [resetPasswordMessage, setResetPasswordMessage] = useState<string | null>(null);
  const [countyProgressLoaded, setCountyProgressLoaded] = useState(false);
  const supabase = createClientComponentClient();
  const dataFetchedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate fetches in strict mode
    if (user && !dataFetchedRef.current) {
      dataFetchedRef.current = true;
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Fetch user visits (which include rating and comment data)
      const visitsResponse = await supabase
        .from('user_visits')
        .select('id, tower_id, rating, comment, visited_at')
        .eq('user_id', user.id)
        .order('visited_at', { ascending: false });

      if (visitsResponse.error) {
        console.error('Error fetching visits:', visitsResponse.error);
      }

      // Fetch tower details for visits
      const towerIds = visitsResponse.data?.map(v => v.tower_id) || [];
      
      const uniqueTowerIds = Array.from(new Set(towerIds));
      const towersResponse = await supabase
        .from('water_towers')
        .select('id, name, latitude, longitude')
        .in('id', uniqueTowerIds);

      const towersMap = new Map(towersResponse.data?.map(tower => [tower.id, tower]) || []);

      if (visitsResponse.data) {
        // Set recent visits
        setRecentVisits(visitsResponse.data.map(visit => ({
          id: visit.id,
          tower_id: visit.tower_id,
          visited_at: visit.visited_at || new Date().toISOString(),
          tower: {
            name: towersMap.get(visit.tower_id)?.name || 'Unknown Tower',
            latitude: towersMap.get(visit.tower_id)?.latitude || 0,
            longitude: towersMap.get(visit.tower_id)?.longitude || 0
          }
        })).slice(0, 10)); // Get 10 most recent

        // Extract comments from visits that have them
        const commentsWithRatings = visitsResponse.data
          .filter(visit => visit.comment || visit.rating)
          .map(visit => ({
            id: visit.id,
            comment: visit.comment || '',
            rating: visit.rating || 0,
            created_at: visit.visited_at || new Date().toISOString(),
            tower_id: visit.tower_id,
            tower: {
              name: towersMap.get(visit.tower_id)?.name || 'Unknown Tower'
            }
          }));

        setRecentComments(commentsWithRatings.slice(0, 10));

        // Calculate stats
        const totalVisits = visitsResponse.data.length;
        const commentsCount = visitsResponse.data.filter(v => v.comment).length;
        const ratingsData = visitsResponse.data.filter(v => v.rating);
        const totalRatings = ratingsData.length;
        const avgRating = totalRatings > 0 
          ? ratingsData.reduce((sum, v) => sum + (v.rating || 0), 0) / totalRatings 
          : 0;

        setStats({
          towersVisited: totalVisits,
          commentsLeft: commentsCount,
          averageRating: avgRating,
          totalRatings: totalRatings
        });
      }

      // Don't fetch county progress on initial load - only when tab is clicked
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Lazy load county progress only when needed
  useEffect(() => {
    if (activeTab === 'progress' && !countyProgressLoaded && user) {
      fetchCountyProgress();
    }
  }, [activeTab, user]);

  const fetchCountyProgress = async () => {
    if (!user) return;

    try {
      // Fetch all counties
      const { data: counties, error: countiesError } = await supabase
        .from('counties')
        .select('id, name')
        .order('name');

      if (countiesError) {
        console.error('Error fetching counties:', countiesError);
        return;
      }

      // Fetch all towers with county info
      const { data: towers, error: towersError } = await supabase
        .from('water_towers')
        .select('id, county_id');

      if (towersError) {
        console.error('Error fetching towers:', towersError);
        return;
      }

      // Fetch user's visited towers
      const { data: visits, error: visitsError } = await supabase
        .from('user_visits')
        .select('tower_id')
        .eq('user_id', user.id);

      if (visitsError) {
        console.error('Error fetching visits:', visitsError);
        return;
      }

      const visitedTowerIds = new Set(visits?.map(v => v.tower_id) || []);

      // Calculate progress for each county
      const progress: CountyProgress[] = counties
        .map(county => {
          const countyTowers = towers?.filter(t => t.county_id === county.id) || [];
          const visitedCount = countyTowers.filter(t => visitedTowerIds.has(t.id)).length;
          
          return {
            county,
            totalTowers: countyTowers.length,
            visitedTowers: visitedCount,
            percentage: countyTowers.length > 0 ? (visitedCount / countyTowers.length) * 100 : 0
          };
        })
        .filter(cp => cp.totalTowers > 0) // Only show counties with towers
        .sort((a, b) => b.percentage - a.percentage); // Sort by completion percentage

      setCountyProgress(progress);
    } catch (error) {
      console.error('Error fetching county progress:', error);
    } finally {
      setCountyProgressLoaded(true);
    }
  };

  const deleteComment = async (visitId: string, towerName: string) => {
    if (!confirm(`Delete your comment for ${towerName}?`)) {
      return;
    }

    try {
      setDeletingCommentId(visitId);

      // Delete the comment and rating from user_visits
      const { error } = await supabase
        .from('user_visits')
        .update({ 
          comment: null, 
          rating: null 
        })
        .eq('id', visitId.toString())
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error deleting comment:', error);
        alert(`Failed to delete comment: ${error.message}`);
        return;
      }

      // Refresh data
      await fetchUserData();
      alert('Comment deleted successfully');
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to delete comment');
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;

    setResetPasswordLoading(true);
    setResetPasswordMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/profile`,
      });

      if (error) {
        setResetPasswordMessage(`Error: ${error.message}`);
      } else {
        setResetPasswordMessage('Password reset email sent! Check your inbox.');
      }
    } catch (error) {
      console.error('Error sending password reset email:', error);
      setResetPasswordMessage('Failed to send password reset email. Please try again.');
    } finally {
      setResetPasswordLoading(false);
      // Clear message after 5 seconds
      setTimeout(() => setResetPasswordMessage(null), 5000);
    }
  };

  const getStarRating = (rating: number) => {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <div>Loading your profile...</div>
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
            <h1 className="text-2xl font-bold mb-4">Please log in to view your profile</h1>
            <p className="text-gray-600">You need to be logged in to access your profile page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                {user.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{user.email}</h1>
                <p className="text-gray-600">Water Tower Explorer</p>
              </div>
            </div>
            
            {/* Show Reset Password button only for email/password users (not OAuth) */}
            {user.app_metadata?.provider === 'email' && (
              <div className="flex flex-col items-end">
                <button
                  onClick={handleResetPassword}
                  disabled={resetPasswordLoading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {resetPasswordLoading ? 'Sending...' : 'Reset Password'}
                </button>
                {resetPasswordMessage && (
                  <p className={`text-sm mt-2 ${
                    resetPasswordMessage.includes('Error') 
                      ? 'text-red-600' 
                      : 'text-green-600'
                  }`}>
                    {resetPasswordMessage}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats?.towersVisited || 0}</div>
            <div className="text-sm text-gray-600">Towers Visited</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats?.commentsLeft || 0}</div>
            <div className="text-sm text-gray-600">Comments Left</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {stats?.averageRating ? `${stats.averageRating}★` : 'N/A'}
            </div>
            <div className="text-sm text-gray-600">Avg Rating Given</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats?.totalRatings || 0}</div>
            <div className="text-sm text-gray-600">Ratings Given</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'progress', label: 'My Progress' },
                { id: 'visits', label: `Recent Visits (${recentVisits.length})` },
                { id: 'comments', label: `My Comments (${recentComments.length})` }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                  {recentVisits.length === 0 && recentComments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No activity yet. Start exploring water towers to see your activity here!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentVisits.slice(0, 3).map((visit) => (
                        <div key={visit.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div>
                            <p className="font-medium">Visited {visit.tower.name}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(visit.visited_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                      {recentComments.slice(0, 2).map((comment) => (
                        <div key={comment.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <div>
                            <p className="font-medium">Commented on {comment.tower?.name}</p>
                            <p className="text-sm text-gray-600">
                              {comment.rating}★ - {new Date(comment.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'progress' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">County Progress</h3>
                {countyProgress.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>Loading county progress...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {countyProgress.map((cp) => (
                      <div key={cp.county.id} className="border rounded-lg p-2">
                        <div className="flex justify-between items-center mb-1.5">
                          <div className="flex-1">
                            <span className="font-medium text-gray-900">{cp.county.name}</span>
                            <span className="text-sm text-gray-500 ml-2">
                              ({cp.visitedTowers}/{cp.totalTowers})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${
                              cp.percentage === 100 ? 'text-green-600' :
                              cp.percentage >= 50 ? 'text-blue-600' :
                              cp.percentage > 0 ? 'text-yellow-600' :
                              'text-gray-400'
                            }`}>
                              {Math.round(cp.percentage)}%
                            </span>
                            {cp.percentage === 100 && (
                              <span className="text-green-600">✓</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                              cp.percentage === 100 ? 'bg-green-500' :
                              cp.percentage >= 50 ? 'bg-blue-500' :
                              cp.percentage > 0 ? 'bg-yellow-500' :
                              'bg-gray-300'
                            }`}
                            style={{ width: `${cp.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'visits' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Tower Visits</h3>
                {recentVisits.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No visits recorded yet. Start exploring and mark towers as visited!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentVisits.map((visit) => (
                      <div key={visit.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{visit.tower.name}</h4>
                            <p className="text-sm text-gray-600">
                              {visit.tower.latitude.toFixed(6)}, {visit.tower.longitude.toFixed(6)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-green-600">Visited</p>
                            <p className="text-sm text-gray-600">
                              {new Date(visit.visited_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'comments' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">My Comments & Ratings</h3>
                {recentComments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No comments yet. Visit some towers and share your experiences!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentComments.map((comment) => (
                      <div key={comment.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold">{comment.tower?.name}</h4>
                          <div className="flex items-center space-x-2">
                            <div className="text-yellow-500">
                              {'★'.repeat(comment.rating)}{'☆'.repeat(5 - comment.rating)}
                            </div>
                            <span className="text-sm text-gray-600">
                              {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-700 mb-3">{comment.comment}</p>
                        <div className="flex justify-end">
                          <button
                            onClick={() => deleteComment(comment.id, comment.tower?.name || 'this tower')}
                            disabled={deletingCommentId === comment.id}
                            className="px-3 py-1 text-sm rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {deletingCommentId === comment.id ? 'Deleting...' : 'Delete Comment'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;