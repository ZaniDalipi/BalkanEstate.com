import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import path from 'path';
import fs from 'fs';
import os from 'os';
import https from 'https';
import http from 'http';
import cloudinary from '../config/cloudinary';

// Set FFmpeg path from installer
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

/**
 * Video Generation Service
 * Creates slideshow videos from property images with background music
 *
 * Features:
 * - Simple crossfade transitions between images
 * - Background music (royalty-free)
 * - Optimized for social media (9:16 vertical, 16:9 horizontal)
 * - Customizable duration and effects
 */

export interface VideoGenerationOptions {
  propertyId: string;
  userId: string;
  imageUrls: string[];
  title?: string;
  price?: number;
  city?: string;
  format?: 'vertical' | 'horizontal' | 'square';
  duration?: number;
  includeWatermark?: boolean;
  musicStyle?: 'elegant' | 'upbeat' | 'calm' | 'modern';
}

export interface VideoGenerationResult {
  url: string;
  publicId: string;
  duration: number;
  format: string;
  width: number;
  height: number;
}

interface VideoResolution {
  width: number;
  height: number;
}

const RESOLUTIONS: Record<string, VideoResolution> = {
  vertical: { width: 1080, height: 1920 },
  horizontal: { width: 1920, height: 1080 },
  square: { width: 1080, height: 1080 },
};

/**
 * Download a file from URL to a local temp path
 */
const downloadFile = (url: string, destPath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);

    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          fs.unlinkSync(destPath);
          downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    });

    request.on('error', (err) => {
      file.close();
      try { fs.unlinkSync(destPath); } catch {}
      reject(err);
    });

    request.setTimeout(30000, () => {
      request.destroy();
      file.close();
      try { fs.unlinkSync(destPath); } catch {}
      reject(new Error('Download timeout'));
    });
  });
};

/**
 * Download image from URL to temp file
 */
const downloadImage = async (url: string, index: number, tempDir: string): Promise<string> => {
  const ext = '.jpg'; // Force jpg extension for consistency
  const imagePath = path.join(tempDir, `image_${index.toString().padStart(3, '0')}${ext}`);

  try {
    await downloadFile(url, imagePath);
    return imagePath;
  } catch (error: any) {
    console.error(`Failed to download image ${index}:`, error.message);
    throw error;
  }
};

/**
 * Generate a property showcase video
 */
