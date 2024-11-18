import React, { useEffect, useRef } from 'react';
import { Viewer, Cesium3DTileset } from 'resium';
import { CesiumComponentRef } from 'resium';
import { Viewer as CesiumViewer, Math, SceneMode } from 'cesium';

// Set the Cesium Ion access token to an empty string
// Ion.defaultAccessToken = '';

interface PointCloudViewerProps {
  tilesetBase: string;
  tilesetUrl: string;
}

const PointCloudViewer: React.FC<PointCloudViewerProps> = ({
  tilesetBase,
  tilesetUrl,
}) => {
  const viewerRef = useRef<CesiumComponentRef<CesiumViewer>>(null);

  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    // Clean up the viewer on component unmount
    return () => {
      if (viewer) {
        viewer.destroy();
      }
    };
  }, []);

  return (
    <div className="h-full">
      <Viewer
        full
        ref={viewerRef}
        sceneMode={SceneMode.SCENE3D}
        timeline={false}
        animation={false}
      >
        <Cesium3DTileset
          show
          url={`${tilesetBase}${tilesetUrl}`}
          onReady={(tileset) => {
            const viewer = viewerRef.current?.cesiumElement;

            if (viewer) {
              viewer.scene.globe.depthTestAgainstTerrain = true;
              viewer.scene.globe.maximumScreenSpaceError = 0.5;

              viewer.camera.flyTo({
                destination: tileset.boundingSphere.center,
                orientation: {
                  heading: Math.toRadians(0),
                  pitch: Math.toRadians(0),
                  roll: Math.toRadians(0),
                },
                duration: 0,
              });

              viewer.scene.debugShowFramesPerSecond = true;
            }
          }}
          // maximumScreenSpaceError={240}
          // debugShowUrl
          // debugWireframe
          // debugShowBoundingVolume
        />
      </Viewer>
    </div>
  );
};

export default PointCloudViewer;
