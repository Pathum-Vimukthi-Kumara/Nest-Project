import * as sharp from 'sharp';

export async function convertToGreyscale(imagePath: string): Promise<{ buffer: Buffer, width: number, height: number }> {
  const { data, info } = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  // Output buffer: single channel (greyscale)
  const greyscaleBuffer = Buffer.alloc(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * channels];
    const g = data[i * channels + 1];
    const b = data[i * channels + 2];
    // Standard formula
    const y = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    greyscaleBuffer[i] = y;
  }
  return {
    buffer: greyscaleBuffer,
    width,
    height
  };
}
// If the image has an alpha channel, it is ignored for greyscale conversion.