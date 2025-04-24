'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import useClosetStore from '@/lib/store/closetStore';
import { fileToBase64, generateThumbnail, extractDominantColors } from '@/lib/utils/imageUtils';

/**
 * Component for uploading new clothing items with background removal
 * Supports bulk image uploads with Python-based background removal
 * and individual attribute configuration per item
 */
export default function ClothingUpload() {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [currentStep, setCurrentStep] = useState('upload'); // 'upload', 'camera', or 'details'
  const [processedImages, setProcessedImages] = useState([]);
  const [itemsData, setItemsData] = useState([]);
  const [progress, setProgress] = useState(0);
  const [processStage, setProcessStage] = useState('');
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' for rear camera, 'user' for selfie

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const { addClothingItem, setLoading } = useClosetStore();

  // Initialize itemsData when processedImages changes
  useEffect(() => {
    if (processedImages.length > 0) {
      // Initialize form data for each image with default values
      const newItemsData = processedImages.map((_, index) => ({
        category: '',
        description: `Item ${index + 1}`,
        color: '#000000',
        season: 'all',
      }));
      setItemsData(newItemsData);
      setCurrentItemIndex(0);
    }
  }, [processedImages]);

  /**
   * Initialize camera
   */
  const initializeCamera = async () => {
    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      setError(null);
      setCameraActive(true);
      setCurrentStep('camera');

      // Get access to camera
      const constraints = {
        video: { 
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Could not access camera. Please check permissions and try again.');
      setCameraActive(false);
    }
  };

  /**
   * Switch between front and rear camera
   */
  const switchCamera = async () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    await initializeCamera();
  };

  /**
   * Capture a photo from the camera
   */
  const capturePhoto = async () => {
    if (!videoRef.current || !cameraActive) return;

    try {
      // Create a canvas element to capture the image
      const canvas = document.createElement('canvas');
      const videoWidth = videoRef.current.videoWidth;
      const videoHeight = videoRef.current.videoHeight;
      
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      
      // Draw the current video frame to the canvas
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to data URL (base64 string)
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      
      // Convert the data URL to a File object for compatibility with existing code
      const fetchRes = await fetch(photoDataUrl);
      const blob = await fetchRes.blob();
      const file = new File([blob], `camera-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });

      // Add the file to the files array and the photo to the preview array
      setFiles(prev => [...prev, file]);
      setPreviews(prev => [...prev, photoDataUrl]);
      setCapturedPhotos(prev => [...prev, photoDataUrl]);
      
      // Extract dominant color
      const colors = await extractDominantColors(photoDataUrl);
      
      // Update initial data for the captured photo
      setItemsData(prev => [
        ...prev, 
        {
          category: '',
          description: `Item ${prev.length + 1}`,
          color: colors?.[0] || '#000000',
          season: 'all',
        }
      ]);
      
    } catch (err) {
      console.error('Photo capture error:', err);
      setError('Failed to capture photo. Please try again.');
    }
  };

  /**
   * Stop the camera stream and go back to upload step
   */
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
    setCurrentStep('upload');
  };

  /**
   * Cleanup camera stream when component unmounts
   */
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  /**
   * Handle multiple file selection and generate previews
   */
  const handleFileSelect = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles || selectedFiles.length === 0) return;
    
    try {
      // Reset states
      setFiles(selectedFiles);
      setError(null);
      setSuccess(null);
      
      // Generate previews for all files
      setProcessStage('Generating previews...');
      setProgress(10);
      
      const previewPromises = selectedFiles.map(file => fileToBase64(file));
      const previewResults = await Promise.all(previewPromises);
      setPreviews(previewResults);
      setProgress(20);
      
      // Extract dominant colors for each preview
      setProcessStage('Analyzing colors...');
      
      const colorPromises = previewResults.map(preview => extractDominantColors(preview));
      const colorResults = await Promise.all(colorPromises);
      
      // Update initial colors for each item
      const initialItemsData = previewResults.map((_, index) => ({
        category: '',
        description: `Item ${index + 1}`,
        color: colorResults[index]?.[0] || '#000000',
        season: 'all',
      }));
      setItemsData(initialItemsData);
      setProgress(0);
      setProcessStage('');
      
    } catch (err) {
      setError('Failed to process images. Please try again.');
      console.error(err);
      setProgress(0);
      setProcessStage('');
    }
  };

  /**
   * Remove a specific file from the selection
   */
  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
    setItemsData(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * Remove a processed image and its data
   */
  const removeProcessedImage = (index) => {
    setProcessedImages(prev => prev.filter((_, i) => i !== index));
    setItemsData(prev => prev.filter((_, i) => i !== index));
    
    // Adjust current index if needed
    if (currentItemIndex >= index && currentItemIndex > 0) {
      setCurrentItemIndex(prev => prev - 1);
    } else if (processedImages.length <= 1) {
      // If removing the last item, go back to upload step
      setCurrentStep('upload');
    }
  };

  /**
   * Process the selected images with the Python-based background removal
   */
  const processImages = async () => {
    if (files.length === 0) {
      setError('Please select at least one image.');
      return;
    }
    
    try {
      setIsProcessing(true);
      setLoading('upload', true);
      setProgress(10);
      setProcessStage('Preparing images...');
      setError(null);
      setSuccess(null);
      
      // Create FormData with all files
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      
      // Call the Python-based background removal API
      setProcessStage('Removing backgrounds...');
      setProgress(20);
      
      const response = await fetch('/api/rembg-python', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to remove backgrounds');
      }
      
      setProgress(80);
      setProcessStage('Finalizing...');
      
      const result = await response.json();
      
      if (!result.success || !result.images || result.images.length === 0) {
        throw new Error('Background removal failed');
      }
      
      // Store processed images and move to details step
      setProcessedImages(result.images);
      setCurrentStep('details');
      
      // Record processing statistics
      console.log('Processing stats:', result.processingStats);
      
      // If there were any errors processing some images, show a warning
      if (result.errors) {
        setError(`Some images couldn't be processed: ${result.errors.join(', ')}`);
      } else {
        setError(null);
      }
      
      setProgress(100);
      setProcessStage('Complete!');
      
      // Reset progress after a short delay
      setTimeout(() => {
        setProgress(0);
        setProcessStage('');
      }, 1500);
      
    } catch (err) {
      setError(`Failed to process images: ${err.message}`);
      console.error(err);
      setProgress(0);
      setProcessStage('');
    } finally {
      setIsProcessing(false);
      setLoading('upload', false);
    }
  };

  /**
   * Update form data for a specific item
   */
  const handleItemChange = (index, name, value) => {
    setItemsData(prev => {
      const newData = [...prev];
      newData[index] = {
        ...newData[index],
        [name]: value
      };
      return newData;
    });
  };

  /**
   * Save the processed images to the closet
   */
  const saveToCloset = async () => {
    if (processedImages.length === 0) {
      setError('No processed images to save.');
      return;
    }
    
    // Check if all items have categories
    const missingCategories = itemsData.some(item => !item.category);
    if (missingCategories) {
      setError('Please select a category for all items.');
      return;
    }
    
    try {
      setIsProcessing(true);
      setLoading('upload', true);
      setProgress(10);
      setProcessStage('Generating thumbnails...');
      setError(null);
      
      // Generate thumbnails for all processed images
      const thumbnailPromises = processedImages.map(image => 
        generateThumbnail(image, 200, 200)
      );
      const thumbnails = await Promise.all(thumbnailPromises);
      
      setProgress(40);
      setProcessStage('Saving to closet...');
      
      // Add each item to the closet with its unique data
      const savePromises = processedImages.map((image, index) => {
        return addClothingItem({
          ...itemsData[index],
          image: image,
          thumbnail: thumbnails[index],
          addedAt: new Date().toISOString()
        });
      });
      
      await Promise.all(savePromises);
      setProgress(80);
      setProcessStage('Finalizing...');
      
      // Reset form
      setFiles([]);
      setPreviews([]);
      setProcessedImages([]);
      setItemsData([]);
      setCurrentStep('upload');
      setCurrentItemIndex(0);
      setError(null);
      
      // Set success message
      setSuccess(`Successfully added ${savePromises.length} item${savePromises.length > 1 ? 's' : ''} to your closet.`);
      
      setProgress(100);
      setProcessStage('Complete!');
      
      // Reset progress after a short delay
      setTimeout(() => {
        setProgress(0);
        setProcessStage('');
      }, 1500);
      
    } catch (err) {
      setError(`Failed to save items: ${err.message}`);
      console.error(err);
      setProgress(0);
      setProcessStage('');
    } finally {
      setIsProcessing(false);
      setLoading('upload', false);
    }
  };

  /**
   * Cancel the current operation and return to upload step
   */
  const handleCancel = () => {
    setCurrentStep('upload');
    setProcessedImages([]);
    setItemsData([]);
    setCurrentItemIndex(0);
  };

  /**
   * Navigate to previous/next item in detail mode
   */
  const navigateItems = (direction) => {
    if (direction === 'prev' && currentItemIndex > 0) {
      setCurrentItemIndex(prev => prev - 1);
    } else if (direction === 'next' && currentItemIndex < processedImages.length - 1) {
      setCurrentItemIndex(prev => prev + 1);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Page header */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
          Add to Your Collection
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Upload images of your clothing items or use your camera to capture photos. We will automatically remove the backgrounds.
        </p>
      </div>
      
      {/* Main content area */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        {/* Step indicator */}
        <div className="bg-gradient-to-r from-indigo-500/5 to-purple-500/5 dark:from-indigo-500/10 dark:to-purple-500/10 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className={`flex items-center justify-center w-8 h-8 rounded-full font-medium ${
                currentStep === 'upload' || currentStep === 'camera'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' 
                  : 'bg-indigo-600 text-white'
              }`}>
                1
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {currentStep === 'camera' ? 'Capture Photos' : 'Upload Images'}
              </span>
            </div>
            
            <div className="flex-1 mx-4 border-t-2 border-dashed border-gray-200 dark:border-gray-700 my-auto"></div>
            
            <div className="flex items-center space-x-2">
              <span className={`flex items-center justify-center w-8 h-8 rounded-full font-medium ${
                currentStep === 'details' 
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' 
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                2
              </span>
              <span className={`text-sm font-medium ${
                currentStep === 'details' 
                  ? 'text-gray-900 dark:text-gray-100' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}>Add Details</span>
            </div>
          </div>
        </div>
        
        <div className="p-6 sm:p-8">
          {/* Processing progress indicator */}
          {(isProcessing || processStage) && (
            <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {processStage || 'Processing...'}
                </span>
                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div 
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 h-1.5 rounded-full transition-all duration-300 ease-in-out" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {/* Success message */}
          {success && (
            <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">{success}</p>
                <div className="mt-2">
                  <Link href="/" className="text-sm font-medium text-green-600 dark:text-green-400 hover:underline">
                    View your closet
                  </Link>
                </div>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    type="button"
                    onClick={() => setSuccess(null)}
                    className="inline-flex rounded-md p-1.5 text-green-500 hover:bg-green-100 dark:hover:bg-green-800/30 focus:outline-none"
                  >
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    </button>
                  </div>
                </div>
              </div>
          )}
          
          {/* Error message */}
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-800/30 focus:outline-none"
                  >
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {currentStep === 'upload' ? (
            <div className="space-y-6">
              {/* Image upload */}
              <div>
                <h2 className="text-xl font-semibold mb-1 text-gray-900 dark:text-white">Upload Your Images</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Select images of clothing items or use your camera to capture photos. We will automatically remove the backgrounds.
                </p>
                
                {/* File source options */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex-1">
                    <button
                      type="button"
                      className="w-full py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 flex items-center justify-center gap-2"
                      onClick={() => document.getElementById('file-upload-input').click()}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Upload Images
                    </button>
                    <input 
                      id="file-upload-input"
                      type="file" 
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileSelect}
                      disabled={isProcessing}
                      multiple
                    />
                  </div>
                  <div className="flex-1">
                    <button
                      type="button"
                      className="w-full py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 flex items-center justify-center gap-2"
                      onClick={initializeCamera}
                      disabled={isProcessing}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Take Photos
                    </button>
                  </div>
                </div>
                
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 bg-gray-50 dark:bg-gray-800/50">
                  {previews.length > 0 ? (
                    <div className="w-full">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {previews.map((preview, index) => (
                          <div key={index} className="relative aspect-square bg-white dark:bg-gray-900 rounded-lg shadow-sm overflow-hidden group">
                            <Image 
                              src={preview}
                              alt={`Preview ${index + 1}`} 
                              className="object-contain"
                              fill
                            />
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              aria-label="Remove image"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                        
                        {/* Add more button */}
                        <label className="aspect-square border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex flex-col items-center justify-center cursor-pointer bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <div className="flex flex-col items-center justify-center p-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-500 dark:text-indigo-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Add more</span>
                          </div>
                          <input 
                            type="file" 
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileSelect}
                            disabled={isProcessing}
                            multiple
                          />
                        </label>
                      </div>
                      
                      <div className="mt-6">
                        <button
                          type="button"
                          onClick={processImages}
                          disabled={isProcessing || previews.length === 0}
                          className={`w-full py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white ${
                            isProcessing || previews.length === 0 
                              ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' 
                              : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-200'
                          }`}
                        >
                          {isProcessing ? 'Processing...' : `Process ${previews.length} Image${previews.length !== 1 ? 's' : ''}`}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center cursor-pointer py-10 px-4">
                      <div className="w-20 h-20 mb-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Drag & drop images here</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs mb-4">
                        Select multiple images to upload them all at once. We support JPG, PNG, and WebP formats.
                      </p>
                      <span className="py-2 px-4 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-800/30 transition-colors text-sm">
                        Browse files
                      </span>
                      <input 
                        type="file" 
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelect}
                        disabled={isProcessing}
                        multiple
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          ) : currentStep === 'camera' ? (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-1 text-gray-900 dark:text-white">Capture Photos</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Use your camera to take photos of clothing items. Position the item for best quality.
              </p>
              
              {/* Camera container */}
              <div className="bg-black rounded-xl overflow-hidden relative">
                <video 
                  ref={videoRef}
                  autoPlay 
                  playsInline 
                  className="w-full max-h-[60vh] object-contain mx-auto"
                />
                
                {/* Camera controls */}
                <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-t from-black/80 to-transparent">
                  <button
                    type="button"
                    onClick={switchCamera}
                    className="p-3 bg-gray-800/80 rounded-full text-white hover:bg-gray-700/80 transition-colors"
                    title="Switch camera"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </button>
                  
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="p-6 bg-white rounded-full hover:bg-gray-100 transition-colors"
                    title="Take photo"
                  >
                    <span className="block w-6 h-6 rounded-full border-4 border-indigo-600"></span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="p-3 bg-gray-800/80 rounded-full text-white hover:bg-gray-700/80 transition-colors"
                    title="Exit camera"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Captured photos */}
              {capturedPhotos.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Captured Photos</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {capturedPhotos.map((photo, index) => (
                      <div key={index} className="relative aspect-square bg-white dark:bg-gray-900 rounded-lg shadow-sm overflow-hidden">
                        <Image 
                          src={photo}
                          alt={`Captured ${index + 1}`} 
                          className="object-contain"
                          fill
                        />
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="flex-1 py-2.5 px-4 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={processImages}
                      disabled={isProcessing || capturedPhotos.length === 0}
                      className={`flex-1 py-2.5 px-4 rounded-lg shadow-sm text-sm font-medium text-white ${
                        isProcessing || capturedPhotos.length === 0 
                          ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-200'
                      }`}
                    >
                      {isProcessing ? 'Processing...' : `Process ${capturedPhotos.length} Photo${capturedPhotos.length !== 1 ? 's' : ''}`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="lg:grid lg:grid-cols-3 lg:gap-8">
                {/* Left column - image preview */}
                <div className="lg:col-span-1">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    {processedImages.length > 1 ? `Item ${currentItemIndex + 1} of ${processedImages.length}` : 'Processed Image'}
                  </h2>
                  
                  {/* Current image preview */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 mb-4">
                    <div className="relative w-full aspect-square">
                      {processedImages[currentItemIndex] && (
                        <Image 
                          src={processedImages[currentItemIndex]}
                          alt={`Processed ${currentItemIndex + 1}`} 
                          className="object-contain"
                          fill
                          sizes="(max-width: 768px) 100vw, 300px"
                        />
                      )}
                    </div>
                  </div>
                  
                  {/* Navigation controls - only show for multiple images */}
                  {processedImages.length > 1 && (
                    <div className="flex justify-between items-center my-4">
                      <button
                        onClick={() => navigateItems('prev')}
                        disabled={currentItemIndex === 0}
                        className={`p-2 rounded-lg ${
                          currentItemIndex === 0 
                            ? 'opacity-50 cursor-not-allowed' 
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                        aria-label="Previous item"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {currentItemIndex + 1} of {processedImages.length}
                      </span>
                      <button
                        onClick={() => navigateItems('next')}
                        disabled={currentItemIndex === processedImages.length - 1}
                        className={`p-2 rounded-lg ${
                          currentItemIndex === processedImages.length - 1 
                            ? 'opacity-50 cursor-not-allowed' 
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                        aria-label="Next item"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  )}
                  
                  {/* Preview gallery for easy item selection */}
                  {processedImages.length > 1 && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        All Items
                      </label>
                      <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto pb-2 pr-2">
                        {processedImages.map((img, index) => (
                          <div 
                            key={index} 
                            className={`relative cursor-pointer bg-white dark:bg-gray-800 rounded-md overflow-hidden border-2 transition-all ${
                              currentItemIndex === index 
                                ? 'border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/20' 
                                : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                            }`}
                            onClick={() => setCurrentItemIndex(index)}
                          >
                            <div className="aspect-square relative">
                              <Image 
                                src={img}
                                alt={`Item ${index + 1}`}
                                className="object-contain p-1"
                                fill
                                sizes="80px"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeProcessedImage(index);
                              }}
                              className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
                              aria-label="Remove image"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                            {!itemsData[index]?.category && (
                              <div className="absolute bottom-0 left-0 right-0 bg-yellow-500 text-white text-xs p-0.5 text-center">
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Apply to all items button (when multiple images) */}
                  {processedImages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const currentData = itemsData[currentItemIndex];
                        setItemsData(prev => prev.map(item => ({
                          ...item,
                          category: currentData.category,
                          season: currentData.season
                        })));
                      }}
                      disabled={isProcessing || !itemsData[currentItemIndex]?.category}
                      className={`mt-4 text-sm font-medium w-full py-2 px-3 rounded-lg ${
                        isProcessing || !itemsData[currentItemIndex]?.category
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                          : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors'
                      }`}
                    >
                      Apply category & season to all items
                    </button>
                  )}
                </div>
                
                {/* Right column - item details form */}
                <div className="lg:col-span-2 mt-6 lg:mt-0">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Item Details</h2>
                  
                  {itemsData[currentItemIndex] && (
                    <form className="space-y-4">
                      {/* Category selection */}
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800">
                        <label htmlFor={`category-${currentItemIndex}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Category <span className="text-red-500">*</span>
                        </label>
                        <select
                          id={`category-${currentItemIndex}`}
                          name="category"
                          value={itemsData[currentItemIndex].category}
                          onChange={(e) => handleItemChange(currentItemIndex, 'category', e.target.value)}
                          disabled={isProcessing}
                          className="block w-full pl-3 pr-10 py-2.5 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                          required
                        >
                          <option value="" disabled>Select a category</option>
                          <option value="tops">Tops</option>
                          <option value="bottoms">Bottoms</option>
                          <option value="dresses">Dresses</option>
                          <option value="outerwear">Outerwear</option>
                          <option value="footwear">Footwear</option>
                          <option value="accessories">Accessories</option>
                        </select>
                      </div>
                      
                      {/* Description */}
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800">
                        <label htmlFor={`description-${currentItemIndex}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          id={`description-${currentItemIndex}`}
                          name="description"
                          value={itemsData[currentItemIndex].description}
                          onChange={(e) => handleItemChange(currentItemIndex, 'description', e.target.value)}
                          disabled={isProcessing}
                          className="block w-full px-3 py-2.5 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                          placeholder="E.g., Blue cotton t-shirt"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Color picker */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800">
                          <label htmlFor={`color-${currentItemIndex}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Color
                          </label>
                          <div className="flex items-center space-x-2">
                            <div 
                              className="flex-shrink-0 w-10 h-10 border-2 border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                              style={{ backgroundColor: itemsData[currentItemIndex].color || '#000000' }}
                            >
                              <input
                                type="color"
                                id={`color-${currentItemIndex}`}
                                name="color"
                                value={itemsData[currentItemIndex].color || '#000000'}
                                onChange={(e) => handleItemChange(currentItemIndex, 'color', e.target.value)}
                                disabled={isProcessing}
                                className="opacity-0 w-full h-full cursor-pointer"
                              />
                            </div>
                            <input
                              type="text"
                              value={itemsData[currentItemIndex].color || '#000000'}
                              onChange={(e) => handleItemChange(currentItemIndex, 'color', e.target.value)}
                              disabled={isProcessing}
                              className="block flex-grow px-3 py-2 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors uppercase"
                              placeholder="#RRGGBB"
                            />
                          </div>
                        </div>
                        
                        {/* Season */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800">
                          <label htmlFor={`season-${currentItemIndex}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Season
                          </label>
                          <select
                            id={`season-${currentItemIndex}`}
                            name="season"
                            value={itemsData[currentItemIndex].season}
                            onChange={(e) => handleItemChange(currentItemIndex, 'season', e.target.value)}
                            disabled={isProcessing}
                            className="block w-full pl-3 pr-10 py-2.5 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                          >
                            <option value="all">All Seasons</option>
                            <option value="spring">Spring</option>
                            <option value="summer">Summer</option>
                            <option value="fall">Fall</option>
                            <option value="winter">Winter</option>
                          </select>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-6 mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isProcessing}
                  className="sm:flex-1 py-2.5 px-4 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveToCloset}
                  disabled={isProcessing || itemsData.some(item => !item.category)}
                  className={`sm:flex-1 py-2.5 px-4 rounded-lg shadow-sm text-sm font-medium text-white ${
                    isProcessing || itemsData.some(item => !item.category)
                      ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-200'
                  }`}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    `Add ${processedImages.length} Item${processedImages.length !== 1 ? 's' : ''} to Closet`
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}