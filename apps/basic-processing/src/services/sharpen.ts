import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { MessagePattern } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SharpenService {
  // Do not change the this kernel
  private readonly strongKernel = [
    [-1, -1, -1],
    [-1, 9, -1],
    [-1, -1, -1],
  ];

  private applyConvolution(
    imageData: Buffer,
    width: number,
    height: number,
    channels: number
  ): Buffer {
    const result = Buffer.alloc(imageData.length);
    const offset = 1;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        for (let c = 0; c < channels; c++) {
          if (c < 3) { // Only apply kernel to RGB
            let sum = 0;
            for (let ky = -offset; ky <= offset; ky++) {
              for (let kx = -offset; kx <= offset; kx++) {
                const px = Math.min(Math.max(x + kx, 0), width - 1);
                const py = Math.min(Math.max(y + ky, 0), height - 1);
                const weight = this.strongKernel[ky + offset][kx + offset];
                const sourceIndex = (py * width + px) * channels + c;
                sum += imageData[sourceIndex] * weight;
              }
            }
            const pixelIndex = (y * width + x) * channels + c;
            result[pixelIndex] = Math.min(255, Math.max(0, Math.round(sum)));
          } else {
            // Copy alpha channel unchanged
            const pixelIndex = (y * width + x) * channels + c;
            result[pixelIndex] = imageData[pixelIndex];
          }
        }
      }
    }

    return result;
  }

  @MessagePattern({ cmd: 'sharpen_image' })
  async sharpenImage(imagePath: string) {
    try {
      if (!fs.existsSync(imagePath)) {
        throw new Error('File does not exist');
      }

      const outputDir = path.join(process.cwd(), 'apps/basic-processing/output_images');
      const outputFilePath = path.join(outputDir, 'sharpened_image.png');
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      const image = sharp(imagePath);
      const metadata = await image.metadata();
      const { width, height, channels = 3 } = metadata;

      const imageBuffer = await image.raw().toBuffer();

      const sharpened = this.applyConvolution(imageBuffer, width!, height!, channels);

      await sharp(sharpened, {
        raw: {
          width: width!,
          height: height!,
          channels,
        },
      })
        .png({ compressionLevel: 6 })
        .toFile(outputFilePath);

      return {
        success: true,
        message: 'Image sharpened without resizing',
        savedImagePath: outputFilePath,
      };
    } catch (error) {
      console.error('Sharpening failed:', error);
      return {
        success: false,
        message: 'Image sharpening failed',
        error: error.message,
      };
    }
  }
}