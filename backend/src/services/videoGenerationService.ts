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
 * Creates slideshow videos from property images with background music and text overlays
 */

export interface VideoGenerationOptions {
  propertyId: string;
  userId: string;
  imageUrls: string[];
  title?: string;
  price?: number;
  city?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  sellerName?: string;
  sellerPhone?: string;
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

// Royalty-free music URLs from Pixabay (free for commercial use)
const MUSIC_URLS: Record<string, string> = {
  elegant: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0c6ff1bab.mp3',
  upbeat: 'https://cdn.pixabay.com/download/audio/2022/10/25/audio_946b4295a0.mp3',
  calm: 'https://cdn.pixabay.com/download/audio/2021/11/25/audio_91b32e02f9.mp3',
  modern: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_8cb749d484.mp3',
};

/**
 * Download a file from URL to a local temp path
 */
const downloadFile = (url: string, destPath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);

    const request = protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          try { fs.unlinkSync(destPath); } catch {}
          downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        file.close();
        try { fs.unlinkSync(destPath); } catch {}
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

    request.setTimeout(60000, () => {
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
  const imagePath = path.join(tempDir, `image_${index.toString().padStart(3, '0')}.jpg`);
  await downloadFile(url, imagePath);
  return imagePath;
};

/**
 * Download background music
 */
const downloadMusic = async (style: string, tempDir: string): Promise<string | null> => {
  const musicUrl = MUSIC_URLS[style] || MUSIC_URLS.elegant;
  const musicPath = path.join(tempDir, 'music.mp3');

  try {
    console.log('🎵 Downloading background music...');
    await downloadFile(musicUrl, musicPath);
    console.log('✅ Music downloaded');
    return musicPath;
  } catch (error: any) {
    console.warn('⚠️ Failed to download music:', error.message);
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
    beds,
    baths,
    sqft,
    sellerName,
    sellerPhone,
    format = 'vertical',
    duration = 3,
    musicStyle = 'elegant',
  } = options;

  if (!imageUrls || imageUrls.length === 0) {
    throw new Error('At least one image is required to generate a video');
  }

  const tempDir = path.join(os.tmpdir(), `video_gen_${propertyId}_${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const resolution = RESOLUTIONS[format];
  const { width, height } = resolution;

  console.log(`🎬 Starting video generation for property ${propertyId}`);
  console.log(`📐 Format: ${format} (${width}x${height})`);
  console.log(`🖼️  Processing ${imageUrls.length} images`);

  try {
    // Step 1: Download images
    console.log('📥 Downloading images...');
    const imagesToProcess = imageUrls.slice(0, 10);
    const imagePaths: string[] = [];

    for (let i = 0; i < imagesToProcess.length; i++) {
      try {
        const imgPath = await downloadImage(imagesToProcess[i], i, tempDir);
        imagePaths.push(imgPath);
        console.log(`  ✓ Image ${i + 1}/${imagesToProcess.length}`);
      } catch (error: any) {
        console.warn(`  ✗ Failed image ${i + 1}: ${error.message}`);
      }
    }

    if (imagePaths.length === 0) {
      throw new Error('Failed to download any images');
    }

    // Step 2: Download background music
    const musicPath = await downloadMusic(musicStyle, tempDir);

    // Step 3: Create video
    const outputPath = path.join(tempDir, 'output.mp4');
    const totalDuration = imagePaths.length * duration;

    await createVideoWithOverlays({
      imagePaths,
      outputPath,
      musicPath,
      width,
      height,
      durationPerImage: duration,
      title,
      price,
      city,
      beds,
      baths,
      sqft,
      sellerName,
      sellerPhone,
    });

    console.log('✅ Video created successfully');

    // Step 4: Upload to Cloudinary
    console.log('☁️  Uploading to Cloudinary...');
    const cloudinaryResult = await uploadVideoToCloudinary(outputPath, userId, propertyId);

    // Step 5: Cleanup
    console.log('🧹 Cleaning up...');
    fs.rmSync(tempDir, { recursive: true, force: true });

    console.log(`🎉 Video complete: ${cloudinaryResult.url}`);

    return {
      url: cloudinaryResult.url,
      publicId: cloudinaryResult.publicId,
      duration: totalDuration,
      format,
      width,
      height,
    };
  } catch (error: any) {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
    console.error('❌ Video generation failed:', error);
    throw new Error(`Failed to generate video: ${error.message}`);
  }
};

/**
 * Create video with text overlays and music
 */
const createVideoWithOverlays = (options: {
  imagePaths: string[];
  outputPath: string;
  musicPath: string | null;
  width: number;
  height: number;
  durationPerImage: number;
  title?: string;
  price?: number;
  city?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  sellerName?: string;
  sellerPhone?: string;
}): Promise<void> => {
  const {
    imagePaths,
    outputPath,
    musicPath,
    width,
    height,
    durationPerImage,
    title,
    price,
    city,
    beds,
    baths,
    sqft,
    sellerName,
    sellerPhone,
  } = options;

  return new Promise((resolve, reject) => {
    const totalImages = imagePaths.length;
    const totalDuration = totalImages * durationPerImage;

    // Create concat file
    const concatFilePath = path.join(path.dirname(outputPath), 'concat.txt');
    const concatContent = imagePaths
      .map(imgPath => `file '${imgPath}'\nduration ${durationPerImage}`)
      .join('\n') + `\nfile '${imagePaths[imagePaths.length - 1]}'`;
    fs.writeFileSync(concatFilePath, concatContent);

    // Find available font on the system
    const fontPaths = [
      '/System/Library/Fonts/Helvetica.ttc',           // macOS
      '/System/Library/Fonts/SFNSText.ttf',            // macOS newer
      '/Library/Fonts/Arial.ttf',                       // macOS
      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', // Linux
      '/usr/share/fonts/TTF/DejaVuSans.ttf',           // Linux alternative
      'C:\\Windows\\Fonts\\arial.ttf',                  // Windows
    ];

    let fontFile = '';
    for (const fp of fontPaths) {
      if (fs.existsSync(fp)) {
        fontFile = fp;
        console.log(`📝 Using font: ${fp}`);
        break;
      }
    }

    // If no font found, skip text overlays
    const hasFont = fontFile !== '';
    if (!hasFont) {
      console.warn('⚠️ No system font found, skipping text overlays');
    }

    // Build filter with animated text overlays
    let filters: string[] = [];

    // Base scaling filter
    filters.push(`scale=${width}:${height}:force_original_aspect_ratio=decrease`);
    filters.push(`pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`);
    filters.push('setsar=1');

    // Property info text (shown on each image with fade animation)
    // Format price
    const priceText = price ? `€${price.toLocaleString()}` : '';
    const locationText = city || '';

    // Property features
    const features: string[] = [];
    if (beds) features.push(`${beds} Beds`);
    if (baths) features.push(`${baths} Baths`);
    if (sqft) features.push(`${sqft} m²`);
    const featuresText = features.join(' • ');

    // Calculate positions based on format
    const isVertical = height > width;
    const fontSize = isVertical ? 56 : 48;
    const smallFontSize = isVertical ? 36 : 32;
    const bottomPadding = isVertical ? 300 : 150;

    // Only add text overlays if we have a font
    if (hasFont) {
      const fontParam = `fontfile='${fontFile}'`;

      // Add gradient overlay at bottom for text readability
      filters.push(`drawbox=x=0:y=ih-${bottomPadding + 50}:w=iw:h=${bottomPadding + 50}:color=black@0.6:t=fill`);

      // Price (main text) - with fade in animation
      if (priceText) {
        filters.push(
          `drawtext=${fontParam}:text='${escapeText(priceText)}':` +
          `fontsize=${fontSize}:fontcolor=white:` +
          `x=(w-text_w)/2:y=h-${bottomPadding}:` +
          `alpha='if(lt(mod(t\\,${durationPerImage})\\,0.5)\\,mod(t\\,${durationPerImage})*2\\,1)'`
        );
      }

      // Location
      if (locationText) {
        filters.push(
          `drawtext=${fontParam}:text='${escapeText(locationText)}':` +
          `fontsize=${smallFontSize}:fontcolor=white@0.9:` +
          `x=(w-text_w)/2:y=h-${bottomPadding - 60}`
        );
      }

      // Features (beds, baths, sqft)
      if (featuresText) {
        filters.push(
          `drawtext=${fontParam}:text='${escapeText(featuresText)}':` +
          `fontsize=${smallFontSize - 4}:fontcolor=white@0.8:` +
          `x=(w-text_w)/2:y=h-${bottomPadding - 110}`
        );
      }

      // Title at top
      if (title) {
        filters.push(`drawbox=x=0:y=0:w=iw:h=120:color=black@0.5:t=fill`);
        filters.push(
          `drawtext=${fontParam}:text='${escapeText(title.substring(0, 40))}':` +
          `fontsize=${smallFontSize}:fontcolor=white:` +
          `x=(w-text_w)/2:y=40`
        );
      }

      // Contact info on last few seconds
      const contactStartTime = Math.max(0, totalDuration - 4);
      if (sellerName || sellerPhone) {
        // Show contact overlay in last 4 seconds
        filters.push(
          `drawbox=x=iw/4:y=ih/3:w=iw/2:h=ih/3:color=black@0.8:t=fill:enable='gte(t\\,${contactStartTime})'`
        );

        if (sellerName) {
          filters.push(
            `drawtext=${fontParam}:text='${escapeText(sellerName)}':` +
            `fontsize=${fontSize - 8}:fontcolor=white:` +
            `x=(w-text_w)/2:y=h/2-40:` +
            `enable='gte(t\\,${contactStartTime})'`
          );
        }

        if (sellerPhone) {
          filters.push(
            `drawtext=${fontParam}:text='${escapeText(sellerPhone)}':` +
            `fontsize=${smallFontSize}:fontcolor=white@0.9:` +
            `x=(w-text_w)/2:y=h/2+20:` +
            `enable='gte(t\\,${contactStartTime})'`
          );
        }

        // Call to action
        filters.push(
          `drawtext=${fontParam}:text='Contact Now':` +
          `fontsize=${smallFontSize - 4}:fontcolor=yellow:` +
          `x=(w-text_w)/2:y=h/2+70:` +
          `enable='gte(t\\,${contactStartTime})'`
        );
      }

      // Watermark
      filters.push(
        `drawtext=${fontParam}:text='BalkanEstate.com':` +
        `fontsize=24:fontcolor=white@0.6:` +
        `x=20:y=20`
      );
    }

    const filterComplex = filters.join(',');

    console.log('🎬 Starting FFmpeg processing with overlays...');

    const command = ffmpeg()
      .input(concatFilePath)
      .inputOptions(['-f', 'concat', '-safe', '0']);

    // Add music if available
    if (musicPath && fs.existsSync(musicPath)) {
      command.input(musicPath);
    }

    command.complexFilter(filterComplex);

    const outputOptions = [
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-r', '30',
      '-t', totalDuration.toString(),
    ];

    // Add audio options if music is available
    if (musicPath && fs.existsSync(musicPath)) {
      outputOptions.push('-c:a', 'aac', '-b:a', '128k', '-shortest');
    }

    command.outputOptions(outputOptions).output(outputPath);

    (command as any)
      .on('start', (cmd: string) => {
        console.log('🎬 FFmpeg started');
        console.log('Command preview:', cmd.substring(0, 400) + '...');
      })
      .on('progress', (progress: { percent?: number }) => {
        if (progress.percent) {
          console.log(`📊 Progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log('✅ FFmpeg complete');
        try { fs.unlinkSync(concatFilePath); } catch {}
        resolve();
      })
      .on('error', (err: Error, _stdout: string, stderr: string) => {
        console.error('❌ FFmpeg error:', err.message);
        console.error('Stderr:', stderr);
        try { fs.unlinkSync(concatFilePath); } catch {}
        reject(err);
      })
      .run();
  });
};

/**
 * Escape text for FFmpeg drawtext filter
 */
const escapeText = (text: string): string => {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "'\\''")
    .replace(/:/g, '\\:')
    .replace(/%/g, '\\%');
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
      eager: [{ width: 720, height: 1280, crop: 'limit', format: 'mp4' }],
      eager_async: true,
    }, (error, result) => {
      if (error) {
        console.error('Cloudinary error:', error);
        reject(error);
      } else if (result) {
        resolve({ url: result.secure_url, publicId: result.public_id });
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

// Job tracking for async processing
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

const jobStore = new Map<string, VideoGenerationJob>();

export const startVideoGenerationJob = async (options: VideoGenerationOptions): Promise<string> => {
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

export const getVideoGenerationJobStatus = (jobId: string): VideoGenerationJob | null => {
  return jobStore.get(jobId) || null;
};

export const cleanupOldJobs = (): void => {
  const maxAge = 24 * 60 * 60 * 1000;
  const now = Date.now();
  for (const [jobId, job] of jobStore.entries()) {
    if (now - job.createdAt.getTime() > maxAge) {
      jobStore.delete(jobId);
    }
  }
};
