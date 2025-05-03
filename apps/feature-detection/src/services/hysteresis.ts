export function hysteresis(strong: Uint8Array, weak: Uint8Array, width: number, height: number): Buffer {
  const result = Buffer.from(strong);

  const isStrong = (x: number, y: number): boolean => {
    const idx = y * width + x;
    return result[idx] === 255;
  };

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (weak[idx] === 255) {
        // If any neighbor is strong, promote to strong
        let connected = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (isStrong(x + dx, y + dy)) connected = true;
          }
        }
        if (connected) {
          result[idx] = 255;
        } else {
          result[idx] = 0;
        }
      }
    }
  }

  return result;
}