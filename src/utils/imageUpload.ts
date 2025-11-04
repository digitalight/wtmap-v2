/**
 * Image Upload Utilities
 * Handles image optimization and upload to Supabase Storage
 */

export interface ImageUploadOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp';
}

const DEFAULT_OPTIONS: ImageUploadOptions = {
  maxWidth: 900,
  maxHeight: 900,
  quality: 0.75,
  format: 'webp',
};

/**
 * Converts HEIC images to JPEG
 */
async function convertHeicToJpeg(file: File): Promise<Blob> {
  try {
    // Dynamically import heic2any to avoid issues with SSR
    const heic2any = (await import('heic2any')).default;
    
    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9,
    });

    // heic2any can return an array of blobs, so handle both cases
    return Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
  } catch (error) {
    console.error('Error converting HEIC:', error);
    throw new Error('Failed to convert HEIC image. Please try a different image.');
  }
}

/**
 * Compresses and resizes an image file
 */
export async function optimizeImage(
  file: File,
  options: ImageUploadOptions = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Convert HEIC to JPEG first if needed
  let processFile: File | Blob = file;
  if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
    processFile = await convertHeicToJpeg(file);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        
        if (width > opts.maxWidth! || height > opts.maxHeight!) {
          const ratio = Math.min(
            opts.maxWidth! / width,
            opts.maxHeight! / height
          );
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          `image/${opts.format}`,
          opts.quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(processFile);
  });
}

/**
 * Validates image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
  const fileName = file.name.toLowerCase();
  const isHeic = fileName.endsWith('.heic') || fileName.endsWith('.heif');
  
  if (!validTypes.includes(file.type) && !isHeic) {
    return {
      valid: false,
      error: 'Please upload a JPEG, PNG, WebP, or HEIC image',
    };
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Image must be smaller than 10MB',
    };
  }

  return { valid: true };
}

/**
 * Generates a unique file name for storage
 */
export function generateFileName(towerId: string, userId: string, extension: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `towers/${towerId}/${userId}_${timestamp}_${random}.${extension}`;
}

/**
 * Gets the file extension from a file name or blob type
 */
export function getFileExtension(file: File, optimized?: Blob): string {
  if (optimized?.type === 'image/webp') return 'webp';
  if (optimized?.type === 'image/jpeg') return 'jpg';
  
  // Fallback to original file extension
  const parts = file.name.split('.');
  return parts[parts.length - 1].toLowerCase();
}

/**
 * Creates a thumbnail from an image
 */
export async function createThumbnail(
  file: File,
  size: number = 200
): Promise<Blob> {
  return optimizeImage(file, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.8,
    format: 'jpeg',
  });
}
