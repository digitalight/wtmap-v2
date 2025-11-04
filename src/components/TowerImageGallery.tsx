'use client';

import React, { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface TowerImage {
  id: string;
  tower_id: string;
  user_id: string;
  image_url: string;
  storage_path: string;
  is_primary: boolean;
  uploaded_at: string;
}

interface TowerImageGalleryProps {
  towerId: string;
  currentUserId?: string;
}

export default function TowerImageGallery({ towerId, currentUserId }: TowerImageGalleryProps) {
  const [images, setImages] = useState<TowerImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchImages();
  }, [towerId]);

  const fetchImages = async () => {
    try {
      const { data, error } = await supabase
        .from('tower_images')
        .select('*')
        .eq('tower_id', towerId)
        .order('is_primary', { ascending: false })
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
    }
  };

  const setPrimaryImage = async (imageId: string) => {
    try {
      const { error } = await supabase
        .from('tower_images')
        .update({ is_primary: true })
        .eq('id', imageId);

      if (error) throw error;
      fetchImages(); // Refresh to show updated primary
    } catch (error) {
      console.error('Error setting primary image:', error);
    }
  };

  const deleteImage = async (image: TowerImage) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

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

      fetchImages(); // Refresh list
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm">No photos yet</p>
        <p className="text-xs mt-1">Be the first to upload a photo!</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
        {images.map((image) => (
          <div key={image.id} className="relative group">
            <div
              className="relative aspect-square rounded-lg overflow-hidden cursor-pointer bg-gray-100"
              onClick={() => setSelectedImage(image.image_url)}
            >
              <img
                src={image.image_url}
                alt="Tower"
                className="w-full h-full object-cover hover:scale-105 transition-transform"
              />
              
              {image.is_primary && (
                <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                  Main Photo
                </div>
              )}

              {/* Overlay with actions */}
              {currentUserId === image.user_id && (
                <>
                  {/* Set Main button - center on hover */}
                  {!image.is_primary && (
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPrimaryImage(image.id);
                        }}
                        className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium"
                        title="Set as main photo"
                      >
                        Set Main
                      </button>
                    </div>
                  )}
                  {/* Delete button - bottom right */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteImage(image);
                    }}
                    className="absolute bottom-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    title="Delete photo"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-[9999] flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setSelectedImage(null)}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={selectedImage}
            alt="Tower full size"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
