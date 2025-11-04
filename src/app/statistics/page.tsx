'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Navigation from '@/components/Navigation';
import Link from 'next/link';

interface TowerVisit {
  tower_id: string;
  tower_name: string;
  visit_count: number;
}

interface UserVisit {
  user_id: string;
  user_email: string;
  first_name?: string | null;
  last_name?: string | null;
  visit_count: number;
}

export default function StatisticsPage() {
  const [topTowers, setTopTowers] = useState<TowerVisit[]>([]);
  const [topUsers, setTopUsers] = useState<UserVisit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchStatistics();
  }, []);

  // Format user display name as "FirstName L." or fallback to email
  const formatUserName = (user: UserVisit): string => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name.charAt(0)}.`;
    } else if (user.first_name) {
      return user.first_name;
    }
    return user.user_email;
  };

  const fetchStatistics = async () => {
    setIsLoading(true);
    try {
      // Fetch top 25 towers with most visits
      const { data: towerData, error: towerError } = await supabase
        .from('user_visits')
        .select('tower_id, water_towers(name)')
        .order('tower_id');

      if (towerError) {
        console.error('Error fetching tower visits:', towerError);
      } else if (towerData) {
        // Count visits per tower
        const towerCounts = new Map<string, { name: string; count: number }>();
        towerData.forEach((visit: any) => {
          const towerId = visit.tower_id;
          const towerName = visit.water_towers?.name || 'Unknown Tower';
          
          if (towerCounts.has(towerId)) {
            towerCounts.get(towerId)!.count++;
          } else {
            towerCounts.set(towerId, { name: towerName, count: 1 });
          }
        });

        // Convert to array and sort by count
        const sortedTowers = Array.from(towerCounts.entries())
          .map(([tower_id, { name, count }]) => ({
            tower_id,
            tower_name: name,
            visit_count: count,
          }))
          .sort((a, b) => b.visit_count - a.visit_count)
          .slice(0, 25);

        setTopTowers(sortedTowers);
      }

      // Fetch top 10 users with most visits
      const { data: userData, error: userError } = await supabase
        .from('user_visits')
        .select('user_id');

      if (userError) {
        console.error('Error fetching user visits:', userError);
      } else if (userData) {
        // Count visits per user
        const userCounts = new Map<string, number>();
        userData.forEach((visit: any) => {
          const userId = visit.user_id;
          userCounts.set(userId, (userCounts.get(userId) || 0) + 1);
        });

        // Get user emails and names
        const userIds = Array.from(userCounts.keys());
        const { data: profilesData, error: profilesError } = await supabase
          .from('user_profiles')
          .select('id, email, first_name, last_name')
          .in('id', userIds);

        const userProfileMap = new Map<string, { email: string; first_name?: string | null; last_name?: string | null }>();
        if (profilesData) {
          profilesData.forEach((profile: any) => {
            userProfileMap.set(profile.id, {
              email: profile.email || 'Unknown User',
              first_name: profile.first_name,
              last_name: profile.last_name,
            });
          });
        }

        // Convert to array and sort by count
        const sortedUsers = Array.from(userCounts.entries())
          .map(([user_id, count]) => {
            const profile = userProfileMap.get(user_id);
            return {
              user_id,
              user_email: profile?.email || 'Unknown User',
              first_name: profile?.first_name,
              last_name: profile?.last_name,
              visit_count: count,
            };
          })
          .sort((a, b) => b.visit_count - a.visit_count)
          .slice(0, 10);

        setTopUsers(sortedUsers);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Statistics</h1>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top Towers Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Top 25 Most Visited Towers
              </h2>
              
              {topTowers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No tower visits yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tower Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Visits
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {topTowers.map((tower, index) => (
                        <tr key={tower.tower_id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {index < 3 ? (
                                <span className="text-2xl">
                                  {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                </span>
                              ) : (
                                <span className="text-sm font-medium text-gray-900">
                                  {index + 1}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <Link 
                              href={`/dashboard?towerId=${tower.tower_id}`}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {tower.tower_name}
                            </Link>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              {tower.visit_count}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Top Users Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Top 10 Users by Visits
              </h2>
              
              {topUsers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No user visits yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Visits
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {topUsers.map((user, index) => (
                        <tr key={user.user_id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {index < 3 ? (
                                <span className="text-2xl">
                                  {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                </span>
                              ) : (
                                <span className="text-sm font-medium text-gray-900">
                                  {index + 1}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                              {formatUserName(user)}
                            </div>
                            {user.first_name && (
                              <div className="text-xs text-gray-500 truncate max-w-xs">
                                {user.user_email}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {user.visit_count}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
