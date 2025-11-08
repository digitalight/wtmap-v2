'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { clearTowersCache } from '@/hooks/useTowers';
import { clearImageCache } from './TowerImageGallery';

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
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState({ current: 0, total: 0 });
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    setIsLoading(true);
    try {
      // First, get all tower images
      const { data: imagesData, error: imagesError } = await supabase
        .from('tower_images')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (imagesError) {
        console.error('Error fetching images:', imagesError);
        throw imagesError;
      }

      if (!imagesData || imagesData.length === 0) {
        setImages([]);
        return;
      }

      // Get unique tower IDs and user IDs
      const towerIds = Array.from(new Set(imagesData.map(img => img.tower_id)));
      const userIds = Array.from(new Set(imagesData.map(img => img.user_id)));

      // Fetch tower names
      const { data: towersData } = await supabase
        .from('water_towers')
        .select('id, name')
        .in('id', towerIds);

      // Fetch user profiles
      const { data: usersData } = await supabase
        .from('user_profiles')
        .select('id, email, first_name, last_name')
        .in('id', userIds);

      // Create lookup maps
      const towersMap = new Map(towersData?.map(t => [t.id, t]) || []);
      const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);

      // Transform the data
      const transformedImages = imagesData.map((img: any) => {
        const tower = towersMap.get(img.tower_id);
        const user = usersMap.get(img.user_id);

        return {
          id: img.id,
          tower_id: img.tower_id,
          user_id: img.user_id,
          image_url: img.image_url,
          storage_path: img.storage_path,
          uploaded_at: img.uploaded_at,
          is_primary: img.is_primary,
          tower: tower ? { name: tower.name } : undefined,
          user: user ? {
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
          } : undefined,
        };
      });

      console.log('Fetched images:', transformedImages.length);
      setImages(transformedImages);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const convertImageToWebP = async (image: TowerImage): Promise<boolean> => {
    try {
      console.log(`Converting image ${image.id}:`, image.storage_path);
      
      // Download the image
      const response = await fetch(image.image_url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();
      console.log(`Downloaded blob size: ${blob.size} bytes, type: ${blob.type}`);

      // Check if blob is valid
      if (blob.size === 0) {
        throw new Error('Downloaded image is empty');
      }

      // Convert to WebP
      const img = new Image();
      const imageUrl = URL.createObjectURL(blob);
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Failed to load image for canvas conversion'));
        img.src = imageUrl;
      });

      console.log(`Image loaded: ${img.width}x${img.height}`);

      // Create canvas and convert to WebP
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Resize if necessary (max 900x900)
      if (width > 900 || height > 900) {
        const ratio = Math.min(900 / width, 900 / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to WebP blob with target quality
      const webpBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create WebP blob'));
          },
          'image/webp',
          0.8 // Target 100-150kb
        );
      });

      URL.revokeObjectURL(imageUrl);
      console.log(`WebP blob created: ${webpBlob.size} bytes`);

      // Generate new WebP filename
      const pathParts = image.storage_path.split('/');
      const oldFilename = pathParts[pathParts.length - 1];
      const newFilename = oldFilename.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      const newPath = pathParts.slice(0, -1).concat(newFilename).join('/');
      console.log(`New path: ${newPath}`);

      // Upload the new WebP image
      const { error: uploadError } = await supabase.storage
        .from('tower-images')
        .upload(newPath, webpBlob, {
          contentType: 'image/webp',
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }
      console.log('Upload successful');

      // Get the new public URL (without cache-busting for storage)
      const { data: urlData } = supabase.storage
        .from('tower-images')
        .getPublicUrl(newPath);

      console.log(`New public URL: ${urlData.publicUrl}`);

      // Update database record (store clean URL without cache-busting)
      const { data: updateData, error: updateError } = await supabase
        .from('tower_images')
        .update({
          image_url: urlData.publicUrl,
          storage_path: newPath,
        })
        .eq('id', image.id)
        .select();

      if (updateError) {
        console.error('Database update error:', updateError);
        throw updateError;
      }
      console.log('Database updated:', updateData);

      // Delete old image from storage
      const { error: deleteError } = await supabase.storage
        .from('tower-images')
        .remove([image.storage_path]);

      if (deleteError) {
        console.warn('Failed to delete old image:', deleteError);
      } else {
        console.log('Old image deleted');
      }

      return true;
    } catch (error) {
      console.error(`Error converting image ${image.id}:`, error);
      return false;
    }
  };

  const handleBulkConversion = async () => {
    // Find all non-WebP images
    const nonWebpImages = images.filter(img => 
      !img.storage_path.toLowerCase().endsWith('.webp') &&
      (img.storage_path.toLowerCase().endsWith('.jpg') ||
       img.storage_path.toLowerCase().endsWith('.jpeg') ||
       img.storage_path.toLowerCase().endsWith('.png'))
    );

    if (nonWebpImages.length === 0) {
      alert('All images are already in WebP format!');
      return;
    }

    if (!confirm(`Convert ${nonWebpImages.length} images to WebP format? This may take a few minutes.`)) {
      return;
    }

    setIsConverting(true);
    setConversionProgress({ current: 0, total: nonWebpImages.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < nonWebpImages.length; i++) {
      const image = nonWebpImages[i];
      setConversionProgress({ current: i + 1, total: nonWebpImages.length });
      
      const success = await convertImageToWebP(image);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    setIsConverting(false);
    setConversionProgress({ current: 0, total: 0 });
    
    alert(`Conversion complete!\n✅ Success: ${successCount}\n❌ Failed: ${failCount}`);
    
    // Clear all image caches to ensure updated images show everywhere
    clearTowersCache();
    clearImageCache();
    
    // Refresh the list
    await fetchImages();
  };

  const handleDeleteCorruptImages = async () => {
    if (!confirm('This will attempt to delete all images that appear grey/corrupt. Continue?')) {
      return;
    }

    setIsDeleting(true);
    let deletedCount = 0;
    let failedCount = 0;

    try {
      // Try to identify potentially corrupt images by attempting to load them
      for (const image of images) {
        try {
          // Test if image loads
          const response = await fetch(image.image_url, { method: 'HEAD' });
          if (!response.ok || response.headers.get('content-length') === '0') {
            // Image appears corrupt, delete from database
            const { error } = await supabase
              .from('tower_images')
              .delete()
              .eq('id', image.id);

            if (error) {
              console.error('Failed to delete corrupt image:', image.id, error);
              failedCount++;
            } else {
              console.log('Deleted corrupt image:', image.id);
              deletedCount++;
            }
          }
        } catch (err) {
          // If fetch fails, image is likely corrupt
          const { error } = await supabase
            .from('tower_images')
            .delete()
            .eq('id', image.id);

          if (error) {
            console.error('Failed to delete corrupt image:', image.id, error);
            failedCount++;
          } else {
            console.log('Deleted corrupt image:', image.id);
            deletedCount++;
          }
        }
      }

      alert(`Cleanup complete!\n✅ Deleted: ${deletedCount}\n❌ Failed: ${failedCount}`);
      
      // Clear caches and refresh
      clearTowersCache();
      clearImageCache();
      await fetchImages();
    } catch (error) {
      console.error('Error during cleanup:', error);
      alert('Cleanup failed: ' + (error as Error).message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteImage = async (image: TowerImage) => {
    if (!confirm(`Are you sure you want to delete this image of "${image.tower?.name}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      console.log('Deleting image:', image.id, image.storage_path);
      
      // Try to delete from storage first (may fail for corrupt images)
      const { error: storageError } = await supabase.storage
        .from('tower-images')
        .remove([image.storage_path]);

      if (storageError) {
        console.warn('Storage deletion failed (may not exist):', storageError);
        // Continue anyway - we still want to clean up the database
      } else {
        console.log('Storage deletion successful');
      }

      // Delete from database (this should always work)
      const { error: dbError } = await supabase
        .from('tower_images')
        .delete()
        .eq('id', image.id);

      if (dbError) {
        console.error('Database deletion failed:', dbError);
        throw dbError;
      }

      console.log('Database deletion successful');

      // Clear caches
      clearTowersCache();
      clearImageCache();

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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Photo Management</h2>
            <p className="text-gray-600 mt-1">
              Manage and moderate user-uploaded photos ({images.length} total)
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDeleteCorruptImages}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Cleaning...
                </>
              ) : (
                <>
                  🗑️ Delete Corrupt
                </>
              )}
            </button>
            <button
              onClick={handleBulkConversion}
              disabled={isConverting || isDeleting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isConverting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Converting {conversionProgress.current}/{conversionProgress.total}...
                </>
              ) : (
                <>
                  🔄 Convert to WebP
                </>
              )}
            </button>
          </div>
        </div>
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
                    Format
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
                      {(() => {
                        const ext = image.storage_path.split('.').pop()?.toUpperCase() || 'UNKNOWN';
                        const isWebP = ext === 'WEBP';
                        return (
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            isWebP 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {ext}
                          </span>
                        );
                      })()}
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
