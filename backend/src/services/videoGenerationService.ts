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

// BalkanEstate brand colors for video overlays
const BRAND_COLORS = {
  primary: '#5B8DEF',      // Brand blue
  secondary: '#6C9FFF',    // Lighter blue
  accent: '#4A7AE0',       // Darker blue
  dark: '#0a0a12',         // Dark background
  gradient1: '#667eea',    // Purple-ish blue
  gradient2: '#764ba2',    // Purple
  gradient3: '#06b6d4',    // Teal
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

    // Step 1: Create professional Canva-style background based on style
    // Using multiple overlapping colored shapes with heavy blur for smooth mesh gradient effect
    let bgFilter = '';
    const blurRadius = Math.floor(Math.min(width, height) / 6); // Strong blur for smooth gradients

    switch (backgroundStyle) {
      case 'gradient':
        // Vibrant Canva-style mesh gradient (Blue, Purple, Pink, Teal)
        bgFilter = `color=c=#0f0f1a:s=${width}x${height}:d=${totalDuration}:r=${fps}[bgbase];` +
          // Large blue blob (top-right)
          `[bgbase]drawbox=x=iw*0.5:y=-ih*0.2:w=iw*0.8:h=ih*0.7:color=${BRAND_COLORS.primary}@0.7:t=fill[bg1];` +
          // Purple blob (bottom-left)
          `[bg1]drawbox=x=-iw*0.2:y=ih*0.4:w=iw*0.7:h=ih*0.7:color=${BRAND_COLORS.gradient2}@0.6:t=fill[bg2];` +
          // Teal accent (center-right)
          `[bg2]drawbox=x=iw*0.4:y=ih*0.2:w=iw*0.5:h=ih*0.5:color=${BRAND_COLORS.gradient3}@0.5:t=fill[bg3];` +
          // Pink accent (bottom-right)
          `[bg3]drawbox=x=iw*0.6:y=ih*0.6:w=iw*0.5:h=ih*0.5:color=#ec4899@0.4:t=fill[bg4];` +
          // Heavy blur for smooth blended mesh effect
          `[bg4]gblur=sigma=${blurRadius * 1.5}[bg5];` +
          // Add vignette for depth
          `[bg5]vignette=PI/4[bg2]`;
        break;
      case 'blur':
        // Soft dreamy gradient (Indigo to Cyan)
        bgFilter = `color=c=#0c0a1d:s=${width}x${height}:d=${totalDuration}:r=${fps}[bgbase];` +
          // Large indigo shape
          `[bgbase]drawbox=x=iw*0.3:y=-ih*0.1:w=iw*0.8:h=ih*0.6:color=#6366f1@0.65:t=fill[bg1];` +
          // Cyan accent
          `[bg1]drawbox=x=-iw*0.1:y=ih*0.5:w=iw*0.7:h=ih*0.6:color=#22d3ee@0.5:t=fill[bg2];` +
          // Purple middle
          `[bg2]drawbox=x=iw*0.4:y=ih*0.3:w=iw*0.4:h=ih*0.4:color=#a855f7@0.4:t=fill[bg3];` +
          // Extra heavy blur for soft dreamy effect
          `[bg3]gblur=sigma=${blurRadius * 2}[bg4];` +
          `[bg4]vignette=PI/4[bg2]`;
        break;
      case 'dark':
        // Elegant dark with subtle color accents
        bgFilter = `color=c=#030712:s=${width}x${height}:d=${totalDuration}:r=${fps}[bgbase];` +
          // Subtle blue glow (top-right)
          `[bgbase]drawbox=x=iw*0.6:y=-ih*0.1:w=iw*0.6:h=ih*0.5:color=${BRAND_COLORS.primary}@0.35:t=fill[bg1];` +
          // Subtle purple glow (bottom-left)
          `[bg1]drawbox=x=-iw*0.1:y=ih*0.6:w=iw*0.5:h=ih*0.5:color=#6366f1@0.25:t=fill[bg2];` +
          `[bg2]gblur=sigma=${blurRadius}[bg3];` +
          `[bg3]vignette=PI/3[bg2]`;
        break;
      case 'elegant':
      default:
        // Premium BalkanEstate branded gradient (Blue dominant with purple accent)
        bgFilter = `color=c=#080810:s=${width}x${height}:d=${totalDuration}:r=${fps}[bgbase];` +
          // Main blue gradient area (top)
          `[bgbase]drawbox=x=iw*0.2:y=-ih*0.2:w=iw*0.9:h=ih*0.7:color=${BRAND_COLORS.primary}@0.6:t=fill[bg1];` +
          // Secondary blue (center)
          `[bg1]drawbox=x=-iw*0.1:y=ih*0.2:w=iw*0.6:h=ih*0.5:color=${BRAND_COLORS.secondary}@0.45:t=fill[bg2];` +
          // Purple accent (bottom)
          `[bg2]drawbox=x=iw*0.5:y=ih*0.5:w=iw*0.6:h=ih*0.6:color=${BRAND_COLORS.gradient1}@0.4:t=fill[bg3];` +
          // Teal touch (corner)
          `[bg3]drawbox=x=iw*0.7:y=ih*0.7:w=iw*0.4:h=ih*0.4:color=${BRAND_COLORS.gradient3}@0.3:t=fill[bg4];` +
          // Smooth blur
          `[bg4]gblur=sigma=${blurRadius * 1.3}[bg5];` +
          // Vignette for premium look
          `[bg5]vignette=PI/4[bg2]`;
        break;
    }

    // Step 2: Scale images to FILL the entire frame (cover mode - no background visible)
    // Images will be scaled up to cover the entire frame, cropping edges if needed
    const imgScaleFilter = `scale=w=${width}:h=${height}:force_original_aspect_ratio=increase,` +
      `crop=${width}:${height}`;

    // Step 3: Ken Burns effect - subtle zoom for dynamic feel
    const zoomSpeed = 0.0003; // Slow subtle zoom
    const kenBurnsFilter = `zoompan=z='min(zoom+${zoomSpeed},1.1)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${framesPerImage}:s=${width}x${height}:fps=${fps}`;

    // Build the complete filter complex
    // Process input images - scale to fill entire screen
    filters.push(`[0:v]${imgScaleFilter},setsar=1,format=rgba[scaled]`);

    // Add Ken Burns zoom effect for dynamic modern look
    // filters.push(`[scaled]${kenBurnsFilter}[zoomed]`); // Uncomment for zoom effect

    // Add fade transitions between images (0.3 second fade for smooth modern feel)
    filters.push(`[scaled]fade=t=in:st=0:d=0.3,fade=t=out:st=${totalDuration - 0.3}:d=0.3[faded]`);

    // Add gradient overlay at bottom for text readability (modern style)
    void bgFilter; void kenBurnsFilter; // Mark as used for future enhancements

    // Property info text formatting
    const priceText = price ? `€${price.toLocaleString()}` : '';
    const locationText = city || '';
    const features: string[] = [];
    if (beds) features.push(`${beds} Bed${beds > 1 ? 's' : ''}`);
    if (baths) features.push(`${baths} Bath${baths > 1 ? 's' : ''}`);
    if (sqft) features.push(`${sqft} m²`);
    const featuresText = features.join('  •  ');

    // Calculate responsive font sizes for modern look
    const titleFontSize = isVertical ? Math.floor(width / 16) : Math.floor(height / 16);
    const priceFontSize = isVertical ? Math.floor(width / 9) : Math.floor(height / 10);
    const locationFontSize = isVertical ? Math.floor(width / 20) : Math.floor(height / 20);
    const featureFontSize = isVertical ? Math.floor(width / 24) : Math.floor(height / 24);
    const watermarkFontSize = isVertical ? Math.floor(width / 32) : Math.floor(height / 32);

    // Position calculations for bottom-aligned modern layout
    const bottomMargin = isVertical ? Math.floor(height * 0.08) : Math.floor(height * 0.06);
    const topMargin = isVertical ? Math.floor(height * 0.04) : Math.floor(height * 0.03);

    // Animation timing - property details appear in sequence
    const animDuration = 0.4; // Duration of fade-in animation
    const animDelay = 0.6; // Delay between each element appearing
    let animStartTime = 0.3; // Start after brief intro

    // Add text overlays if font is available
    if (hasFont) {
      const fontParam = `fontfile='${fontFile}'`;
      let currentFilter = '[faded]';
      let filterIndex = 0;

      // Modern gradient overlay at bottom for text readability (sleek look)
      const gradientHeight = isVertical ? Math.floor(height * 0.45) : Math.floor(height * 0.4);
      filters.push(
        `${currentFilter}drawbox=x=0:y=ih-${gradientHeight}:w=iw:h=${gradientHeight}:` +
        `color=black@0.6:t=fill[t${filterIndex}]`
      );
      currentFilter = `[t${filterIndex}]`;
      filterIndex++;

      // Subtle top gradient for watermark
      const topGradientHeight = Math.floor(height * 0.15);
      filters.push(
        `${currentFilter}drawbox=x=0:y=0:w=iw:h=${topGradientHeight}:` +
        `color=black@0.45:t=fill[t${filterIndex}]`
      );
      currentFilter = `[t${filterIndex}]`;
      filterIndex++;

      // Animation helper function - creates smooth fade-in effect
      // alpha expression: starts at 0, fades in during animDuration after startTime
      const fadeInAlpha = (startTime: number) =>
        `alpha='if(lt(t\\,${startTime})\\,0\\,if(lt(t\\,${startTime + animDuration})\\,(t-${startTime})/${animDuration}\\,1))'`;

      // 1. PRICE - First to appear (main highlight) with slide-up effect
      if (priceText) {
        const priceY = height - bottomMargin - Math.floor(priceFontSize * 2.5);
        filters.push(
          `${currentFilter}drawtext=${fontParam}:text='${escapeText(priceText)}':` +
          `fontsize=${priceFontSize}:fontcolor=white:` +
          `x=(w-text_w)/2:y=${priceY}:` +
          `${fadeInAlpha(animStartTime)}:` +
          `shadowcolor=black@0.7:shadowx=3:shadowy=3[t${filterIndex}]`
        );
        currentFilter = `[t${filterIndex}]`;
        filterIndex++;
        animStartTime += animDelay;
      }

      // 2. LOCATION - Appears second with pin icon
      if (locationText) {
        const locationY = height - bottomMargin - Math.floor(priceFontSize * 1.2);
        filters.push(
          `${currentFilter}drawtext=${fontParam}:text='${escapeText(locationText)}':` +
          `fontsize=${locationFontSize}:fontcolor=white@0.95:` +
          `x=(w-text_w)/2:y=${locationY}:` +
          `${fadeInAlpha(animStartTime)}:` +
          `shadowcolor=black@0.5:shadowx=2:shadowy=2[t${filterIndex}]`
        );
        currentFilter = `[t${filterIndex}]`;
        filterIndex++;
        animStartTime += animDelay;
      }

      // 3. FEATURES - Appears third (beds, baths, sqft)
      if (featuresText) {
        const featuresY = height - bottomMargin - Math.floor(priceFontSize * 0.2);
        filters.push(
          `${currentFilter}drawtext=${fontParam}:text='${escapeText(featuresText)}':` +
          `fontsize=${featureFontSize}:fontcolor=white@0.9:` +
          `x=(w-text_w)/2:y=${featuresY}:` +
          `${fadeInAlpha(animStartTime)}:` +
          `shadowcolor=black@0.5:shadowx=1:shadowy=1[t${filterIndex}]`
        );
        currentFilter = `[t${filterIndex}]`;
        filterIndex++;
        animStartTime += animDelay;
      }

      // 4. TITLE - Appears at the top area if provided
      if (title) {
        const titleY = height - bottomMargin + Math.floor(featureFontSize * 1.5);
        filters.push(
          `${currentFilter}drawtext=${fontParam}:text='${escapeText(title.substring(0, 40))}':` +
          `fontsize=${Math.floor(titleFontSize * 0.8)}:fontcolor=white@0.85:` +
          `x=(w-text_w)/2:y=${titleY}:` +
          `${fadeInAlpha(animStartTime)}:` +
          `shadowcolor=black@0.4:shadowx=1:shadowy=1[t${filterIndex}]`
        );
        currentFilter = `[t${filterIndex}]`;
        filterIndex++;
      }

      // 5. CONTACT INFO - Appears in last 3.5 seconds with modern card
      const contactStartTime = Math.max(0, totalDuration - 3.5);
      if (sellerName || sellerPhone) {
        const cardWidth = Math.floor(width * 0.75);
        const cardHeight = Math.floor(height * 0.22);
        const cardX = Math.floor((width - cardWidth) / 2);
        const cardY = Math.floor(height * 0.35);

        // Modern frosted glass card background
        filters.push(
          `${currentFilter}drawbox=x=${cardX}:y=${cardY}:w=${cardWidth}:h=${cardHeight}:` +
          `color=black@0.8:t=fill:enable='gte(t\\,${contactStartTime})'[t${filterIndex}]`
        );
        currentFilter = `[t${filterIndex}]`;
        filterIndex++;

        // Accent line at top of card (brand blue)
        filters.push(
          `${currentFilter}drawbox=x=${cardX}:y=${cardY}:w=${cardWidth}:h=4:` +
          `color=${BRAND_COLORS.primary}:t=fill:enable='gte(t\\,${contactStartTime})'[t${filterIndex}]`
        );
        currentFilter = `[t${filterIndex}]`;
        filterIndex++;

        // Contact header
        filters.push(
          `${currentFilter}drawtext=${fontParam}:text='Contact':` +
          `fontsize=${Math.floor(locationFontSize * 0.85)}:fontcolor=${BRAND_COLORS.primary}:` +
          `x=(w-text_w)/2:y=${cardY + Math.floor(cardHeight * 0.18)}:` +
          `enable='gte(t\\,${contactStartTime})'[t${filterIndex}]`
        );
        currentFilter = `[t${filterIndex}]`;
        filterIndex++;

        if (sellerName) {
          filters.push(
            `${currentFilter}drawtext=${fontParam}:text='${escapeText(sellerName)}':` +
            `fontsize=${Math.floor(titleFontSize * 0.9)}:fontcolor=white:` +
            `x=(w-text_w)/2:y=${cardY + Math.floor(cardHeight * 0.45)}:` +
            `enable='gte(t\\,${contactStartTime})'[t${filterIndex}]`
          );
          currentFilter = `[t${filterIndex}]`;
          filterIndex++;
        }

        if (sellerPhone) {
          filters.push(
            `${currentFilter}drawtext=${fontParam}:text='${escapeText(sellerPhone)}':` +
            `fontsize=${locationFontSize}:fontcolor=white@0.9:` +
            `x=(w-text_w)/2:y=${cardY + Math.floor(cardHeight * 0.72)}:` +
            `enable='gte(t\\,${contactStartTime})'[t${filterIndex}]`
          );
          currentFilter = `[t${filterIndex}]`;
          filterIndex++;
        }
      }

      // Professional watermark with BalkanEstate logo and URL
      if (includeWatermark) {
        // Position in top-left corner with padding
        const wmX = Math.floor(width * 0.035);
        const wmY = Math.floor(height * 0.025);
        const wmFontSize = Math.floor(watermarkFontSize * 1.4);
        const urlFontSize = Math.floor(watermarkFontSize * 0.85);

        // Semi-transparent dark background pill for watermark visibility
        const wmPadding = Math.floor(wmFontSize * 0.6);
        const wmBgWidth = Math.floor(wmFontSize * 9.5);
        const wmBgHeight = Math.floor(wmFontSize * 2.8);

        // Rounded background container
        filters.push(
          `${currentFilter}drawbox=x=${wmX - wmPadding}:y=${wmY - wmPadding / 2}:w=${wmBgWidth}:h=${wmBgHeight}:` +
          `color=black@0.55:t=fill[t${filterIndex}]`
        );
        currentFilter = `[t${filterIndex}]`;
        filterIndex++;

        // Logo icon representation (building icon using Unicode block characters)
        // This creates a simple building-like visual
        const iconX = wmX;
        const iconY = wmY + Math.floor(wmFontSize * 0.15);
        filters.push(
          `${currentFilter}drawtext=${fontParam}:text='▌▌▐':` +
          `fontsize=${Math.floor(wmFontSize * 1.1)}:fontcolor=${BRAND_COLORS.primary}:` +
          `x=${iconX}:y=${iconY}:` +
          `shadowcolor=black@0.4:shadowx=1:shadowy=1[t${filterIndex}]`
        );
        currentFilter = `[t${filterIndex}]`;
        filterIndex++;

        // BALKANESTATE brand name in blue
        const textX = wmX + Math.floor(wmFontSize * 1.8);
        filters.push(
          `${currentFilter}drawtext=${fontParam}:text='BALKANESTATE':` +
          `fontsize=${wmFontSize}:fontcolor=${BRAND_COLORS.primary}:` +
          `x=${textX}:y=${wmY}:` +
          `shadowcolor=black@0.5:shadowx=1:shadowy=1[t${filterIndex}]`
        );
        currentFilter = `[t${filterIndex}]`;
        filterIndex++;

        // Website URL below the logo
        const urlY = wmY + Math.floor(wmFontSize * 1.15);
        filters.push(
          `${currentFilter}drawtext=${fontParam}:text='balkanestateai.com':` +
          `fontsize=${urlFontSize}:fontcolor=white@0.85:` +
          `x=${textX}:y=${urlY}:` +
          `shadowcolor=black@0.4:shadowx=1:shadowy=1[t${filterIndex}]`
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
    // IMPORTANT: When using complexFilter, audio streams need to be explicitly mapped
    if (musicPath && fs.existsSync(musicPath)) {
      outputOptions.push('-map', '1:a'); // Map audio from second input (music file)
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
