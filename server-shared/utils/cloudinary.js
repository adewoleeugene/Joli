const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload file buffer to Cloudinary
 * @param {Buffer} fileBuffer - File buffer to upload
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
const uploadToCloudinary = (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      resource_type: 'auto',
      folder: 'joli',
      ...options
    };

    cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    ).end(fileBuffer);
  });
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Public ID of the file to delete
 * @param {string} resourceType - Type of resource (image, video, raw)
 * @returns {Promise<Object>} Deletion result
 */
const deleteFromCloudinary = (publicId, resourceType = 'image') => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(
      publicId,
      { resource_type: resourceType },
      (error, result) => {
        if (error) {
          console.error('Cloudinary delete error:', error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
  });
};

/**
 * Generate optimized URL for image
 * @param {string} publicId - Public ID of the image
 * @param {Object} transformations - Image transformations
 * @returns {string} Optimized image URL
 */
const getOptimizedImageUrl = (publicId, transformations = {}) => {
  const defaultTransformations = {
    quality: 'auto',
    fetch_format: 'auto',
    ...transformations
  };

  return cloudinary.url(publicId, defaultTransformations);
};

/**
 * Generate thumbnail URL
 * @param {string} publicId - Public ID of the image
 * @param {number} width - Thumbnail width
 * @param {number} height - Thumbnail height
 * @returns {string} Thumbnail URL
 */
const getThumbnailUrl = (publicId, width = 150, height = 150) => {
  return cloudinary.url(publicId, {
    width,
    height,
    crop: 'fill',
    quality: 'auto',
    fetch_format: 'auto'
  });
};

/**
 * Upload multiple files
 * @param {Array<Buffer>} fileBuffers - Array of file buffers
 * @param {Object} options - Upload options
 * @returns {Promise<Array>} Array of upload results
 */
const uploadMultipleFiles = async (fileBuffers, options = {}) => {
  try {
    const uploadPromises = fileBuffers.map(buffer => 
      uploadToCloudinary(buffer, options)
    );
    
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Multiple file upload error:', error);
    throw error;
  }
};

/**
 * Validate file type
 * @param {string} mimetype - File mimetype
 * @param {Array<string>} allowedTypes - Allowed mimetypes
 * @returns {boolean} Is valid file type
 */
const isValidFileType = (mimetype, allowedTypes = []) => {
  if (allowedTypes.length === 0) {
    // Default allowed types
    allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'audio/mpeg',
      'audio/wav',
      'audio/mp3'
    ];
  }
  
  return allowedTypes.includes(mimetype);
};

/**
 * Get file size in MB
 * @param {number} bytes - File size in bytes
 * @returns {number} File size in MB
 */
const getFileSizeInMB = (bytes) => {
  return bytes / (1024 * 1024);
};

/**
 * Validate file size
 * @param {number} fileSize - File size in bytes
 * @param {number} maxSizeMB - Maximum allowed size in MB
 * @returns {boolean} Is valid file size
 */
const isValidFileSize = (fileSize, maxSizeMB = 10) => {
  return getFileSizeInMB(fileSize) <= maxSizeMB;
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  deleteFromCloudinary,
  getOptimizedImageUrl,
  getThumbnailUrl,
  uploadMultipleFiles,
  isValidFileType,
  getFileSizeInMB,
  isValidFileSize
};