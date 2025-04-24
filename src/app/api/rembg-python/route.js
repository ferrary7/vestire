import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

const execPromise = promisify(exec);
const writeFilePromise = promisify(fs.writeFile);
const readFilePromise = promisify(fs.readFile);
const unlinkPromise = promisify(fs.unlink);

// Function to process one image in the background removal pipeline
async function processImage(file, index) {
  // Create unique filenames
  const uniqueId = uuidv4();
  const inputPath = path.join(process.cwd(), 'temp', `input-${uniqueId}.png`);
  const outputPath = path.join(process.cwd(), 'temp', `output-${uniqueId}.png`);
  
  try {
    // Save the uploaded file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFilePromise(inputPath, buffer);
    
    // Run Python script to remove background
    const pythonScript = path.join(process.cwd(), 'scripts', 'remove_bg.py');
    await execPromise(`python ${pythonScript} ${inputPath} ${outputPath}`);
    
    // Read the processed image
    const processedImageBuffer = await readFilePromise(outputPath);
    const base64Image = `data:image/png;base64,${processedImageBuffer.toString('base64')}`;
    
    // Clean up temporary files
    await Promise.all([
      unlinkPromise(inputPath),
      unlinkPromise(outputPath)
    ]);
    
    return { success: true, image: base64Image, index };
  } catch (error) {
    // Clean up any files that might have been created
    try {
      if (fs.existsSync(inputPath)) await unlinkPromise(inputPath);
      if (fs.existsSync(outputPath)) await unlinkPromise(outputPath);
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }
    
    return { success: false, error: error.message, index };
  }
}

/**
 * API Route for removing backgrounds from images using Python script
 * Optimized for parallel processing and better error handling
 * POST /api/rembg-python
 */
export async function POST(request) {
  try {
    // Ensure temp directory exists
    if (!fs.existsSync(path.join(process.cwd(), 'temp'))) {
      fs.mkdirSync(path.join(process.cwd(), 'temp'), { recursive: true });
    }
    
    const formData = await request.formData();
    const files = formData.getAll('files');
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'Image files are required' },
        { status: 400 }
      );
    }
    
    // Determine optimal batch size based on CPU cores
    const cpuCount = os.cpus().length;
    const batchSize = Math.max(1, Math.min(cpuCount - 1, 4)); // Use at most cpuCount-1 cores, max 4
    
    // Process files in parallel batches
    const results = [];
    const fileArray = Array.from(files);
    
    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < fileArray.length; i += batchSize) {
      const batch = fileArray.slice(i, i + batchSize);
      const batchPromises = batch.map((file, batchIndex) => 
        processImage(file, i + batchIndex)
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    // Separate successful and failed results
    const successful = results.filter(r => r.success).sort((a, b) => a.index - b.index);
    const failed = results.filter(r => !r.success).sort((a, b) => a.index - b.index);
    
    if (successful.length === 0 && failed.length > 0) {
      return NextResponse.json(
        { 
          error: 'All image processing failed', 
          details: failed.map(f => f.error) 
        },
        { status: 500 }
      );
    }
    
    // Return the processed images and any errors
    return NextResponse.json({ 
      success: true, 
      images: successful.map(s => s.image),
      errors: failed.length > 0 ? failed.map(f => f.error) : null,
      processingStats: {
        total: fileArray.length,
        successful: successful.length,
        failed: failed.length
      }
    });
  } catch (error) {
    console.error('Background removal error:', error);
    return NextResponse.json(
      { error: 'Failed to process images', details: error.message },
      { status: 500 }
    );
  }
}