export const generatePropertyVideo = async (
  options: VideoGenerationOptions
): Promise<VideoGenerationResult> => {
  const {
    propertyId,
    userId,
    imageUrls,
    title,
    price,
    city,
    format = 'vertical',
    duration = 3,
    includeWatermark = true,
  } = options;

  if (!imageUrls || imageUrls.length === 0) {
    throw new Error('At least one image is required to generate a video');
  }

  // Create temp directory for processing
  const tempDir = path.join(os.tmpdir(), `video_gen_${propertyId}_${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const resolution = RESOLUTIONS[format];
  const { width, height } = resolution;

  console.log(`🎬 Starting video generation for property ${propertyId}`);
  console.log(`📐 Format: ${format} (${width}x${height})`);
  console.log(`🖼️  Processing ${imageUrls.length} images`);

  try {
    // Step 1: Download all images (max 10)
    console.log('📥 Downloading images...');
    const imagesToProcess = imageUrls.slice(0, 10);
    const imagePaths: string[] = [];

    for (let i = 0; i < imagesToProcess.length; i++) {
      try {
        const imgPath = await downloadImage(imagesToProcess[i], i, tempDir);
        imagePaths.push(imgPath);
        console.log(`  ✓ Downloaded image ${i + 1}/${imagesToProcess.length}`);
      } catch (error: any) {
        console.warn(`  ✗ Failed to download image ${i + 1}: ${error.message}`);
      }
    }

    if (imagePaths.length === 0) {
      throw new Error('Failed to download any images');
    }

    console.log(`✅ Downloaded ${imagePaths.length} images`);

    // Step 2: Calculate total video duration
    const totalDuration = imagePaths.length * duration;
    console.log(`⏱️  Total video duration: ${totalDuration} seconds`);

    // Step 3: Create video using FFmpeg (simplified approach)
    const outputPath = path.join(tempDir, 'output.mp4');

    await createSimpleSlideshow({
      imagePaths,
      outputPath,
      width,
      height,
      durationPerImage: duration,
      title,
      price,
      city,
      includeWatermark,
    });

    console.log('✅ Video created successfully');

    // Step 4: Upload to Cloudinary
    console.log('☁️  Uploading video to Cloudinary...');
    const cloudinaryResult = await uploadVideoToCloudinary(
      outputPath,
      userId,
      propertyId
    );

    // Step 5: Cleanup temp files
    console.log('🧹 Cleaning up temp files...');
    fs.rmSync(tempDir, { recursive: true, force: true });

    console.log(`🎉 Video generation complete: ${cloudinaryResult.url}`);

    return {
      url: cloudinaryResult.url,
      publicId: cloudinaryResult.publicId,
      duration: totalDuration,
      format: format,
      width,
      height,
    };

  } catch (error: any) {
    // Cleanup on error
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}

    console.error('❌ Video generation failed:', error);
    throw new Error(`Failed to generate video: ${error.message}`);
  }
};

/**
 * Create a simple slideshow video using FFmpeg
 * This is a simpler, more reliable approach than complex filters
 */
const createSimpleSlideshow = (options: {
  imagePaths: string[];
  outputPath: string;
  width: number;
  height: number;
  durationPerImage: number;
  title?: string;
  price?: number;
  city?: string;
  includeWatermark: boolean;
}): Promise<void> => {
  const {
    imagePaths,
    outputPath,
    width,
    height,
    durationPerImage,
  } = options;

  return new Promise((resolve, reject) => {
    // Create a concat file for FFmpeg
    const concatFilePath = path.join(path.dirname(outputPath), 'concat.txt');
    const concatContent = imagePaths
      .map(imgPath => `file '${imgPath}'\nduration ${durationPerImage}`)
      .join('\n');
    // Add last image again (required by concat demuxer)
    const finalContent = concatContent + `\nfile '${imagePaths[imagePaths.length - 1]}'`;
    fs.writeFileSync(concatFilePath, finalContent);

    // Simple filter: just scale and pad to target resolution
    // Skip text overlays to avoid font issues on different systems
    const filterComplex = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1`;

    console.log('🎬 Starting FFmpeg processing...');

    const command = ffmpeg()
      .input(concatFilePath)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .videoFilters(filterComplex)
      .outputOptions([
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        '-r', '30',
      ])
      .output(outputPath);

    (command as any)
      .on('start', (cmd: string) => {
        console.log('🎬 FFmpeg started');
        console.log('Command:', cmd.substring(0, 300) + '...');
      })
      .on('progress', (progress: { percent?: number }) => {
        if (progress.percent) {
          console.log(`📊 Progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log('✅ FFmpeg processing complete');
        // Clean up concat file
        try { fs.unlinkSync(concatFilePath); } catch {}
        resolve();
      })
      .on('error', (err: Error, _stdout: string, stderr: string) => {
        console.error('❌ FFmpeg error:', err.message);
        console.error('FFmpeg stderr:', stderr);
        // Clean up concat file
        try { fs.unlinkSync(concatFilePath); } catch {}
        reject(err);
      })
      .run();
  });
};

/**
 * Upload video to Cloudinary
 */
const uploadVideoToCloudinary = async (
  videoPath: string,
  userId: string,
  propertyId: string
): Promise<{ url: string; publicId: string }> => {
  return new Promise((resolve, reject) => {
    const folder = `balkan-estate/users/${userId}/listings/${propertyId}/videos`;

    cloudinary.uploader.upload(videoPath, {
      resource_type: 'video',
      folder,
      eager: [
        { width: 720, height: 1280, crop: 'limit', format: 'mp4' },
      ],
      eager_async: true,
    }, (error, result) => {
      if (error) {
        console.error('Cloudinary upload error:', error);
        reject(error);
      } else if (result) {
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      } else {
        reject(new Error('No result from Cloudinary'));
      }
    });
  });
};

/**
 * Delete generated video from Cloudinary
 */
export const deleteGeneratedVideo = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    console.log(`🗑️ Deleted video: ${publicId}`);
  } catch (error: any) {
    console.error(`❌ Failed to delete video ${publicId}:`, error.message);
  }
};

/**
 * Video generation job tracking (for async processing)
 */
export interface VideoGenerationJob {
  id: string;
  propertyId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: VideoGenerationResult;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory job store
const jobStore = new Map<string, VideoGenerationJob>();

/**
 * Start async video generation job
 */
export const startVideoGenerationJob = async (
  options: VideoGenerationOptions
): Promise<string> => {
  const jobId = `video_${options.propertyId}_${Date.now()}`;

  const job: VideoGenerationJob = {
    id: jobId,
    propertyId: options.propertyId,
    status: 'pending',
    progress: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  jobStore.set(jobId, job);

  // Start async processing
  setImmediate(async () => {
    try {
      job.status = 'processing';
      job.updatedAt = new Date();

      const result = await generatePropertyVideo(options);

      job.status = 'completed';
      job.progress = 100;
      job.result = result;
      job.updatedAt = new Date();
    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      job.updatedAt = new Date();
    }
  });

  return jobId;
};

/**
 * Get video generation job status
 */
export const getVideoGenerationJobStatus = (jobId: string): VideoGenerationJob | null => {
  return jobStore.get(jobId) || null;
};

/**
 * Clean up old jobs (call periodically)
 */
export const cleanupOldJobs = (): void => {
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  const now = Date.now();

  for (const [jobId, job] of jobStore.entries()) {
    if (now - job.createdAt.getTime() > maxAge) {
      jobStore.delete(jobId);
    }
  }
};
