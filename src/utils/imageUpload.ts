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
  quality: 0.8, // Target 100-150kb
  format: 'webp',
};

/**
 * Converts HEIC images (including Live Photos) to JPEG
 * Live Photos are HEIC files with motion data - we extract just the still frame
 */
async function convertHeicToJpeg(file: File): Promise<Blob> {
  try {
    console.log('Converting HEIC/Live Photo to JPEG...');
    
    // Dynamically import heic2any to avoid issues with SSR
    const heic2any = (await import('heic2any')).default;
    
    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9,
    });

    // heic2any can return an array of blobs for Live Photos, take the first (still) frame
    const resultBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
    
    console.log('HEIC conversion successful:', {
      originalSize: file.size,
      convertedSize: resultBlob.size,
      type: resultBlob.type
    });
    
    return resultBlob;
  } catch (error) {
    console.error('Error converting HEIC:', error);
    throw new Error('Failed to convert image. Please try taking a new photo with Live Photo disabled, or select a different image.');
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

  console.log('Optimizing image:', {
    name: file.name,
    type: file.type,
    size: file.size,
    targetFormat: opts.format
  });

  // Convert HEIC to JPEG first if needed
  let processFile: File | Blob = file;
  if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
    console.log('Converting HEIC to JPEG...');
    processFile = await convertHeicToJpeg(file);
    console.log('HEIC converted, new size:', processFile.size);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        console.log('Image loaded:', { width: img.width, height: img.height });
        
        // Validate image dimensions
        if (img.width === 0 || img.height === 0) {
          reject(new Error('Invalid image dimensions'));
          return;
        }

        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        
        if (width > opts.maxWidth! || height > opts.maxHeight!) {
          const ratio = Math.min(
            opts.maxWidth! / width,
            opts.maxHeight! / height
          );
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
          console.log('Resizing to:', { width, height });
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

        // Convert to blob with adaptive quality to target 100-150KB
        let quality = opts.quality!;
        const targetMaxSize = 150 * 1024; // 150KB
        
        const tryConversion = (currentQuality: number): Promise<Blob> => {
          return new Promise((resolveBlob, rejectBlob) => {
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  resolveBlob(blob);
                } else {
                  rejectBlob(new Error('Failed to create blob'));
                }
              },
              `image/${opts.format}`,
              currentQuality
            );
          });
        };

        // Try conversion with quality adjustment
        const convertWithQuality = async () => {
          let blob = await tryConversion(quality);
          let attempts = 0;
          const maxAttempts = 3;

          console.log('Initial conversion:', { 
            size: blob.size, 
            sizeKB: Math.round(blob.size / 1024),
            quality 
          });

          // If blob is too large, reduce quality
          while (blob.size > targetMaxSize && quality > 0.5 && attempts < maxAttempts) {
            attempts++;
            quality = Math.max(0.5, quality - 0.1);
            console.log(`Attempt ${attempts}: Reducing quality to ${quality.toFixed(2)}`);
            blob = await tryConversion(quality);
            console.log(`New size: ${Math.round(blob.size / 1024)}KB`);
          }

          // Validate minimum size
          if (blob.size < 10240) {
            console.error('Blob too small, likely corrupt:', blob.size);
            throw new Error('Generated image is too small. This may be a Live Photo issue. Try disabling Live Photo in your camera settings.');
          }

          console.log('Final blob:', { 
            size: blob.size, 
            type: blob.type,
            sizeKB: Math.round(blob.size / 1024),
            quality: quality.toFixed(2)
          });

          return blob;
        };

        convertWithQuality()
          .then(resolve)
          .catch(reject);
      };

      img.onerror = () => {
        console.error('Failed to load image');
        reject(new Error('Failed to load image'));
      };
      
      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      console.error('Failed to read file');
      reject(new Error('Failed to read file'));
    };
    
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
 * Always returns the target format from optimization
 */
export function getFileExtension(file: File, optimized?: Blob, targetFormat: string = 'webp'): string {
  // Always use the target format for optimized images
  if (optimized) {
    return targetFormat === 'webp' ? 'webp' : 'jpg';
  }
  
  // Fallback to original file extension only if no optimization occurred
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
