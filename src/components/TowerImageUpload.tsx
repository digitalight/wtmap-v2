'use client';

import React, { useState, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { optimizeImage, validateImageFile, generateFileName, getFileExtension } from '@/utils/imageUpload';
import { clearTowersCache } from '@/hooks/useTowers';
import { clearImageCache } from './TowerImageGallery';

interface TowerImageUploadProps {
  towerId: string;
  userId: string;
  onImageUploaded?: (imageUrl: string) => void;
}

export default function TowerImageUpload({ towerId, userId, onImageUploaded }: TowerImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClientComponentClient();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset states
    setError(null);
    setPreview(null);

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload image
    await uploadImage(file);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      // Optimize image - always convert to WebP
      const optimized = await optimizeImage(file, {
        maxWidth: 900,
        maxHeight: 900,
        quality: 0.8, // Target 100-150kb
        format: 'webp',
      });

      // Generate file name - always use webp extension
      const extension = getFileExtension(file, optimized, 'webp');
      const filePath = generateFileName(towerId, userId, extension);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('tower-images')
        .upload(filePath, optimized, {
          contentType: `image/${extension}`,
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('tower-images')
        .getPublicUrl(filePath);

      const imageUrl = urlData.publicUrl;

      // Save to database
      const { error: dbError } = await supabase
        .from('tower_images')
        .insert({
          tower_id: towerId,
          user_id: userId,
          image_url: imageUrl,
          storage_path: filePath,
          is_primary: false, // User can set as primary later
        });

      if (dbError) throw dbError;

      // Clear caches so new image shows up immediately
      clearTowersCache();
      clearImageCache();

      // Callback
      if (onImageUploaded) {
        onImageUploaded(imageUrl);
      }

      // Reset preview after successful upload
      setTimeout(() => {
        setPreview(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 1000);

    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Tower Photo
        </label>
        
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,.heic"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
            id="tower-image-upload"
          />
          
          <label
            htmlFor="tower-image-upload"
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed
              ${uploading ? 'border-gray-300 bg-gray-50 cursor-not-allowed' : 'border-blue-300 bg-blue-50 hover:bg-blue-100 cursor-pointer'}
              transition-colors
            `}
          >
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm font-medium text-blue-700">
              {uploading ? 'Uploading...' : 'Choose Photo'}
            </span>
          </label>

          {uploading && (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600">Optimizing and uploading...</span>
            </div>
          )}
        </div>

        <p className="mt-1 text-xs text-gray-500">
          JPEG, PNG, WebP, or HEIC • Max 10MB • Will be optimized automatically
        </p>
      </div>

      {preview && (
        <div className="relative rounded-lg overflow-hidden border-2 border-green-200 bg-green-50 p-2">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover rounded"
          />
          {uploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                <p className="text-sm">Uploading...</p>
              </div>
            </div>
          )}
          {!uploading && (
            <div className="absolute top-4 right-4">
              <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Uploaded
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
