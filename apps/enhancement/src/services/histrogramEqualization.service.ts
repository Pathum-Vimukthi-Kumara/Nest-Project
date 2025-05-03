import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { MessagePattern } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';
import { convertToGreyscale } from '../../../common/utils/greyscale';

@Injectable()
export class HistogramEqualizationService {
  @MessagePattern({ cmd: 'histogram_equalization' })
  async equalizeHistogram(imagePath: string) {
    try {
      if (!fs.existsSync(imagePath)) {
        throw new Error('File does not exist');
      }

      const outputDir = path.join(process.cwd(), 'apps/enhancement/output_images');
      const outputFileName = 'histogram_equalized.png';
      const outputFilePath = path.join(outputDir, outputFileName);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const { buffer: raw, width, height } = await convertToGreyscale(imagePath);

      // Compute histogram
      const histogram = new Array(256).fill(0);
      for (let i = 0; i < raw.length; i++) {
        histogram[raw[i]]++;
      }

      // Compute CDF
      const cdf = new Array(256).fill(0);
      cdf[0] = histogram[0];
      for (let i = 1; i < 256; i++) {
        cdf[i] = cdf[i - 1] + histogram[i];
      }
      // Find minimum nonzero CDF value
      const cdfMin = cdf.find(v => v > 0) ?? 0;
      const totalPixels = raw.length;
      const L = 256;
      // Map intensities
      const equalized = Buffer.alloc(raw.length);
      for (let i = 0; i < raw.length; i++) {
        const originalIntensity = raw[i];
        const newIntensity = Math.round((cdf[originalIntensity] - cdfMin) / (totalPixels - cdfMin) * (L - 1));
        equalized[i] = newIntensity;
      }

      await sharp(equalized, {
        raw: {
          width: width!,
          height: height!,
          channels: 1,
        },
      })
        .png()
        .toFile(outputFilePath);

      return {
        success: true,
        message: 'Histogram equalization complete',
        savedImagePath: outputFilePath,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
