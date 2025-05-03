/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { MessagePattern } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ResizeService {
  @MessagePattern({ cmd: 'resize_image' })
  async resize(data: { imagePath: string; width: number; height: number }) {
    try {
      const { imagePath, width, height } = data;

      if (!fs.existsSync(imagePath)) {
        throw new Error('File does not exist');
      }

      const outputDir = path.join(process.cwd(), 'apps/basic-processing/output_images');
      const outputFileName = 'resized_image.png';
      const outputFilePath = path.join(outputDir, outputFileName);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const inputImage = await fs.promises.readFile(imagePath);
      const { data: inputBuffer, info: inputInfo } = await sharp(inputImage).raw().toBuffer({ resolveWithObject: true });

      const resizedBuffer = this.bilinearInterpolation(inputBuffer, inputInfo.width, inputInfo.height, width, height, inputInfo.channels);

      // Save the resized image
      await sharp(resizedBuffer, {
        raw: {
          width: width,
          height: height,
          channels: inputInfo.channels,
        },
      })
        .png()
        .toFile(outputFilePath);

      return {
        success: true,
        message: 'Image resized successfully',
        savedImagePath: outputFilePath,
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private bilinearInterpolation(
    inputBuffer: Buffer,
    inputWidth: number,
    inputHeight: number,
    outputWidth: number,
    outputHeight: number,
    channels: number
  ): Buffer {
    const outputBuffer = Buffer.alloc(outputWidth * outputHeight * channels);
    for (let y = 0; y < outputHeight; y++) {
      const srcY = y * (inputHeight / outputHeight);
      const y0 = Math.floor(srcY);
      const y1 = Math.min(y0 + 1, inputHeight - 1);
      const yLerp = srcY - y0;
      for (let x = 0; x < outputWidth; x++) {
        const srcX = x * (inputWidth / outputWidth);
        const x0 = Math.floor(srcX);
        const x1 = Math.min(x0 + 1, inputWidth - 1);
        const xLerp = srcX - x0;
        for (let c = 0; c < channels; c++) {
          const i00 = (y0 * inputWidth + x0) * channels + c;
          const i01 = (y0 * inputWidth + x1) * channels + c;
          const i10 = (y1 * inputWidth + x0) * channels + c;
          const i11 = (y1 * inputWidth + x1) * channels + c;
          const v00 = inputBuffer[i00];
          const v01 = inputBuffer[i01];
          const v10 = inputBuffer[i10];
          const v11 = inputBuffer[i11];
          const v0 = v00 * (1 - xLerp) + v01 * xLerp;
          const v1 = v10 * (1 - xLerp) + v11 * xLerp;
          const value = v0 * (1 - yLerp) + v1 * yLerp;
          outputBuffer[(y * outputWidth + x) * channels + c] = Math.round(value);
        }
      }
    }
    return outputBuffer;
  }
}