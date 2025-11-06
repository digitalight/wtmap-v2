'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface TowerImage {
  id: string;
  tower_id: string;
  user_id: string;
  image_url: string;
  storage_path: string;
  uploaded_at: string;
  is_primary: boolean;
  tower?: {
    name: string;
  };
  user?: {
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

export default function PhotoManagement() {
  const [images, setImages] = useState<TowerImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<TowerImage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tower_images')
        .select(`
          id,
          tower_id,
          user_id,
          image_url,
          storage_path,
          uploaded_at,
          is_primary,
          water_towers!inner (
            name
          ),
          user_profiles!inner (
            email,
            first_name,
            last_name
          )
        `)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      // Transform the data
      const transformedImages = data?.map((img: any) => ({
        id: img.id,
        tower_id: img.tower_id,
        user_id: img.user_id,
        image_url: img.image_url,
        storage_path: img.storage_path,
        uploaded_at: img.uploaded_at,
        is_primary: img.is_primary,
        tower: {
          name: img.water_towers.name,
        },
        user: {
          email: img.user_profiles.email,
          first_name: img.user_profiles.first_name,
          last_name: img.user_profiles.last_name,
        },
      })) || [];

      setImages(transformedImages);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteImage = async (image: TowerImage) => {
    if (!confirm(`Are you sure you want to delete this image of "${image.tower?.name}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('tower-images')
        .remove([image.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('tower_images')
        .delete()
        .eq('id', image.id);

      if (dbError) throw dbError;

      // Refresh the list
      await fetchImages();
      setSelectedImage(null);
      alert('Image deleted successfully');
    } catch (error: any) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatUserName = (user?: TowerImage['user']): string => {
    if (!user) return 'Unknown User';
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    } else if (user.first_name) {
      return user.first_name;
    }
    return user.email || 'Unknown User';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Photo Management</h2>
        <p className="text-gray-600 mt-1">
          Manage and moderate user-uploaded photos ({images.length} total)
        </p>
      </div>

      {images.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No photos uploaded</h3>
          <p className="mt-1 text-sm text-gray-500">Users haven't uploaded any photos yet.</p>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Preview
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tower
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {images.map((image) => (
                  <tr key={image.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <img
                        src={image.image_url}
                        alt={image.tower?.name}
                        className="h-16 w-16 object-cover rounded cursor-pointer hover:opacity-75"
                        onClick={() => setSelectedImage(image)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {image.tower?.name || 'Unknown Tower'}
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {image.tower_id.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {formatUserName(image.user)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {image.user?.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(image.uploaded_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(image.uploaded_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {image.is_primary && (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          Primary
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteImage(image)}
                        disabled={isDeleting}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Full-size image modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            onClick={() => setSelectedImage(null)}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="max-w-5xl w-full">
            <img
              src={selectedImage.image_url}
              alt={selectedImage.tower?.name || 'Water tower'}
              className="w-full h-auto max-h-[70vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="bg-white mt-4 p-6 rounded-lg" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedImage.tower?.name || 'Unknown Tower'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Uploaded by {formatUserName(selectedImage.user)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(selectedImage.uploaded_at).toLocaleString()}
                  </p>
                  {selectedImage.is_primary && (
                    <span className="inline-block mt-2 px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      Primary Image
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteImage(selectedImage)}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Image'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
