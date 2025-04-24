/**
 * Utility functions for image processing and handling
 */

/**
 * Converts a File object to a base64 string
 * @param {File} file - The file to convert
 * @returns {Promise<string>} - Base64 string representation of the file
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Generates a thumbnail from a base64 image
 * @param {string} base64 - The base64 image data
 * @param {number} maxWidth - Maximum width of the thumbnail
 * @param {number} maxHeight - Maximum height of the thumbnail
 * @returns {Promise<string>} - Base64 string of the thumbnail
 */
export const generateThumbnail = (base64, maxWidth = 200, maxHeight = 200) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
      const width = img.width * scale;
      const height = img.height * scale;
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = reject;
  });
};

/**
 * Extracts dominant colors from an image
 * @param {string} base64 - The base64 image data
 * @param {number} sampleSize - Number of pixels to sample
 * @returns {Promise<Array<string>>} - Array of hex color codes
 */
export const extractDominantColors = async (base64, sampleSize = 100) => {
  // This is a simplified implementation
  // For production, consider using a library like color-thief
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      const colors = {};
      const step = Math.floor(img.width * img.height / sampleSize);
      
      for (let i = 0; i < img.width * img.height; i += step) {
        const x = i % img.width;
        const y = Math.floor(i / img.width);
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        
        // Convert RGB to hex
        const hex = `#${pixel[0].toString(16).padStart(2, '0')}${pixel[1].toString(16).padStart(2, '0')}${pixel[2].toString(16).padStart(2, '0')}`;
        
        // Count color occurrences
        colors[hex] = (colors[hex] || 0) + 1;
      }
      
      // Sort colors by occurrence and take top 3
      const sortedColors = Object.entries(colors)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([color]) => color);
      
      resolve(sortedColors);
    };
    img.onerror = reject;
  });
};

/**
 * Determines if the dominant color is light or dark
 * @param {string} hexColor - Hex color code
 * @returns {boolean} - True if the color is light, false if dark
 */
export const isLightColor = (hexColor) => {
  // Convert hex to RGB
  const r = parseInt(hexColor.substring(1, 3), 16);
  const g = parseInt(hexColor.substring(3, 5), 16);
  const b = parseInt(hexColor.substring(5, 7), 16);
  
  // Calculate perceived brightness (YIQ formula)
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  
  return yiq >= 128; // 128 is the threshold (out of 255)
};