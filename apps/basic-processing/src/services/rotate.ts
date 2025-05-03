import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { MessagePattern } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class RotateService {
  private rotatePixels(
    inputBuffer: Buffer,
    width: number,
    height: number,
    angle: number
  ): Buffer {
    const channels = 3;
    const outputBuffer = Buffer.alloc(width * height * channels);
    const radian = (angle * Math.PI) / 180;
    const centerX = width / 2;
    const centerY = height / 2;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Map (x, y) in output to (srcX, srcY) in input
        const dx = x - centerX;
        const dy = y - centerY;
        const srcX = Math.round(Math.cos(-radian) * dx - Math.sin(-radian) * dy + centerX);
        const srcY = Math.round(Math.sin(-radian) * dx + Math.cos(-radian) * dy + centerY);

        if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
          for (let c = 0; c < channels; c++) {
            const srcIdx = (srcY * width + srcX) * channels + c;
            const dstIdx = (y * width + x) * channels + c;
            outputBuffer[dstIdx] = inputBuffer[srcIdx];
          }
        }
      }
    }

    return outputBuffer;
  }

  @MessagePattern({ cmd: 'rotate_image' })
  async rotate(data: { imagePath: string; angle: number }) {
    try {
      const { imagePath, angle } = data;

      if (!fs.existsSync(imagePath)) {
        throw new Error('File does not exist');
      }

      const outputDir = path.join(process.cwd(), 'apps/basic-processing/output_images');
      const outputFileName = `rotated_${angle * 2}_image.png`;
      const outputFilePath = path.join(outputDir, outputFileName);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const image = sharp(imagePath);
      const metadata = await image.metadata();
      const { width, height } = metadata;

      const rawData = await image.raw().toBuffer();

      const rotatedBuffer = this.rotatePixels(rawData, width!, height!, angle / 4);

      // Save the rotated image
      await sharp(rotatedBuffer, {
        raw: {
          width: width!,
          height: height!,
          channels: 3
        }
      })
        .png()
        .toFile(outputFilePath);

      return {
        success: true,
        message: 'Image rotated successfully',
        savedImagePath: outputFilePath,
      };
    } catch (error) {
      console.error('Rotation error:', error);
      return {
        success: false,
        message: 'Failed to rotate image',
        error: error.message,
      };
    }
  }
}