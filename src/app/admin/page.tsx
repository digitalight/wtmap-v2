'use client';

import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAdmin } from '../../hooks/useAdmin';
import Navigation from '../../components/Navigation';
import UserManagement from '../../components/UserManagement';
import PhotoManagement from '../../components/PhotoManagement';

const AdminPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string>('');
  const [importError, setImportError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'photos'>('dashboard');

  const loading = authLoading || adminLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <div>Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
            <p className="text-gray-600">
              {!user ? 'Please log in to access admin features' : 'You need admin privileges to access this page'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleImport = async (action: string, dryRun = false) => {
    setImporting(true);
    setImportStatus('');
    setImportError('');

    try {
      const label = action === 'import_overpass' ? 'UK-wide' : action === 'import_sample' ? 'London' : 'OSM ID backfill';
      setImportStatus(`Starting ${dryRun ? 'dry run of ' : ''}${label}...`);
      
      const response = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data: { dryRun } }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.details || result.error || 'Import failed');
      }

      setImportStatus(`✅ ${result.message}`);
    } catch (error) {
      console.error('Import error:', error);
      setImportError(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleRealImport = (action: string) => {
    if (!confirm('Have you run a dry run and taken a backup? This will write to the database.')) return;
    handleImport(action);
  };

  const handleClearDatabase = async () => {
    const phrase = 'DELETE ALL TOWERS';
    const typed = prompt(
      `⚠️ This deletes ALL water towers, and with them every visit, comment and photo record linked to them. It cannot be undone.\n\nType "${phrase}" to confirm:`
    );
    if (typed !== phrase) {
      if (typed !== null) setImportError('Clear cancelled: confirmation phrase did not match.');
      return;
    }

    setImporting(true);
    setImportStatus('');
    setImportError('');

    try {
      setImportStatus('Clearing database...');
      
      const response = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_database', data: { confirmation: phrase } }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Clear failed');
      }

      setImportStatus(`✅ ${result.message}`);
    } catch (error) {
      console.error('Clear error:', error);
      setImportError(error instanceof Error ? error.message : 'Clear failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🔧 Dashboard
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              👥 User Management
            </button>
            <button
              onClick={() => setActiveTab('photos')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'photos'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📷 Photo Management
            </button>
          </nav>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold mb-6">🔧 Admin Dashboard</h1>
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Migration Status</h2>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800">✅ Comments and ratings system is ready!</p>
                <p className="text-green-700 text-sm mt-2">
                  The tower_comments table exists and is properly configured.
                </p>
              </div>
            </div>
            
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">System Status</h2>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>Database: Connected</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>Authentication: Working</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>Comments System: Active</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>User Profiles: Available</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">🗄️ Data Import</h2>
              
              {importStatus && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-blue-800">{importStatus}</p>
                </div>
              )}
              
              {importError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-800">❌ {importError}</p>
                </div>
              )}

              <div className="space-y-3">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Import All UK Water Towers</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Downloads water towers from OpenStreetMap for the entire United Kingdom and adds
                    only the ones not already in the database. Run the dry run first to see what would change.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleImport('import_overpass', true)}
                      disabled={importing}
                      className="border border-blue-600 text-blue-700 px-4 py-2 rounded hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {importing ? 'Working...' : 'Dry run (no changes)'}
                    </button>
                    <button
                      onClick={() => handleRealImport('import_overpass')}
                      disabled={importing}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {importing ? 'Importing...' : 'Import UK Towers'}
                    </button>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Import London Sample</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Downloads water towers from the London area only, skipping any already in the database.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleImport('import_sample', true)}
                      disabled={importing}
                      className="border border-green-600 text-green-700 px-4 py-2 rounded hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {importing ? 'Working...' : 'Dry run (no changes)'}
                    </button>
                    <button
                      onClick={() => handleRealImport('import_sample')}
                      disabled={importing}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {importing ? 'Importing...' : 'Import London Sample'}
                    </button>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Backfill OpenStreetMap IDs</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Links existing towers to their OpenStreetMap IDs so future imports recognise them.
                    Only fills in blank OSM ID fields; no towers are added or changed otherwise.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleImport('backfill_osm_ids', true)}
                      disabled={importing}
                      className="border border-gray-600 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {importing ? 'Working...' : 'Dry run (no changes)'}
                    </button>
                    <button
                      onClick={() => handleRealImport('backfill_osm_ids')}
                      disabled={importing}
                      className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {importing ? 'Working...' : 'Backfill OSM IDs'}
                    </button>
                  </div>
                </div>

                <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <h3 className="font-semibold text-red-900 mb-2">⚠️ Clear All Towers</h3>
                  <p className="text-sm text-red-700 mb-3">
                    Removes all water towers from the database, along with their visits, comments and photo records. You will need to type a confirmation phrase. This cannot be undone.
                  </p>
                  <button
                    onClick={handleClearDatabase}
                    disabled={importing}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {importing ? 'Clearing...' : 'Clear Database'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📋 Next Steps</h3>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>• Visit the Dashboard to explore 825+ UK water towers</li>
                <li>• Click any tower marker to view details and leave comments</li>
                <li>• Check your Profile page to see visit statistics</li>
                <li>• Rate towers with the 5-star system</li>
              </ul>
            </div>
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <UserManagement />
        )}

        {/* Photo Management Tab */}
        {activeTab === 'photos' && (
          <PhotoManagement />
        )}
      </div>
    </div>
  );
};

export default AdminPage;