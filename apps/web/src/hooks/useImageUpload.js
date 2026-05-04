import { useState } from 'react';
import imageCompression from 'browser-image-compression';
import { imageApi } from '../services/imageApi';

export function useImageUpload() {
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [compressedFile, setCompressedFile] = useState(null);
  const [originalFile, setOriginalFile] = useState(null);

  const compressImage = async (file, customOptions = {}) => {
    setIsCompressing(true);
    setError(null);
    setOriginalFile(file);
    setProgress(10); // Start progress

    const options = {
      maxSizeMB: customOptions.maxSizeMB || 1, // Max size in MB
      maxWidthOrHeight: customOptions.maxWidthOrHeight || 1024,
      useWebWorker: true,
      onProgress: (p) => {
        // Compress progress counts for first 50%
        setProgress(10 + (p * 0.4));
      }
    };

    try {
      const compressed = await imageCompression(file, options);
      setCompressedFile(compressed);
      
      // Create local preview
      const previewUrl = URL.createObjectURL(compressed);
      setPreview(previewUrl);
      
      setProgress(50); // Finish compression
      return compressed;
    } catch (err) {
      console.error('Image compression failed:', err);
      setError('Failed to compress image.');
      throw err;
    } finally {
      setIsCompressing(false);
    }
  };

  const uploadImage = async (type = 'chat') => {
    if (!compressedFile) return null;
    
    setIsUploading(true);
    setProgress(50); // Start uploading phase

    try {
      // Since fetch or standard axios upload doesn't have native progress in simple wrap,
      // we'll just simulate a quick jump to 90
      setProgress(90);
      const result = await imageApi.uploadImage(compressedFile, type);
      setProgress(100);
      return result; // Usually returns { url, fileName, ... }
    } catch (err) {
      console.error('Image upload failed:', err);
      setError('Failed to upload image.');
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => {
    setIsCompressing(false);
    setIsUploading(false);
    setProgress(0);
    if (preview) {
      URL.revokeObjectURL(preview); // cleanup
    }
    setPreview(null);
    setError(null);
    setCompressedFile(null);
    setOriginalFile(null);
  };

  return {
    compressImage,
    uploadImage,
    reset,
    isCompressing,
    isUploading,
    progress,
    preview,
    error,
    compressedFile,
    originalFile
  };
}
