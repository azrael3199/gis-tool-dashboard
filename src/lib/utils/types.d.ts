export type Point = {
  x: number;
  y: number;
  z: number;
  color?: [number, number, number];
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

export type FileItem = {
  _id: string;
  filename: string;
  uploadDate: string;
};

export type Plane = {
  normal: { x: number; y: number; z: number };
  constant: number;
};

export type BoundingBox = {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
};

export type Statistics = {
  count?: number;
};
