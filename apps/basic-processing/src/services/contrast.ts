/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { MessagePattern } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ContrastService {
  private applyContrast(imageData: Buffer, width: number, height: number, channels: number, contrast: number): Buffer {
    const result = Buffer.alloc(imageData.length);
    // contrast: 1.0 = no change, >1 = more contrast, <1 = less contrast
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        for (let c = 0; c < channels; c++) {
          const pixelIndex = (y * width + x) * channels + c;
          // Only apply to RGB, leave alpha unchanged
          if (c < 3) {
            const pixel = imageData[pixelIndex];
            const newValue = (pixel - 128) * contrast + 128;
            result[pixelIndex] = Math.max(0, Math.min(255, Math.round(newValue)));
          } else {
            result[pixelIndex] = imageData[pixelIndex];
          }
        }
      }
    }
    return result;
  }

  @MessagePattern({ cmd: 'adjust_contrast' })
  async adjust(data: { imagePath: string; contrast: number }) {
    try {
      const { imagePath, contrast } = data;

      if (!fs.existsSync(imagePath)) {
        throw new Error('File does not exist');
      }

      const outputDir = path.join(process.cwd(), 'apps/basic-processing/output_images');
      const outputFileName = `contrast_${contrast}_image.png`;
      const outputFilePath = path.join(outputDir, outputFileName);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const image = sharp(imagePath);
      const metadata = await image.metadata();
      const { width, height, channels = 3 } = metadata;

      const rawData = await image.raw().toBuffer();

      // Map input contrast (e.g., 0-100) to a float (e.g., 1.0 = no change)
      const contrastFactor = 1 + (contrast / 100);

      const contrastedBuffer = this.applyContrast(rawData, width!, height!, channels, contrastFactor);

      // Save the contrasted image
      await sharp(contrastedBuffer, {
        raw: {
          width: width!,
          height: height!,
          channels: channels
        }
      })
        .png()
        .toFile(outputFilePath);

      return {
        success: true,
        message: 'Contrast adjusted successfully',
        savedImagePath: outputFilePath,
      };
    } catch (error) {
      console.error('Contrast adjustment error:', error);
      return {
        success: false,
        message: 'Failed to adjust contrast',
        error: error.message,
      };
    }
  }
}
