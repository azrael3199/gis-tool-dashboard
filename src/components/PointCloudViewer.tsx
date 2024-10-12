import React from 'react';
// import { Canvas } from '@react-three/fiber';
import Scene from './Scene';
// import { Statistics } from '../lib/utils/types';
// import StatsPane from './StatsPane';

interface PointCloudViewerProps {
  fileId: string;
}

const PointCloudViewer: React.FC<PointCloudViewerProps> = ({ fileId }) => {
  // const [statistics, _] = useState({ count: 0 } as Statistics);

  return (
    <div className="h-full w-full grow relative">
      {/* <StatsPane statistics={statistics} /> */}
      <Scene fileId={fileId} />
    </div>
  );
};

export default PointCloudViewer;
