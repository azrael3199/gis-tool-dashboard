import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App_v2';
import './index.css';

// Import Cesium CSS
import 'cesium/Build/Cesium/Widgets/widgets.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
