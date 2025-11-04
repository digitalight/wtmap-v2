'use client';

import React, { useEffect, Suspense } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTowers } from '../../hooks/useTowers';
import Map from '../../components/Map';
import Navigation from '../../components/Navigation';
import { useRouter, useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

function DashboardContent() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { towers, loading: towersLoading, error } = useTowers();
  const router = useRouter();
  const searchParams = useSearchParams();
  const towerId = searchParams.get('towerId');

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Show loading while fetching towers
  if (towersLoading) {
    return (
      <div className="dashboard-container bg-gray-50">
        <Navigation towersCount={0} />
        <main className="dashboard-main flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <div>Loading towers...</div>
          </div>
        </main>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="dashboard-container bg-gray-50">
        <Navigation towersCount={0} />
        <main className="dashboard-main flex items-center justify-center">
          <div className="text-red-500 text-center max-w-md p-8">
            <div className="text-6xl mb-4">⚠️</div>
            <div className="mb-4">Error loading towers:</div>
            <div className="text-sm bg-red-50 p-3 rounded mb-4">{error.message}</div>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Main dashboard view
  return (
    <div className="dashboard-container bg-gray-50">
      {/* Navigation */}
      <Navigation towersCount={towers?.length || 0} />

      {/* Map Container */}
      <main className="dashboard-main">
        <Map towers={towers || []} user={user} selectedTowerId={towerId} />
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="dashboard-container bg-gray-50">
        <Navigation towersCount={0} />
        <main className="dashboard-main flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <div>Loading...</div>
          </div>
        </main>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}