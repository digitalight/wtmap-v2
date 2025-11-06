'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Navigation from '@/components/Navigation';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface TowerImage {
  id: string;
  tower_id: string;
  image_url: string;
  uploaded_at: string;
  tower?: {
    name: string;
    county_id?: number;
  };
  county?: {
    name: string;
  };
}

export default function GalleryPage() {
  const [images, setImages] = useState<TowerImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<TowerImage | null>(null);
  const router = useRouter();
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
          image_url,
          uploaded_at,
          water_towers!inner (
            name,
            county_id,
            counties (
              name
            )
          )
        `)
        .order('uploaded_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Transform the data to flatten the structure
      const transformedImages = data?.map((img: any) => ({
        id: img.id,
        tower_id: img.tower_id,
        image_url: img.image_url,
        uploaded_at: img.uploaded_at,
        tower: {
          name: img.water_towers.name,
          county_id: img.water_towers.county_id,
        },
        county: img.water_towers.counties ? {
          name: img.water_towers.counties.name
        } : undefined,
      })) || [];

      setImages(transformedImages);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageClick = (towerId: string) => {
    router.push(`/dashboard?towerId=${towerId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Photo Gallery</h1>
          <p className="text-gray-600 mt-2">Latest photos uploaded by our community</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No photos yet</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by uploading photos to water towers!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {images.map((image) => (
              <div 
                key={image.id} 
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer group"
              >
                <div 
                  className="relative aspect-square overflow-hidden bg-gray-100"
                  onClick={() => setSelectedImage(image)}
                >
                  <img
                    src={image.image_url}
                    alt={image.tower?.name || 'Water tower'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div 
                  className="p-4 hover:bg-gray-50 transition-colors"
                  onClick={() => handleImageClick(image.tower_id)}
                >
                  <h3 className="font-semibold text-gray-900 truncate">
                    {image.tower?.name || 'Unknown Tower'}
                  </h3>
                  <p className="text-sm text-gray-600 truncate">
                    {image.county?.name || 'Unknown County'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(image.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full-size image modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
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
          <div className="max-w-5xl w-full">
            <img
              src={selectedImage.image_url}
              alt={selectedImage.tower?.name || 'Water tower'}
              className="w-full h-auto max-h-[80vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <div 
              className="bg-white mt-4 p-4 rounded-lg cursor-pointer hover:bg-gray-50"
              onClick={(e) => {
                e.stopPropagation();
                handleImageClick(selectedImage.tower_id);
              }}
            >
              <h3 className="font-semibold text-gray-900">
                {selectedImage.tower?.name || 'Unknown Tower'}
              </h3>
              <p className="text-sm text-gray-600">
                {selectedImage.county?.name || 'Unknown County'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Uploaded {new Date(selectedImage.uploaded_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
