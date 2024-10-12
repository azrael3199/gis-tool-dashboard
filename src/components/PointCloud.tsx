import React, { useEffect, useState } from 'react';
import * as THREE from 'three';

interface PointCloudProps {
  positions: Float32Array;
  colors?: Uint8Array;
  intensities?: Float32Array;
}

const PointCloud: React.FC<PointCloudProps> = ({
  positions,
  colors,
  intensities,
}) => {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    if (positions.length === 0) return;

    // Create a new BufferGeometry
    const geometry = new THREE.BufferGeometry();

    // Set positions attribute
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // If colors are provided, set the color attribute
    if (colors && colors.length > 0) {
      // Assuming colors are provided as Uint8Array with RGB values
      // Convert colors to Float32Array normalized between 0 and 1
      const normalizedColors = new Float32Array(colors.length);
      for (let i = 0; i < colors.length; i++) {
        normalizedColors[i] = colors[i] / 255;
      }

      geometry.setAttribute(
        'color',
        new THREE.BufferAttribute(normalizedColors, 3)
      );
    }

    // Optionally, handle intensities if needed
    // You can create custom shaders to use intensities for rendering

    // Compute bounding box for the geometry
    geometry.computeBoundingBox();

    // Update the geometry state
    setGeometry(geometry);

    // Clean up when the component is unmounted or dependencies change
    return () => {
      geometry.dispose();
    };
  }, [positions, colors, intensities]);

  return geometry ? (
    <points geometry={geometry}>
      <pointsMaterial
        size={0.05}
        vertexColors={!!colors && colors.length > 0}
      />
    </points>
  ) : null;
};

export default PointCloud;
