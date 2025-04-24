import { NextResponse } from 'next/server';
import { getBgRemovalApiKey, getBgRemovalApiUrl } from '@/lib/services/configService';

/**
 * API Route for removing backgrounds from images using remove.bg API
 * POST /api/rembg
 */
export async function POST(request) {
  try {
    // Get the image from the request body
    const { image } = await request.json();
    
    if (!image) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }
    
    // Get API key and URL from configuration service
    const apiKey = getBgRemovalApiKey();
    const apiUrl = getBgRemovalApiUrl();
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Background removal API key is not configured' },
        { status: 500 }
      );
    }
    
    // Convert base64 data to binary for API request
    const base64Data = image.split(',')[1];
    const formData = new FormData();
    formData.append('image_file_b64', base64Data);
    
    // Call the background removal API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Background removal API error', details: error },
        { status: response.status }
      );
    }

    // Get the processed image data as binary
    const imageBuffer = await response.arrayBuffer();
    
    // Convert to base64 for response
    const resultBase64 = `data:image/png;base64,${Buffer.from(imageBuffer).toString('base64')}`;

    // Return the processed image data
    return NextResponse.json({ 
      success: true, 
      imageData: resultBase64
    });
  } catch (error) {
    console.error('Background removal error:', error);
    return NextResponse.json(
      { error: 'Failed to process image', details: error.message },
      { status: 500 }
    );
  }
}