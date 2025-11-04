'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface UserProfile {
  id: string;
  email: string;
  is_admin: boolean;
  created_at: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdmin = async (userId: string, currentStatus: boolean) => {
    try {
      setUpdating(userId);
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_admin: !currentStatus })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user:', error);
        alert('Failed to update user admin status');
        return;
      }

      // Refresh users list
      await fetchUsers();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to update user');
    } finally {
      setUpdating(null);
    }
  };

  const resetPassword = async (email: string) => {
    if (!confirm(`Send password reset email to ${email}?`)) {
      return;
    }

    try {
      setUpdating(email);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('Error sending reset email:', error);
        alert('Failed to send password reset email');
        return;
      }

      alert(`Password reset email sent to ${email}`);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to send password reset email');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
        <p className="text-sm text-gray-600 mt-1">
          Manage user permissions and admin access
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {user.email}
                    </div>
                    <div className="text-xs text-gray-500">
                      ID: {user.id.slice(0, 8)}...
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.is_admin ? (
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                        Admin
                      </span>
                    ) : (
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        User
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleAdmin(user.id, user.is_admin)}
                        disabled={updating === user.id}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          user.is_admin
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {updating === user.id ? (
                          'Updating...'
                        ) : user.is_admin ? (
                          'Remove Admin'
                        ) : (
                          'Make Admin'
                        )}
                      </button>
                      <button
                        onClick={() => resetPassword(user.email)}
                        disabled={updating === user.email}
                        className="px-3 py-1 rounded text-sm font-medium transition-colors bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updating === user.email ? 'Sending...' : 'Reset Password'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {users.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            Total users: <span className="font-semibold">{users.length}</span>
            {' | '}
            Admins: <span className="font-semibold">{users.filter(u => u.is_admin).length}</span>
          </p>
        </div>
      )}
    </div>
  );
}
