/**
 * Image processing utilities for compression and square cropping
 */

export interface ImageProcessingOptions {
  maxSize?: number; // Maximum width/height for the square
  quality?: number; // JPEG quality (0-1)
  format?: 'jpeg' | 'png' | 'webp';
}

/**
 * Compresses and crops an image to a square format
 * @param file - The original image file
 * @param options - Processing options
 * @returns Promise<File> - The processed image file
 */
export const compressAndSquareImage = async (
  file: File,
  options: ImageProcessingOptions = {}
): Promise<File> => {
  const {
    maxSize = 800,
    quality = 0.8,
    format = 'jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      // Calculate dimensions for square crop
      const { width, height } = img;
      const size = Math.min(width, height);
      const offsetX = (width - size) / 2;
      const offsetY = (height - size) / 2;

      // Set canvas size to desired output size
      const outputSize = Math.min(size, maxSize);
      canvas.width = outputSize;
      canvas.height = outputSize;

      // Draw the cropped and resized image
      ctx.drawImage(
        img,
        offsetX, offsetY, size, size, // Source rectangle (square crop)
        0, 0, outputSize, outputSize  // Destination rectangle
      );

      // Convert to blob with compression
      const mimeType = format === 'png' ? 'image/png' : 
                      format === 'webp' ? 'image/webp' : 'image/jpeg';
      
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }

          // Create a new File object with the processed image
          const processedFile = new File(
            [blob],
            `compressed_${file.name.replace(/\.[^/.]+$/, '')}.${format}`,
            {
              type: mimeType,
              lastModified: Date.now()
            }
          );

          resolve(processedFile);
        },
        mimeType,
        format === 'png' ? undefined : quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load the image
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Gets the dimensions of an image file
 * @param file - The image file
 * @returns Promise<{width: number, height: number}>
 */
export const getImageDimensions = (file: File): Promise<{width: number, height: number}> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
      URL.revokeObjectURL(img.src);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Formats file size for display
 * @param bytes - File size in bytes
 * @returns Formatted string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};