const EARTH_RADIUS = 6371000; // Earth's radius in meters

// Convert degrees to radians
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// Convert WGS84 (lat, long, alt) to Cartesian (x, y, z) with axis adjustments
function wgs84ToCartesian(
  lat: number,
  long: number,
  alt: number,
  avgLat: number,
  avgLong: number
): [number, number, number] {
  const cosAvgLat = Math.cos(toRadians(avgLat));

  // Mapping: Longitude -> Z-axis, Latitude -> X-axis, Altitude -> Y-axis
  const z = toRadians(long - avgLong) * EARTH_RADIUS * cosAvgLat;
  const x = toRadians(lat - avgLat) * EARTH_RADIUS;
  const y = alt; // Altitude remains as Y-axis

  return [x, y, z]; // Now X -> Lat, Y -> Alt, Z -> Long
}

// Compute the centroid of the points (for translation)
function computeCentroid(
  points: [number, number, number][]
): [number, number, number] {
  const sum = points.reduce(
    (acc, point) => {
      acc[0] += point[0];
      acc[1] += point[1];
      acc[2] += point[2];
      return acc;
    },
    [0, 0, 0]
  );

  const len = points.length;
  return [sum[0] / len, sum[1] / len, sum[2] / len];
}

// Translate points to origin
function translateToOrigin(
  points: [number, number, number][],
  centroid: [number, number, number]
): [number, number, number][] {
  return points.map(([x, y, z]) => [
    x - centroid[0],
    y - centroid[1],
    z - centroid[2],
  ]);
}

// Normalize the axis lengths to avoid stretching (without multiplying by EARTH_RADIUS)
function normalizeAxes(
  points: [number, number, number][]
): [number, number, number][] {
  let xMin = Infinity,
    xMax = -Infinity;
  let yMin = Infinity,
    yMax = -Infinity;
  let zMin = Infinity,
    zMax = -Infinity;

  // Efficiently find min and max for each axis
  points.forEach(([x, y, z]) => {
    if (x < xMin) xMin = x;
    if (x > xMax) xMax = x;
    if (y < yMin) yMin = y;
    if (y > yMax) yMax = y;
    if (z < zMin) zMin = z;
    if (z > zMax) zMax = z;
  });

  const xRange = xMax - xMin;
  const yRange = yMax - yMin;
  const zRange = zMax - zMin;

  const maxRange = Math.max(xRange, yRange, zRange); // Find the largest range

  // Normalize the points without scaling too much
  return points.map(([x, y, z]) => [
    x / maxRange, // Normalize by the largest axis range
    y / maxRange,
    z / maxRange,
  ]);
}

// Uniformly scale the point cloud
function scalePointCloud(
  points: [number, number, number][],
  scaleFactor: number
): [number, number, number][] {
  return points.map(([x, y, z]) => [
    x * scaleFactor * 0.4,
    y * scaleFactor * 0.45,
    z * scaleFactor * -1.35,
  ]);
}

// Main function: Convert WGS84 to Cartesian space with scaling
export function convertToLocal(
  points: [number, number, number][],
  scaleFactor: number = 30
): [number, number, number][] {
  // Compute the average lat/long for normalizing to the centroid
  const avgLat =
    points.reduce((sum, point) => sum + point[0], 0) / points.length;
  const avgLong =
    points.reduce((sum, point) => sum + point[1], 0) / points.length;

  // Step 1: Convert each point from WGS84 to Cartesian (x, y, z)
  const cartesianPoints = points.map(([lat, long, alt]) =>
    wgs84ToCartesian(lat, long, alt, avgLat, avgLong)
  );

  // Step 2: Compute the centroid of the point cloud
  const centroid = computeCentroid(cartesianPoints);

  // Step 3: Translate the point cloud so that the centroid is at the origin
  const translatedPoints = translateToOrigin(cartesianPoints, centroid);

  // Step 4: Normalize the axes to avoid stretching
  const normalizedPoints = normalizeAxes(translatedPoints);

  // Step 5: Apply uniform scaling to the point cloud
  return scalePointCloud(normalizedPoints, scaleFactor);
}

export function rgbToHsl(
  r: number,
  g: number,
  b: number
): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h, s;

  const l = (max + min) / 2;

  if (max == min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
      default:
        h = 1;
        break;
    }

    h /= 6;
  }

  return [h, s, l];
}

export function hslToRgb(
  h: number,
  s: number,
  l: number
): [number, number, number] {
  let r, g, b;

  if (s == 0) {
    r = g = b = l; // achromatic
  } else {
    function hue2rgb(p: number, q: number, t: number) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [r * 255, g * 255, b * 255];
}
