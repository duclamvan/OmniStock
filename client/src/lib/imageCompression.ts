/**
 * Client-side image compression utility
 * Compresses images using canvas API for faster uploads and storage
 */

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp';
}

/**
 * Compress an image file to reduce size while maintaining quality
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Promise with compressed image as base64 data URL
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<string> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
    format = 'jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;
          
          if (width > height) {
            width = Math.min(width, maxWidth);
            height = width / aspectRatio;
          } else {
            height = Math.min(height, maxHeight);
            width = height * aspectRatio;
          }
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
        
        // Use better image smoothing for quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw the image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to compressed format
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            
            // Convert blob to base64
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve(reader.result as string);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          },
          `image/${format}`,
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Process multiple images in parallel with compression
 * @param files - Array of image files to process
 * @param options - Compression options
 * @param onProgress - Optional callback for progress updates
 * @returns Promise with array of compressed images as base64 data URLs
 */
export async function compressImagesInParallel(
  files: File[],
  options: CompressionOptions = {},
  onProgress?: (processed: number, total: number) => void
): Promise<string[]> {
  let processedCount = 0;
  
  const compressionPromises = files.map(async (file) => {
    try {
      const compressed = await compressImage(file, options);
      processedCount++;
      onProgress?.(processedCount, files.length);
      return compressed;
    } catch (error) {
      console.error('Failed to compress image:', file.name, error);
      // Return original if compression fails
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  });
  
  return Promise.all(compressionPromises);
}

/**
 * Create an object URL for immediate preview
 * @param file - The image file
 * @returns Object URL for immediate preview
 */
export function createImagePreview(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revoke object URL to free memory
 * @param url - The object URL to revoke
 */
export function revokeImagePreview(url: string): void {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

/**
 * Calculate estimated size reduction
 * @param originalSize - Original file size in bytes
 * @param compressedDataUrl - Compressed image as base64 data URL
 * @returns Size reduction percentage
 */
export function calculateSizeReduction(
  originalSize: number,
  compressedDataUrl: string
): number {
  // Base64 is roughly 4/3 the size of binary
  const base64Size = (compressedDataUrl.length - compressedDataUrl.indexOf(',') - 1) * 0.75;
  const reduction = ((originalSize - base64Size) / originalSize) * 100;
  return Math.max(0, Math.round(reduction));
}