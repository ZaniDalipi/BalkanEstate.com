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
 * - Ken Burns effect (zoom/pan) for dynamic visuals
 * - Smooth transitions between images
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
  format?: 'vertical' | 'horizontal' | 'square'; // For reels (9:16), regular (16:9), or square (1:1)
  duration?: number; // Duration per image in seconds (default: 3)
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
  vertical: { width: 1080, height: 1920 },   // 9:16 for reels/stories
  horizontal: { width: 1920, height: 1080 }, // 16:9 for regular video
  square: { width: 1080, height: 1080 },     // 1:1 for Instagram feed
};

// Royalty-free background music URLs (using freemusicarchive/pixabay style URLs)
// These will be replaced with actual royalty-free music files
const MUSIC_STYLES: Record<string, string> = {
  elegant: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3', // Elegant piano
  upbeat: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_8cb749d484.mp3', // Upbeat corporate
  calm: 'https://cdn.pixabay.com/download/audio/2021/11/25/audio_91b32e02f9.mp3', // Calm ambient
  modern: 'https://cdn.pixabay.com/download/audio/2022/10/25/audio_946b4295a0.mp3', // Modern electronic
};

// Fallback local audio path
const LOCAL_AUDIO_PATH = path.join(__dirname, '../assets/audio/background.mp3');

/**
 * Download a file from URL to a local temp path
 */
const downloadFile = (url: string, destPath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);

    protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {}); // Delete partial file
      reject(err);
    });
  });
};

/**
 * Download image from URL to temp file
 */
const downloadImage = async (url: string, index: number, tempDir: string): Promise<string> => {
  const ext = path.extname(url.split('?')[0]) || '.jpg';
  const imagePath = path.join(tempDir, `image_${index.toString().padStart(3, '0')}${ext}`);

  await downloadFile(url, imagePath);
  return imagePath;
};

// Title slide generation could be added here for future enhancement

/**
 * Get or download background music
 */
