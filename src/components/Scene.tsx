import React, { useEffect, useRef, useState } from 'react';
import { Camera, Canvas, extend } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { BufferGeometry, BufferAttribute } from 'three';
import * as THREE from 'three';
import { concatFloat32Arrays, concatUint8Arrays } from '../lib/utils/misc';
import { BoundingBox } from '../lib/utils/types';
import PointCloudMaterial from '../classes/PointCloudMaterial';

interface SceneProps {
  fileId: string;
}

extend({ PointCloudMaterial });

const Scene: React.FC<SceneProps> = ({ fileId }) => {
  const positionsRef = useRef<Float32Array>(new Float32Array(0));
  const colorsRef = useRef<Uint8Array>(new Uint8Array(0));
  const [pointCount, setPointCount] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  const geometryRef = useRef<BufferGeometry>(new BufferGeometry());

  useEffect(() => {
    // Initialize the worker
    workerRef.current = new Worker(
      new URL('../workers/point-cloud.worker.ts', import.meta.url)
    );

    workerRef.current.onmessage = (event) => {
      const { type, positions, colors, error } = event.data;

      if (type === 'data') {
        // Reconstruct TypedArrays from ArrayBuffers
        const positionsArray = new Float32Array(positions);
        const colorsArray = new Uint8Array(colors);

        // Accumulate positions and colors
        positionsRef.current = concatFloat32Arrays(
          positionsRef.current,
          positionsArray
        );
        colorsRef.current = concatUint8Arrays(colorsRef.current, colorsArray);
        setPointCount(positionsRef.current.length / 3);

        // Update the geometry
        geometryRef.current.setAttribute(
          'position',
          new BufferAttribute(positionsRef.current, 3)
        );
        geometryRef.current.setAttribute(
          'color',
          new BufferAttribute(new Uint8Array(colorsRef.current), 3, true)
        );
        geometryRef.current.computeBoundingSphere();
      } else if (type === 'error') {
        console.error('Worker error:', error);
      }
    };

    return () => {
      workerRef.current?.postMessage({ type: 'stop' });
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const fetchVisiblePoints = (boundingBox: BoundingBox) => {
    const serverUrl = 'ws://localhost:8080'; // Adjust as needed

    workerRef.current?.postMessage({
      type: 'start',
      data: { fileId, boundingBox, serverUrl },
    });
  };

  // Handle camera changes to fetch new points
  const handleCameraChange = (camera: Camera) => {
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    const frustum = new THREE.Frustum();
    const matrix = new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    frustum.setFromProjectionMatrix(matrix);

    // Compute bounding box from frustum corners
    const frustumCorners = [
      new THREE.Vector3(-1, -1, -1),
      new THREE.Vector3(1, -1, -1),
      new THREE.Vector3(-1, 1, -1),
      new THREE.Vector3(1, 1, -1),
      new THREE.Vector3(-1, -1, 1),
      new THREE.Vector3(1, -1, 1),
      new THREE.Vector3(-1, 1, 1),
      new THREE.Vector3(1, 1, 1),
    ];

    const inverseMatrix = matrix.clone().invert();
    frustumCorners.forEach((corner) => corner.applyMatrix4(inverseMatrix));

    const min = new THREE.Vector3(
      Math.min(...frustumCorners.map((v) => v.x)),
      Math.min(...frustumCorners.map((v) => v.y)),
      Math.min(...frustumCorners.map((v) => v.z))
    );
    const max = new THREE.Vector3(
      Math.max(...frustumCorners.map((v) => v.x)),
      Math.max(...frustumCorners.map((v) => v.y)),
      Math.max(...frustumCorners.map((v) => v.z))
    );

    const boundingBox = {
      min: { x: min.x, y: min.y, z: min.z },
      max: { x: max.x, y: max.y, z: max.z },
    };

    // Fetch visible points
    fetchVisiblePoints(boundingBox);
  };

  // // Fetch points on initial load
  // useEffect(() => {
  //   // Assuming you have access to the camera
  //   const camera = new THREE.PerspectiveCamera();
  //   handleCameraChange(camera);
  // }, []);

  return (
    <Canvas
      onCreated={({ camera }) => handleCameraChange(camera)}
      className="h-full w-full bg-gray-300"
    >
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      {pointCount > 0 && (
        <points geometry={geometryRef.current}>
          <pointsMaterial
            size={0.05}
            vertexColors
            sizeAttenuation={true}
            transparent={false}
          />
        </points>
      )}
      <OrbitControls
        onChange={(event) => {
          if (!event?.target) return;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          handleCameraChange((event.target as any).object as Camera);
        }}
      />
      <gridHelper args={[1000, 1000]} />
    </Canvas>
  );
};

export default Scene;
