import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

export interface CompressionOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  lossless?: boolean;
}

export class ImageCompressionService {
  private static readonly DEFAULT_OPTIONS: CompressionOptions = {
    quality: 90,
    maxWidth: 2048,
    maxHeight: 2048,
    format: 'webp',
    lossless: true
  };

  /**
   * Compress an image with lossless or lossy compression
   * @param inputPath Path to the input image
   * @param outputPath Path where compressed image will be saved
   * @param options Compression options
   */
  static async compressImage(
    inputPath: string,
    outputPath: string,
    options: CompressionOptions = {}
  ): Promise<{
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    format: string;
  }> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    // Get original file size
    const stats = await fs.stat(inputPath);
    const originalSize = stats.size;

    // Create sharp instance
    let sharpInstance = sharp(inputPath);

    // Get metadata for dimension checks
    const metadata = await sharpInstance.metadata();
    
    // Resize if needed (maintaining aspect ratio)
    if (metadata.width && metadata.height) {
      if (metadata.width > opts.maxWidth! || metadata.height > opts.maxHeight!) {
        sharpInstance = sharpInstance.resize(opts.maxWidth, opts.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }
    }

    // Apply format-specific compression
    switch (opts.format) {
      case 'png':
        sharpInstance = sharpInstance.png({
          compressionLevel: opts.lossless ? 9 : 6,
          palette: !opts.lossless,
          quality: opts.quality
        });
        break;
      
      case 'jpeg':
        sharpInstance = sharpInstance.jpeg({
          quality: opts.quality,
          progressive: true,
          mozjpeg: true
        });
        break;
      
      case 'webp':
        sharpInstance = sharpInstance.webp({
          quality: opts.quality,
          lossless: opts.lossless,
          nearLossless: opts.lossless,
          smartSubsample: true,
          effort: 6
        });
        break;
      
      case 'avif':
        sharpInstance = sharpInstance.avif({
          quality: opts.quality,
          lossless: opts.lossless,
          effort: 6
        });
        break;
      
      default:
        // Auto-detect best format based on input
        if (metadata.format === 'png' && opts.lossless) {
          sharpInstance = sharpInstance.png({
            compressionLevel: 9,
            quality: opts.quality
          });
        } else {
          sharpInstance = sharpInstance.webp({
            quality: opts.quality,
            lossless: opts.lossless,
            nearLossless: opts.lossless,
            smartSubsample: true,
            effort: 6
          });
        }
    }

    // Save compressed image
    await sharpInstance.toFile(outputPath);

    // Get compressed file size
    const compressedStats = await fs.stat(outputPath);
    const compressedSize = compressedStats.size;

    return {
      originalSize,
      compressedSize,
      compressionRatio: (1 - compressedSize / originalSize) * 100,
      format: opts.format || 'auto'
    };
  }

  /**
   * Compress image from buffer
   */
  static async compressImageBuffer(
    inputBuffer: Buffer,
    options: CompressionOptions = {}
  ): Promise<{
    buffer: Buffer;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    format: string;
  }> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const originalSize = inputBuffer.length;

    let sharpInstance = sharp(inputBuffer);

    // Get metadata for dimension checks
    const metadata = await sharpInstance.metadata();
    
    // Resize if needed
    if (metadata.width && metadata.height) {
      if (metadata.width > opts.maxWidth! || metadata.height > opts.maxHeight!) {
        sharpInstance = sharpInstance.resize(opts.maxWidth, opts.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }
    }

    // Apply format-specific compression
    let outputBuffer: Buffer;
    
    switch (opts.format) {
      case 'png':
        outputBuffer = await sharpInstance.png({
          compressionLevel: opts.lossless ? 9 : 6,
          palette: !opts.lossless,
          quality: opts.quality
        }).toBuffer();
        break;
      
      case 'jpeg':
        outputBuffer = await sharpInstance.jpeg({
          quality: opts.quality,
          progressive: true,
          mozjpeg: true
        }).toBuffer();
        break;
      
      case 'webp':
        outputBuffer = await sharpInstance.webp({
          quality: opts.quality,
          lossless: opts.lossless,
          nearLossless: opts.lossless,
          smartSubsample: true,
          effort: 6
        }).toBuffer();
        break;
      
      case 'avif':
        outputBuffer = await sharpInstance.avif({
          quality: opts.quality,
          lossless: opts.lossless,
          effort: 6
        }).toBuffer();
        break;
      
      default:
        outputBuffer = await sharpInstance.webp({
          quality: opts.quality,
          lossless: opts.lossless,
          nearLossless: opts.lossless,
          smartSubsample: true,
          effort: 6
        }).toBuffer();
    }

    const compressedSize = outputBuffer.length;

    return {
      buffer: outputBuffer,
      originalSize,
      compressedSize,
      compressionRatio: (1 - compressedSize / originalSize) * 100,
      format: opts.format || 'webp'
    };
  }

  /**
   * Generate thumbnail from image
   */
  static async generateThumbnail(
    inputPath: string,
    outputPath: string,
    width: number = 200,
    height: number = 200
  ): Promise<void> {
    await sharp(inputPath)
      .resize(width, height, {
        fit: 'cover',
        position: 'centre'
      })
      .webp({ quality: 85 })
      .toFile(outputPath);
  }

  /**
   * Get image metadata from file path
   */
  static async getImageMetadata(inputPath: string): Promise<sharp.Metadata> {
    return await sharp(inputPath).metadata();
  }

  /**
   * Get image metadata from buffer
   */
  static async getImageMetadataFromBuffer(inputBuffer: Buffer): Promise<sharp.Metadata> {
    return await sharp(inputBuffer).metadata();
  }

  /**
   * Batch compress multiple images
   */
  static async batchCompress(
    files: Array<{ input: string; output: string }>,
    options: CompressionOptions = {}
  ): Promise<Array<{
    file: string;
    success: boolean;
    result?: any;
    error?: string;
  }>> {
    const results = [];

    for (const file of files) {
      try {
        const result = await this.compressImage(file.input, file.output, options);
        results.push({
          file: file.input,
          success: true,
          result
        });
      } catch (error) {
        results.push({
          file: file.input,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Optimize image for web (creates multiple sizes)
   */
  static async optimizeForWeb(
    inputPath: string,
    outputDir: string,
    filename: string
  ): Promise<{
    original: string;
    thumbnail: string;
    medium: string;
    large: string;
  }> {
    const ext = '.webp';
    
    // Create different sizes
    const sizes = {
      thumbnail: { width: 150, height: 150, suffix: '_thumb' },
      medium: { width: 600, height: 600, suffix: '_medium' },
      large: { width: 1200, height: 1200, suffix: '_large' }
    };

    const result: any = {
      original: path.join(outputDir, `${filename}${ext}`)
    };

    // Compress original
    await this.compressImage(inputPath, result.original, {
      format: 'webp',
      lossless: true,
      maxWidth: 2048,
      maxHeight: 2048
    });

    // Generate different sizes
    for (const [key, config] of Object.entries(sizes)) {
      const outputPath = path.join(outputDir, `${filename}${config.suffix}${ext}`);
      await sharp(inputPath)
        .resize(config.width, config.height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 85 })
        .toFile(outputPath);
      result[key] = outputPath;
    }

    return result;
  }
}