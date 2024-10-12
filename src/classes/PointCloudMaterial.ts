import { ShaderMaterial, Vector2 } from 'three';

class PointCloudMaterial extends ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        pointSize: { value: 0.1 },
        viewport: { value: new Vector2(window.innerWidth, window.innerHeight) },
      },
      vertexShader: `
        uniform float pointSize;
        void main() {
          gl_PointSize = pointSize;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          gl_FragColor = vec4(vColor, 1.0);
        }
      `,
      vertexColors: true,
    });
  }
}

export default PointCloudMaterial;
