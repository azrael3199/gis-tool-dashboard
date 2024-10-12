import { loadInBatches } from '@loaders.gl/core';
import { LASLoader } from '@loaders.gl/las';
import { convertToLocal, hslToRgb, rgbToHsl } from './transforms';
import { ProcessedData, ExtractedData } from './types';
import { TypedArray } from 'three';

export async function loadLasFile(file: File) {
  const batches = await loadInBatches(file, LASLoader);

  const allPositions = [];
  const allColors = [];
  const allIntensities = [];

  for await (const batch of batches) {
    // @ts-expect-error No type definition for batch
    const { attributes } = batch.data;

    const positions = attributes.POSITION.value; // Float32Array
    const colors = attributes.COLOR_0.value; // Uint8Array
    const intensities = attributes.intensity?.value;

    // Store the attributes from each batch
    allPositions.push(positions);
    allColors.push(colors);
    allIntensities.push(intensities);

    // Optional: Process each batch as it streams in
    console.log(`Processed batch with ${positions.length / 3} points`);
  }

  // Merge all batches into one large array
  const positions = new Float32Array(mergeArrays(allPositions));
  const colors = new Uint8Array(mergeArrays(allColors));
  const intensities = new Float32Array(mergeArrays(allIntensities));

  // Normalize intensities
  let maxIntensity = -Infinity;

  if (intensities) {
    for (let i = 0; i < intensities.length; i++) {
      if (intensities[i] > maxIntensity) {
        maxIntensity = intensities[i];
      }
    }
  }

  const normalizedIntensities = [];
  for (let i = 0; i < intensities.length; i++) {
    normalizedIntensities.push(intensities[i] / maxIntensity);
  }

  // Downsample for initial load
  const downsampleFactor = 10; // Adjust based on performance needs
  const downsampledPositions = downsample(positions, downsampleFactor, 3);

  const downsampledColors = downsample(colors, downsampleFactor, 4);

  return {
    positions: new Float32Array(downsampledPositions),
    colors: new Uint8Array(downsampledColors),
    intensities: new Float32Array(normalizedIntensities),
  };
}

// Helper function to merge arrays
function mergeArrays(arrays: number[][]) {
  let totalLength = 0;
  for (const arr of arrays) {
    totalLength += arr.length;
  }

  const result = new Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    for (const value of arr) {
      result[offset++] = value;
    }
  }

  return result;
}

export const downsample = (
  points: Float64Array | Uint8Array | TypedArray,
  factor: number,
  multiplier: number
): number[] => {
  const sampledPoints: number[] = [];
  for (let i = 0; i < points.length; i += factor * multiplier) {
    sampledPoints.push(points[i], points[i + 1], points[i + 2]);
  }

  return sampledPoints;
};

export const processData = (data: ExtractedData) => {
  const { positions, colors, intensities } = data;
  let points: [number, number, number][] = [];
  const pointColors: [number, number, number][] = [];

  const intensityFactor = import.meta.env.VITE_ENABLE_COLOR_INTENSITIES ? 1 : 1;
  const saturationBoost = 1.7;

  for (let i = 0, j = 0; i < positions.length; i += 3, j += 4) {
    points.push([positions[i], positions[i + 1], positions[i + 2]]);

    const intensity = import.meta.env.VITE_ENABLE_COLOR_INTENSITIES
      ? intensities
        ? intensities[Math.floor(i / 3)]
        : 1
      : 1; // Use normalized intensity

    let [r, g, b] = colors
      ? [
          Math.min(colors[j] * intensity * intensityFactor, 255) / 255,
          Math.min(colors[j + 1] * intensity * intensityFactor, 255) / 255,
          Math.min(colors[j + 2] * intensity * intensityFactor, 255) / 255,
        ]
      : [255 * intensity, 255 * intensity, 255 * intensity];

    // Convert RGB to HSL
    // eslint-disable-next-line prefer-const
    let [h, s, l] = rgbToHsl(r, g, b);

    // Boost saturation
    s = Math.min(s * saturationBoost, 1);

    // Convert back to RGB
    [r, g, b] = hslToRgb(h, s, l);

    pointColors.push([r, g, b]);
  }

  points = convertToLocal(points);

  const processedData: ProcessedData = { points, pointColors };

  return processedData;
};

// Utility functions to concatenate typed arrays
export const concatFloat32Arrays = (a: Float32Array, b: Float32Array) => {
  const c = new Float32Array(a.length + b.length);
  c.set(a, 0);
  c.set(b, a.length);
  return c;
};

export const concatUint8Arrays = (a: Uint8Array, b: Uint8Array) => {
  const c = new Uint8Array(a.length + b.length);
  c.set(a, 0);
  c.set(b, a.length);
  return c;
};
