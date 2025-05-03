export function applyConvolution(
    imageData: Buffer,
    width: number,
    height: number,
    channels: number,
    kernel: number[][]
): Buffer {
    const result = Buffer.alloc(imageData.length);
    const kSize = kernel.length;
    const kHalf = Math.floor(kSize / 2);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            for (let c = 0; c < channels; c++) {
                let sum = 0;
                for (let ky = 0; ky < kSize; ky++) {
                    for (let kx = 0; kx < kSize; kx++) {
                        const px = Math.min(Math.max(x + kx - kHalf, 0), width - 1);
                        const py = Math.min(Math.max(y + ky - kHalf, 0), height - 1);
                        const weight = kernel[ky][kx];
                        const pixelIndex = (py * width + px) * channels + c;
                        sum += imageData[pixelIndex] * weight;
                    }
                }
                const pixelIndex = (y * width + x) * channels + c;
                result[pixelIndex] = Math.min(255, Math.max(0, Math.round(sum)));
            }
        }
    }
    return result;
}
