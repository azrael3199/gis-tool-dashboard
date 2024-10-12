import { Canvas } from '@react-three/fiber';

interface IThreeCanvas {
  children: React.ReactNode;
}

const ThreeCanvas: React.FC<IThreeCanvas> = ({ children }) => (
  <Canvas className="grow h-full bg-gray-300">{children}</Canvas>
);

export default ThreeCanvas;
