export function mergeArrays(arrays: number[][]) {
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
  points: Float32Array | Uint8Array,
  factor: number,
  multiplier: number
): number[] => {
  const sampledPoints: number[] = [];
  for (let i = 0; i < points.length; i += factor * multiplier) {
    sampledPoints.push(points[i], points[i + 1], points[i + 2]);
  }
  return sampledPoints;
};
