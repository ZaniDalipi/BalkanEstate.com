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
  quality?: 'standard' | 'mobile'; // 'mobile' uses lower resolution for faster loading
  duration?: number;
  includeWatermark?: boolean;
  musicStyle?: 'elegant' | 'upbeat' | 'calm' | 'modern';
  backgroundStyle?: 'gradient' | 'blur' | 'dark' | 'elegant';
  embedInListing?: boolean; // Save video URL to property for auto-play on listing
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

// Standard resolutions (high quality for desktop/tablets)
const STANDARD_RESOLUTIONS: Record<string, VideoResolution> = {
  vertical: { width: 1080, height: 1920 },
  horizontal: { width: 1920, height: 1080 },
  square: { width: 1080, height: 1080 },
};

// Mobile-optimized resolutions (smaller file size, faster loading)
const MOBILE_RESOLUTIONS: Record<string, VideoResolution> = {
  vertical: { width: 720, height: 1280 },
  horizontal: { width: 1280, height: 720 },
  square: { width: 720, height: 720 },
};

const getResolution = (format: string, quality: string): VideoResolution => {
  const resolutions = quality === 'mobile' ? MOBILE_RESOLUTIONS : STANDARD_RESOLUTIONS;
  return resolutions[format] || STANDARD_RESOLUTIONS.vertical;
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
    quality = 'mobile', // Default to mobile for smaller file sizes
    duration = 3,
    musicStyle = 'elegant',
  } = options;

  if (!imageUrls || imageUrls.length === 0) {
    throw new Error('At least one image is required to generate a video');
  }

  const tempDir = path.join(os.tmpdir(), `video_gen_${propertyId}_${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const resolution = getResolution(format, quality);
  const { width, height } = resolution;

  console.log(`🎬 Starting video generation for property ${propertyId}`);
  console.log(`📐 Format: ${format} (${width}x${height}) - Quality: ${quality}`);
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
      backgroundStyle: options.backgroundStyle || 'elegant',
      includeWatermark: options.includeWatermark !== false,
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

// Background style configurations for professional look
const BACKGROUND_CONFIGS = {
  gradient: {
    // Animated gradient background (Canva-like)
    colors: ['#1a1a2e', '#16213e', '#0f3460', '#533483'],
    description: 'Animated purple-blue gradient'
  },
  blur: {
    // Blurred version of the image as background
    description: 'Blurred image background'
  },
  dark: {
    // Elegant dark background
    color: '#0a0a0a',
    description: 'Elegant dark background'
  },
  elegant: {
    // Premium gold and dark theme
    colors: ['#1a1a1a', '#2d2d2d', '#c9a962'],
    description: 'Premium dark with gold accents'
  }
};

/**
 * Create video with professional backgrounds, Ken Burns effect, and overlays
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
  backgroundStyle?: 'gradient' | 'blur' | 'dark' | 'elegant';
  includeWatermark?: boolean;
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
    backgroundStyle = 'elegant',
    includeWatermark = true,
  } = options;

  return new Promise((resolve, reject) => {
    const totalImages = imagePaths.length;
    const totalDuration = totalImages * durationPerImage;
    const isVertical = height > width;
    const fps = 30;
    const framesPerImage = durationPerImage * fps;

    // Create concat file with proper duration
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
      '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', // Linux Bold
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

    const hasFont = fontFile !== '';
    if (!hasFont) {
      console.warn('⚠️ No system font found, skipping text overlays');
    }

    // Build professional filter complex
    let filters: string[] = [];

    // Step 1: Create professional background based on style
    let bgFilter = '';
    switch (backgroundStyle) {
      case 'gradient':
        // Animated gradient background (purple to blue - Canva style)
        bgFilter = `color=c=#1a1a2e:s=${width}x${height}:d=${totalDuration}:r=${fps}[bg];` +
          `[bg]drawbox=x=0:y=0:w=iw:h=ih/3:color=#533483@0.4:t=fill[bg1];` +
          `[bg1]drawbox=x=0:y=ih*2/3:w=iw:h=ih/3:color=#0f3460@0.4:t=fill[bg2]`;
        break;
      case 'blur':
        // Will use blurred version of current image - handled differently
        bgFilter = `color=c=#0a0a0a:s=${width}x${height}:d=${totalDuration}:r=${fps}[bg2]`;
        break;
      case 'dark':
        bgFilter = `color=c=#0a0a0a:s=${width}x${height}:d=${totalDuration}:r=${fps}[bg2]`;
        break;
      case 'elegant':
      default:
        // Premium dark with subtle vignette effect
        bgFilter = `color=c=#121212:s=${width}x${height}:d=${totalDuration}:r=${fps}[bg];` +
          `[bg]vignette=PI/4[bg2]`;
        break;
    }

    // Step 2: Scale images to fit within frame while maintaining aspect ratio
    // This ensures images fit properly for both landscape and portrait
    const imgScaleFilter = isVertical
      ? `scale=w=${Math.floor(width * 0.85)}:h=-1:force_original_aspect_ratio=decrease,` +
        `scale=w='min(iw\\,${Math.floor(width * 0.85)})':h='min(ih\\,${Math.floor(height * 0.65)})':force_original_aspect_ratio=decrease`
      : `scale=w=-1:h=${Math.floor(height * 0.75)}:force_original_aspect_ratio=decrease,` +
        `scale=w='min(iw\\,${Math.floor(width * 0.85)})':h='min(ih\\,${Math.floor(height * 0.75)})':force_original_aspect_ratio=decrease`;

    // Step 3: Add Ken Burns effect (subtle zoom for professional look)
    const zoomStart = 1.0;
    const zoomEnd = 1.08;
    const kenBurnsFilter = `zoompan=z='${zoomStart}+(${zoomEnd}-${zoomStart})*on/${framesPerImage}':` +
      `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${framesPerImage}:s=${width}x${height}:fps=${fps}`;

    // Build the complete filter complex
    // First, create background
    filters.push(bgFilter);

    // Process input images with scaling
    filters.push(`[0:v]${imgScaleFilter},setsar=1,format=rgba[scaled]`);

    // Overlay scaled image on background (centered)
    filters.push(`[bg2][scaled]overlay=(W-w)/2:(H-h)/2:format=auto[main]`);

    // Add fade transitions between images
    const fadeFrames = Math.floor(fps * 0.5); // 0.5 second fade
    filters.push(`[main]fade=t=in:st=0:d=0.5,fade=t=out:st=${totalDuration - 0.5}:d=0.5[faded]`);

    // Property info text formatting
    const priceText = price ? `€${price.toLocaleString()}` : '';
    const locationText = city || '';
    const features: string[] = [];
    if (beds) features.push(`${beds} Bed${beds > 1 ? 's' : ''}`);
    if (baths) features.push(`${baths} Bath${baths > 1 ? 's' : ''}`);
    if (sqft) features.push(`${sqft} m²`);
    const featuresText = features.join('  •  ');

    // Calculate responsive font sizes and positions
    const titleFontSize = isVertical ? Math.floor(width / 18) : Math.floor(height / 18);
    const priceFontSize = isVertical ? Math.floor(width / 12) : Math.floor(height / 14);
    const locationFontSize = isVertical ? Math.floor(width / 22) : Math.floor(height / 22);
    const featureFontSize = isVertical ? Math.floor(width / 26) : Math.floor(height / 26);
    const watermarkFontSize = isVertical ? Math.floor(width / 36) : Math.floor(height / 36);

    // Position calculations
    const bottomMargin = isVertical ? Math.floor(height * 0.15) : Math.floor(height * 0.12);
    const topMargin = isVertical ? Math.floor(height * 0.05) : Math.floor(height * 0.04);

    // Add text overlays if font is available
    if (hasFont) {
      const fontParam = `fontfile='${fontFile}'`;
      let currentFilter = '[faded]';
      let filterIndex = 0;

      // Professional bottom gradient overlay for text readability
      const gradientHeight = isVertical ? Math.floor(height * 0.35) : Math.floor(height * 0.28);
      filters.push(
        `${currentFilter}drawbox=x=0:y=ih-${gradientHeight}:w=iw:h=${gradientHeight}:` +
        `color=black@0.7:t=fill[t${filterIndex}]`
      );
      currentFilter = `[t${filterIndex}]`;
      filterIndex++;

      // Top bar with gradient for title
      if (title) {
        const topBarHeight = isVertical ? Math.floor(height * 0.12) : Math.floor(height * 0.1);
        filters.push(
          `${currentFilter}drawbox=x=0:y=0:w=iw:h=${topBarHeight}:color=black@0.6:t=fill[t${filterIndex}]`
        );
        currentFilter = `[t${filterIndex}]`;
        filterIndex++;

        // Title text with elegant styling
        filters.push(
          `${currentFilter}drawtext=${fontParam}:text='${escapeText(title.substring(0, 45))}':` +
          `fontsize=${titleFontSize}:fontcolor=white:` +
          `x=(w-text_w)/2:y=${topMargin + titleFontSize / 2}:` +
          `alpha='if(lt(t\\,0.8)\\,t/0.8\\,1)'[t${filterIndex}]`
        );
        currentFilter = `[t${filterIndex}]`;
        filterIndex++;
      }

      // Price with animated entrance (main highlight)
      if (priceText) {
        const priceY = height - bottomMargin - priceFontSize * 2;
        filters.push(
          `${currentFilter}drawtext=${fontParam}:text='${escapeText(priceText)}':` +
          `fontsize=${priceFontSize}:fontcolor=#ffffff:` +
          `x=(w-text_w)/2:y=${priceY}:` +
          `alpha='if(lt(mod(t\\,${durationPerImage})\\,0.6)\\,mod(t\\,${durationPerImage})/0.6\\,1)':` +
          `shadowcolor=black@0.5:shadowx=2:shadowy=2[t${filterIndex}]`
        );
        currentFilter = `[t${filterIndex}]`;
        filterIndex++;
      }

      // Location with icon-like marker
      if (locationText) {
        const locationY = height - bottomMargin - priceFontSize * 0.5;
        filters.push(
          `${currentFilter}drawtext=${fontParam}:text='📍 ${escapeText(locationText)}':` +
          `fontsize=${locationFontSize}:fontcolor=white@0.95:` +
          `x=(w-text_w)/2:y=${locationY}[t${filterIndex}]`
        );
        currentFilter = `[t${filterIndex}]`;
        filterIndex++;
      }

      // Features with elegant styling
      if (featuresText) {
        const featuresY = height - bottomMargin + featureFontSize;
        filters.push(
          `${currentFilter}drawtext=${fontParam}:text='${escapeText(featuresText)}':` +
          `fontsize=${featureFontSize}:fontcolor=white@0.85:` +
          `x=(w-text_w)/2:y=${featuresY}[t${filterIndex}]`
        );
        currentFilter = `[t${filterIndex}]`;
        filterIndex++;
      }

      // Contact info overlay in last 4 seconds (professional card style)
      const contactStartTime = Math.max(0, totalDuration - 4);
      if (sellerName || sellerPhone) {
        const cardWidth = Math.floor(width * 0.7);
        const cardHeight = Math.floor(height * 0.25);
        const cardX = Math.floor((width - cardWidth) / 2);
        const cardY = Math.floor(height * 0.38);

        // Semi-transparent card background
        filters.push(
          `${currentFilter}drawbox=x=${cardX}:y=${cardY}:w=${cardWidth}:h=${cardHeight}:` +
          `color=black@0.85:t=fill:enable='gte(t\\,${contactStartTime})'[t${filterIndex}]`
        );
        currentFilter = `[t${filterIndex}]`;
        filterIndex++;

        // Card border (gold accent for elegant style)
        filters.push(
          `${currentFilter}drawbox=x=${cardX}:y=${cardY}:w=${cardWidth}:h=3:` +
          `color=#c9a962:t=fill:enable='gte(t\\,${contactStartTime})'[t${filterIndex}]`
        );
        currentFilter = `[t${filterIndex}]`;
        filterIndex++;

        // Contact header
        filters.push(
          `${currentFilter}drawtext=${fontParam}:text='Contact Agent':` +
          `fontsize=${locationFontSize}:fontcolor=#c9a962:` +
          `x=(w-text_w)/2:y=${cardY + cardHeight * 0.15}:` +
          `enable='gte(t\\,${contactStartTime})'[t${filterIndex}]`
        );
        currentFilter = `[t${filterIndex}]`;
        filterIndex++;

        if (sellerName) {
          filters.push(
            `${currentFilter}drawtext=${fontParam}:text='${escapeText(sellerName)}':` +
            `fontsize=${titleFontSize}:fontcolor=white:` +
            `x=(w-text_w)/2:y=${cardY + cardHeight * 0.4}:` +
            `enable='gte(t\\,${contactStartTime})'[t${filterIndex}]`
          );
          currentFilter = `[t${filterIndex}]`;
          filterIndex++;
        }

        if (sellerPhone) {
          filters.push(
            `${currentFilter}drawtext=${fontParam}:text='📞 ${escapeText(sellerPhone)}':` +
            `fontsize=${locationFontSize}:fontcolor=white@0.9:` +
            `x=(w-text_w)/2:y=${cardY + cardHeight * 0.65}:` +
            `enable='gte(t\\,${contactStartTime})'[t${filterIndex}]`
          );
          currentFilter = `[t${filterIndex}]`;
          filterIndex++;
        }
      }

      // Professional watermark with BalkanEstate branding
      if (includeWatermark) {
        // Watermark background pill
        const wmWidth = Math.floor(width * 0.35);
        const wmHeight = Math.floor(watermarkFontSize * 2.5);
        const wmX = Math.floor(width * 0.02);
        const wmY = Math.floor(height * 0.02);

        filters.push(
          `${currentFilter}drawbox=x=${wmX}:y=${wmY}:w=${wmWidth}:h=${wmHeight}:` +
          `color=black@0.5:t=fill[t${filterIndex}]`
        );
        currentFilter = `[t${filterIndex}]`;
        filterIndex++;

        // BalkanEstate logo text with house icon
        filters.push(
          `${currentFilter}drawtext=${fontParam}:text='🏠 BalkanEstate.com':` +
          `fontsize=${watermarkFontSize}:fontcolor=white@0.9:` +
          `x=${wmX + 10}:y=${wmY + wmHeight / 2 - watermarkFontSize / 2}[t${filterIndex}]`
        );
        currentFilter = `[t${filterIndex}]`;
        filterIndex++;
      }

      // Final output label
      filters.push(`${currentFilter}null[out]`);
    } else {
      filters.push('[faded]null[out]');
    }

    const filterComplex = filters.join(';');

    console.log('🎬 Starting FFmpeg processing with professional overlays...');
    console.log(`📐 Background style: ${backgroundStyle}`);

    const command = ffmpeg()
      .input(concatFilePath)
      .inputOptions(['-f', 'concat', '-safe', '0']);

    // Add music if available
    if (musicPath && fs.existsSync(musicPath)) {
      command.input(musicPath);
    }

    command.complexFilter(filterComplex, 'out');

    const outputOptions = [
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '22', // Slightly better quality
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-r', fps.toString(),
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
        console.log('Command preview:', cmd.substring(0, 500) + '...');
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
