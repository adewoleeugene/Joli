import React, { useState, useEffect, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { compressAndSquareImage, formatFileSize } from '../../utils/imageUtils';

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  folderDefault: string;
}

interface ImageUploadProps {
  value?: string;
  onChange: (imageUrl: string) => void;
  placeholder?: string;
  className?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  placeholder = "Add an image to set your game apart! Images will be automatically compressed and cropped to a square format. We recommend JPG or PNG up to 10MB.",
  className = ""
}) => {
  const [cloudConfig, setCloudConfig] = useState<CloudinaryConfig | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Fetch Cloudinary config
    const fetchConfig = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_ORGANIZER_API_URL || 'http://localhost:5002'}/api/media/config`);
        if (response.ok) {
          const config = await response.json();
          setCloudConfig(config);
        }
      } catch (error) {
        console.error('Failed to fetch Cloudinary config:', error);
      }
    };

    fetchConfig();
  }, []);

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (10MB before compression)
    if (file.size > 10000000) {
      toast.error('File size must be less than 10MB');
      return;
    }

    if (!cloudConfig) {
      toast.error('Upload configuration not available');
      return;
    }

    setIsUploading(true);

    try {
      // Show processing message
      toast.loading('Processing image...', { id: 'image-processing' });
      
      // Compress and square the image
      const processedFile = await compressAndSquareImage(file, {
        maxSize: 800,
        quality: 0.85,
        format: 'jpeg'
      });
      
      // Show compression results
      const originalSize = formatFileSize(file.size);
      const compressedSize = formatFileSize(processedFile.size);
      toast.success(`Image processed: ${originalSize} → ${compressedSize}`, { id: 'image-processing' });

      // Prepare signature endpoint
      const signatureEndpoint = `${import.meta.env.VITE_ORGANIZER_API_URL || 'http://localhost:5002'}/api/media/sign-upload`;
      
      // Create form data for upload
      const formData = new FormData();
      formData.append('file', processedFile);
      formData.append('folder', `${cloudConfig.folderDefault}/games`);
      
      // Get signature
      const timestamp = Math.round(new Date().getTime() / 1000);
      const paramsToSign = {
        timestamp,
        folder: `${cloudConfig.folderDefault}/games`
      };
      
      const signatureResponse = await fetch(signatureEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paramsToSign)
      });
      
      if (!signatureResponse.ok) {
        throw new Error('Failed to get upload signature');
      }
      
      const { signature } = await signatureResponse.json();
      
      // Add signature and other required fields to form data
      formData.append('api_key', cloudConfig.apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      
      // Upload to Cloudinary
      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudConfig.cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }
      
      const result = await uploadResponse.json();
      onChange(result.secure_url);
      toast.success('Image uploaded successfully!');
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Image upload failed');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = () => {
    onChange('');
    toast.success('Image removed');
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-base font-semibold text-foreground">
        Game Image
      </label>
      
      {/* Hidden file input - shared by both states */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {value ? (
        <div className="flex items-start gap-4">
          {/* Preview Area */}
          <div className="relative group w-32 h-32">
            <div className="relative w-full h-full bg-muted rounded-lg overflow-hidden border border-border">
              <img
                src={value}
                alt="Game preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                <button
                  type="button"
                  onClick={removeImage}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Upload Button and Description */}
          <div className="flex-1">
            <button
              type="button"
              onClick={handleButtonClick}
              disabled={isUploading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <Upload className="w-4 h-4" />
              Change Image
            </button>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {placeholder}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-4">
          {/* Preview Area */}
          <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border">
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
          </div>
          
          {/* Upload Button and Description */}
          <div className="flex-1">
            <button
              type="button"
              onClick={handleButtonClick}
              disabled={isUploading || !cloudConfig}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Add an image
                </>
              )}
            </button>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">
              {placeholder}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;