const getBackgroundMusic = async (style: string, tempDir: string): Promise<string | null> => {
  // First check if local audio exists
  if (fs.existsSync(LOCAL_AUDIO_PATH)) {
    return LOCAL_AUDIO_PATH;
  }

  // Try to download from online source
  const musicUrl = MUSIC_STYLES[style] || MUSIC_STYLES.elegant;
  const musicPath = path.join(tempDir, 'background_music.mp3');

  try {
    await downloadFile(musicUrl, musicPath);
    return musicPath;
  } catch (error) {
    console.warn('⚠️ Could not download background music, video will be silent:', error);
    return null;
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
    musicStyle = 'elegant',
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
    // Step 1: Download all images in parallel
    console.log('📥 Downloading images...');
    const downloadPromises = imageUrls.slice(0, 10).map((url, index) =>
      downloadImage(url, index, tempDir)
    );
    const imagePaths = await Promise.all(downloadPromises);
    console.log(`✅ Downloaded ${imagePaths.length} images`);

    // Step 2: Get background music
    console.log('🎵 Preparing background music...');
    const musicPath = await getBackgroundMusic(musicStyle, tempDir);

    // Step 3: Calculate total video duration
    const totalDuration = imagePaths.length * duration;
    console.log(`⏱️  Total video duration: ${totalDuration} seconds`);

    // Step 4: Create video using FFmpeg
    const outputPath = path.join(tempDir, 'output.mp4');

    await createVideoFromImages({
      imagePaths,
      outputPath,
      width,
      height,
      durationPerImage: duration,
      musicPath,
      title,
      price,
      city,
      includeWatermark,
    });

    console.log('✅ Video created successfully');

    // Step 5: Upload to Cloudinary
    console.log('☁️  Uploading video to Cloudinary...');
    const cloudinaryResult = await uploadVideoToCloudinary(
      outputPath,
      userId,
      propertyId
    );

    // Step 6: Cleanup temp files
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
 * Create video from images using FFmpeg with Ken Burns effect
 */
const createVideoFromImages = (options: {
  imagePaths: string[];
  outputPath: string;
  width: number;
  height: number;
  durationPerImage: number;
  musicPath: string | null;
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
    musicPath,
    title,
    price,
    city,
    includeWatermark,
  } = options;

  return new Promise((resolve, reject) => {
    // Build complex filter for Ken Burns effect and transitions
    const filters: string[] = [];

    // Add each image with zoom/pan effect
    imagePaths.forEach((imgPath, i) => {
      // Alternate between zoom in and zoom out effects
      const zoomDirection = i % 2 === 0 ? 'in' : 'out';
      const startScale = zoomDirection === 'in' ? 1 : 1.3;
      const endScale = zoomDirection === 'in' ? 1.3 : 1;

      // Create zoompan filter for Ken Burns effect
      // zoompan: z is zoom level, x/y is position
      const fps = 30;
      const totalFrames = durationPerImage * fps;

      filters.push(
        `[${i}:v]scale=${width * 2}:${height * 2}:force_original_aspect_ratio=increase,` +
        `crop=${width}:${height},` +
        `zoompan=z='if(lte(zoom,${startScale}),${startScale},max(${endScale},zoom-0.001))':` +
        `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':` +
        `d=${totalFrames}:s=${width}x${height}:fps=${fps},` +
        `setpts=PTS-STARTPTS[v${i}]`
      );
    });

    // Concatenate all video streams with crossfade transitions
    const transitionDuration = 0.5;
    let concatFilter = '';

    if (imagePaths.length === 1) {
      concatFilter = `[v0]null[outv]`;
    } else {
      // Build xfade chain for smooth transitions
      let lastOutput = 'v0';
      for (let i = 1; i < imagePaths.length; i++) {
        const outputLabel = i === imagePaths.length - 1 ? 'outv' : `xf${i}`;
        const offset = (i * durationPerImage) - (i * transitionDuration);
        concatFilter += `[${lastOutput}][v${i}]xfade=transition=fade:duration=${transitionDuration}:offset=${offset}[${outputLabel}];`;
        lastOutput = outputLabel;
      }
      // Remove trailing semicolon
      concatFilter = concatFilter.slice(0, -1);
    }

    // Build complete filter complex
    let filterComplex = filters.join(';') + ';' + concatFilter;

    // Add text overlay if title/price/city provided
    if (title || price || city) {
      const textFilters: string[] = [];
      let yPosition = height - 150;

      // Add semi-transparent background for text
      textFilters.push(
        `[outv]drawbox=x=0:y=${height-200}:w=${width}:h=200:color=black@0.5:t=fill[txtbg]`
      );

      if (city) {
        textFilters.push(
          `[txtbg]drawtext=text='${city.replace(/'/g, "\\'")}':` +
          `fontsize=36:fontcolor=white@0.9:x=(w-text_w)/2:y=${yPosition}[txt1]`
        );
        yPosition += 50;
      }

      if (price) {
        const priceText = `€${price.toLocaleString()}`;
        const lastLabel = city ? 'txt1' : 'txtbg';
        textFilters.push(
          `[${lastLabel}]drawtext=text='${priceText}':` +
          `fontsize=48:fontcolor=white:x=(w-text_w)/2:y=${yPosition}[txt2]`
        );
      }

      // Add watermark
      if (includeWatermark) {
        const lastLabel = price ? 'txt2' : (city ? 'txt1' : 'txtbg');
        textFilters.push(
          `[${lastLabel}]drawtext=text='BalkanEstate.com':` +
          `fontsize=24:fontcolor=white@0.7:x=20:y=20[finalv]`
        );
      } else {
        const lastLabel = price ? 'txt2' : (city ? 'txt1' : 'txtbg');
        textFilters.push(`[${lastLabel}]null[finalv]`);
      }

      filterComplex += ';' + textFilters.join(';');
    } else if (includeWatermark) {
      filterComplex += `;[outv]drawtext=text='BalkanEstate.com':` +
        `fontsize=24:fontcolor=white@0.7:x=20:y=20[finalv]`;
    } else {
      filterComplex += `;[outv]null[finalv]`;
    }

    // Create FFmpeg command
    let command = ffmpeg();

    // Add image inputs
    imagePaths.forEach((imgPath) => {
      command = command.input(imgPath).inputOptions(['-loop', '1']);
    });

    // Add audio input if available
    if (musicPath) {
      command = command.input(musicPath);
    }

    // Calculate total duration
    const totalDuration = (imagePaths.length * durationPerImage) -
      ((imagePaths.length - 1) * transitionDuration);

    // Build output options
    const outputOptions = [
      '-filter_complex', filterComplex,
      '-map', '[finalv]',
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-t', totalDuration.toString(),
      '-movflags', '+faststart', // For web streaming
    ];

    // Add audio mapping if available
    if (musicPath) {
      outputOptions.push('-map', `${imagePaths.length}:a`);
      outputOptions.push('-c:a', 'aac');
      outputOptions.push('-b:a', '128k');
      outputOptions.push('-shortest'); // End when shortest stream ends
    }

    command
      .outputOptions(outputOptions)
      .output(outputPath)
      .on('start', (cmd) => {
        console.log('🎬 FFmpeg command:', cmd.substring(0, 200) + '...');
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`📊 Progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log('✅ FFmpeg processing complete');
        resolve();
      })
      .on('error', (err, stdout, stderr) => {
        console.error('❌ FFmpeg error:', err.message);
        console.error('FFmpeg stderr:', stderr);
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
        { width: 720, height: 1280, crop: 'limit', format: 'mp4' }, // Mobile optimized
      ],
      eager_async: true,
    }, (error, result) => {
      if (error) {
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
 * Get video generation status (for async processing)
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

// In-memory job store (in production, use Redis or database)
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
