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
  agencyName?: string; // Agency name for agents
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
    agencyName,
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
      agencyName,
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
  agencyName?: string;
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
    agencyName,
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

    // No fade-in (instant image), only fade-out at end
    filters.push(`[scaled]fade=t=out:st=${totalDuration - 0.3}:d=0.3[faded]`);

    // Add gradient overlay at bottom for text readability (modern style)
    void bgFilter; void kenBurnsFilter; // Mark as used for future enhancements

    // Property info text formatting - cleaner display
    const priceText = price ? `€${price.toLocaleString()}` : '';
    const locationText = city || '';
    const features: string[] = [];
    if (beds) features.push(`${beds} Bed${beds > 1 ? 's' : ''}`);
    if (baths) features.push(`${baths} Bath${baths > 1 ? 's' : ''}`);
    if (sqft) features.push(`${sqft} m²`);
    const featuresText = features.join('   |   ');

    // Calculate responsive font sizes - premium typography
    const titleFontSize = isVertical ? Math.floor(width / 18) : Math.floor(height / 18);
    const priceFontSize = isVertical ? Math.floor(width / 8) : Math.floor(height / 9);
    const locationFontSize = isVertical ? Math.floor(width / 22) : Math.floor(height / 22);
    const featureFontSize = isVertical ? Math.floor(width / 26) : Math.floor(height / 26);
    const watermarkFontSize = isVertical ? Math.floor(width / 30) : Math.floor(height / 30);

    // Position calculations for elegant bottom-aligned layout
    const bottomMargin = isVertical ? Math.floor(height * 0.1) : Math.floor(height * 0.08);

    // Animation timing - instant reveal, no delay
    const animDuration = 0.35; // Smooth fade-in
    const animDelay = 0.3; // Staggered appearance
    let animStartTime = 0; // Start immediately (no black screen)

    // Add text overlays if font is available
    if (hasFont) {
      const fontParam = `fontfile='${fontFile}'`;
      let currentFilter = '[faded]';
      let filterIndex = 0;

      // Premium gradient overlay at bottom - ultra-smooth multi-layer fade
      const gradientHeight = isVertical ? Math.floor(height * 0.55) : Math.floor(height * 0.5);
      // 6 gradient layers for silky smooth transition
      const gradientLayers = [
        { y: 1.0, h: 0.15, opacity: 0.05 },   // Layer 1: Very subtle start
        { y: 0.85, h: 0.15, opacity: 0.12 },  // Layer 2
        { y: 0.70, h: 0.15, opacity: 0.22 },  // Layer 3
        { y: 0.55, h: 0.15, opacity: 0.35 },  // Layer 4
        { y: 0.40, h: 0.20, opacity: 0.50 },  // Layer 5
        { y: 0.20, h: 0.20, opacity: 0.70 },  // Layer 6: Darkest at bottom
      ];

      for (const layer of gradientLayers) {
        const layerY = Math.floor(gradientHeight * layer.y);
        const layerH = Math.floor(gradientHeight * layer.h);
        filters.push(
          `${currentFilter}drawbox=x=0:y=ih-${layerY}:w=iw:h=${layerH}:` +
          `color=black@${layer.opacity}:t=fill[t${filterIndex}]`
        );
        currentFilter = `[t${filterIndex}]`;
        filterIndex++;
      }

      // Elegant top gradient for watermark - subtle and professional
      const topGradientHeight = Math.floor(height * 0.15);
      filters.push(
        `${currentFilter}drawbox=x=0:y=0:w=iw:h=${Math.floor(topGradientHeight * 0.6)}:` +
        `color=black@0.4:t=fill[t${filterIndex}]`
      );
      currentFilter = `[t${filterIndex}]`;
      filterIndex++;
      filters.push(
        `${currentFilter}drawbox=x=0:y=${Math.floor(topGradientHeight * 0.6)}:w=iw:h=${Math.floor(topGradientHeight * 0.4)}:` +
        `color=black@0.2:t=fill[t${filterIndex}]`
      );
      currentFilter = `[t${filterIndex}]`;
      filterIndex++;

      // Animation helper - elegant slide-up with fade
      // Creates text that slides up from below while fading in
      const slideOffset = Math.floor(height * 0.03); // How far text slides up

      const slideUpY = (targetY: number, startTime: number) =>
        `y='if(lt(t\\,${startTime})\\,${targetY + slideOffset}\\,if(lt(t\\,${startTime + animDuration})\\,${targetY + slideOffset}-(${slideOffset}*(t-${startTime})/${animDuration})\\,${targetY}))'`;

      const fadeInAlpha = (startTime: number) =>
        `alpha='if(lt(t\\,${startTime})\\,0\\,if(lt(t\\,${startTime + animDuration})\\,(t-${startTime})/${animDuration}\\,1))'`;

      // 1. PRICE - Large, elegant, with slide-up animation
      if (priceText) {
        const priceY = height - bottomMargin - Math.floor(priceFontSize * 3.2);
        filters.push(
          `${currentFilter}drawtext=${fontParam}:text='${escapeText(priceText)}':` +
          `fontsize=${priceFontSize}:fontcolor=white:` +
          `x=(w-text_w)/2:${slideUpY(priceY, animStartTime)}:` +
          `${fadeInAlpha(animStartTime)}:` +
          `shadowcolor=black@0.4:shadowx=2:shadowy=3[t${filterIndex}]`
        );
        currentFilter = `[t${filterIndex}]`;
        filterIndex++;
        animStartTime += animDelay;
      }

      // 2. LOCATION - Elegant smaller text below price
      if (locationText) {
        const locationY = height - bottomMargin - Math.floor(priceFontSize * 1.8);
        filters.push(
          `${currentFilter}drawtext=${fontParam}:text='${escapeText(locationText)}':` +
          `fontsize=${locationFontSize}:fontcolor=white@0.95:` +
          `x=(w-text_w)/2:${slideUpY(locationY, animStartTime)}:` +
          `${fadeInAlpha(animStartTime)}:` +
          `shadowcolor=black@0.3:shadowx=1:shadowy=2[t${filterIndex}]`
        );
        currentFilter = `[t${filterIndex}]`;
        filterIndex++;
        animStartTime += animDelay;
      }

      // 3. FEATURES - Clean minimal style with slide-up
      if (featuresText) {
        const featuresY = height - bottomMargin - Math.floor(priceFontSize * 0.5);
        filters.push(
          `${currentFilter}drawtext=${fontParam}:text='${escapeText(featuresText)}':` +
          `fontsize=${featureFontSize}:fontcolor=white@0.85:` +
          `x=(w-text_w)/2:${slideUpY(featuresY, animStartTime)}:` +
          `${fadeInAlpha(animStartTime)}:` +
          `shadowcolor=black@0.3:shadowx=1:shadowy=1[t${filterIndex}]`
        );
        currentFilter = `[t${filterIndex}]`;
        filterIndex++;
        animStartTime += animDelay;
      }

      // 4. TITLE - Small elegant subtitle
      if (title) {
        const titleY = height - bottomMargin + Math.floor(featureFontSize * 1.0);
        filters.push(
          `${currentFilter}drawtext=${fontParam}:text='${escapeText(title.substring(0, 35))}':` +
          `fontsize=${Math.floor(titleFontSize * 0.7)}:fontcolor=white@0.7:` +
          `x=(w-text_w)/2:${slideUpY(titleY, animStartTime)}:` +
          `${fadeInAlpha(animStartTime)}:` +
          `shadowcolor=black@0.25:shadowx=1:shadowy=1[t${filterIndex}]`
        );
        currentFilter = `[t${filterIndex}]`;
        filterIndex++;
      }

      // 5. CONTACT INFO - Modern floating card with fade-in animation
      const contactStartTime = Math.max(0, totalDuration - 3.5);
      const contactAnimDuration = 0.4;
      if (sellerName || sellerPhone || agencyName) {
        const cardWidth = Math.floor(width * 0.65);
        // Increase card height if agency name is present
        const cardHeight = Math.floor(height * (agencyName ? 0.18 : 0.15));
        const cardX = Math.floor((width - cardWidth) / 2);
        const cardY = Math.floor(height * 0.38);

        // Card fade-in alpha
        const cardFadeAlpha = `enable='gte(t\\,${contactStartTime})'`;
        const cardFadeAlphaText = (offset: number) =>
          `alpha='if(lt(t\\,${contactStartTime + offset})\\,0\\,if(lt(t\\,${contactStartTime + offset + contactAnimDuration})\\,(t-${contactStartTime + offset})/${contactAnimDuration}\\,1))'`;

        // Modern glass card background with subtle transparency
        filters.push(
          `${currentFilter}drawbox=x=${cardX}:y=${cardY}:w=${cardWidth}:h=${cardHeight}:` +
          `color=black@0.75:t=fill:${cardFadeAlpha}[t${filterIndex}]`
        );
        currentFilter = `[t${filterIndex}]`;
        filterIndex++;

        // Elegant blue accent line at top
        filters.push(
          `${currentFilter}drawbox=x=${cardX}:y=${cardY}:w=${cardWidth}:h=4:` +
          `color=${BRAND_COLORS.primary}:t=fill:${cardFadeAlpha}[t${filterIndex}]`
        );
        currentFilter = `[t${filterIndex}]`;
        filterIndex++;

        // Calculate vertical positions based on content
        const hasAllFields = sellerName && agencyName && sellerPhone;
        const hasNameAndAgency = sellerName && agencyName && !sellerPhone;

        // Name with slide-up effect
        if (sellerName) {
          const nameY = cardY + Math.floor(cardHeight * (hasAllFields ? 0.25 : hasNameAndAgency ? 0.35 : 0.38));
          filters.push(
            `${currentFilter}drawtext=${fontParam}:text='${escapeText(sellerName)}':` +
            `fontsize=${Math.floor(titleFontSize * 0.8)}:fontcolor=white:` +
            `x=(w-text_w)/2:${slideUpY(nameY, contactStartTime + 0.1)}:` +
            `${cardFadeAlphaText(0.1)}:` +
            `shadowcolor=black@0.3:shadowx=1:shadowy=1[t${filterIndex}]`
          );
          currentFilter = `[t${filterIndex}]`;
          filterIndex++;
        }

        // Agency name with slide-up effect (shown below seller name)
        if (agencyName) {
          const agencyY = cardY + Math.floor(cardHeight * (hasAllFields ? 0.5 : 0.55));
          filters.push(
            `${currentFilter}drawtext=${fontParam}:text='${escapeText(agencyName)}':` +
            `fontsize=${Math.floor(locationFontSize * 0.9)}:fontcolor=${BRAND_COLORS.secondary}:` +
            `x=(w-text_w)/2:${slideUpY(agencyY, contactStartTime + 0.15)}:` +
            `${cardFadeAlphaText(0.15)}:` +
            `shadowcolor=black@0.3:shadowx=1:shadowy=1[t${filterIndex}]`
          );
          currentFilter = `[t${filterIndex}]`;
          filterIndex++;
        }

        // Phone with slide-up effect
        if (sellerPhone) {
          const phoneY = cardY + Math.floor(cardHeight * (hasAllFields ? 0.75 : 0.68));
          filters.push(
            `${currentFilter}drawtext=${fontParam}:text='${escapeText(sellerPhone)}':` +
            `fontsize=${Math.floor(locationFontSize * 0.85)}:fontcolor=white@0.9:` +
            `x=(w-text_w)/2:${slideUpY(phoneY, contactStartTime + 0.2)}:` +
            `${cardFadeAlphaText(0.2)}:` +
            `shadowcolor=black@0.3:shadowx=1:shadowy=1[t${filterIndex}]`
          );
          currentFilter = `[t${filterIndex}]`;
          filterIndex++;
        }
      }

      // Elegant watermark - BalkanEstateAI branding
      if (includeWatermark) {
        // Position in top-left corner
        const wmX = Math.floor(width * 0.04);
        const wmY = Math.floor(height * 0.04);
        const wmFontSize = Math.floor(watermarkFontSize * 1.2);
        const urlFontSize = Math.floor(watermarkFontSize * 0.7);

        // BalkanEstateAI brand name - modern styling
        filters.push(
          `${currentFilter}drawtext=${fontParam}:text='BalkanEstateAI':` +
          `fontsize=${wmFontSize}:fontcolor=white:` +
          `x=${wmX}:y=${wmY}:` +
          `shadowcolor=black@0.6:shadowx=2:shadowy=2[t${filterIndex}]`
        );
        currentFilter = `[t${filterIndex}]`;
        filterIndex++;

        // Website URL below
        const urlY = wmY + Math.floor(wmFontSize * 1.15);
        filters.push(
          `${currentFilter}drawtext=${fontParam}:text='balkanestateai.com':` +
          `fontsize=${urlFontSize}:fontcolor=white@0.7:` +
          `x=${wmX}:y=${urlY}:` +
          `shadowcolor=black@0.5:shadowx=1:shadowy=1[t${filterIndex}]`
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
