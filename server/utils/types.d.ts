export type Point = {
  x: number;
  y: number;
  z: number;
};

export type ExtractedData = {
  positions: Float32Array;
  colors?: Uint8Array;
  intensities?: Float32Array;
};

export type ProcessedData = {
  points: [number, number, number][];
  pointColors: [number, number, number][];
};
