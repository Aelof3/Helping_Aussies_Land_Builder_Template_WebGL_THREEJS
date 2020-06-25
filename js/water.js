import * as THREE from './lib/three.js';
import { buildGUI } from './gui.js';

import { reflectionRenderTarget, globalParams } from './scene.js';

let waterObj = {};

let frequency = 0.05;
let amplitude = 0.5;
let waterSpeed = 1;

const albedo = THREE.ImageUtils.loadTexture('./textures/seawater.jpg');
const normalMap = THREE.ImageUtils.loadTexture(
  './textures/seawater_normals.jpg'
);

const material = new THREE.MeshPhysicalMaterial({
  color: 0x1f3a4d,
  map: albedo,
  normalMap: normalMap,
  normalScale: new THREE.Vector2(0.1, 0.001),
  clearcoat: 0.9,
  clearcoatMap: albedo,
  clearcoatNormalMap: normalMap,
  clearcoatNormalScale: new THREE.Vector2(0.9, 1),
  clearcoatRoughness: 0.01,
  transparent: true,
  roughness: 0.01,
  transparency: 0.23,
  reflectivity: 1.7
});

const declarationsGLSL = 'uniform float time, frequency, amplitude;\n';

// Transforms vertices to form a sine wave pattern, and calculates normals so lighting isn't screwed up.
// This equation is used to calculate surface normals:
// https://stackoverflow.com/questions/9577868/glsl-calculate-surface-normal
const vertexGLSL = `
    vec3 transformed = vec3(position);
    float angle = (time + position.x) * frequency;
    transformed.z += sin(angle) * amplitude;

    objectNormal = normalize(vec3(-amplitude * frequency * cos(angle), 0.0, 1.0));
    vNormal = normalMatrix * objectNormal;
  `;

material.onBeforeCompile = (shader) => {
  shader.uniforms.time = { value: 0 };
  shader.uniforms.frequency = {
    value: frequency
  };
  shader.uniforms.amplitude = {
    value: amplitude
  };

  // Add new declarations to top of existing shader code
  shader.vertexShader = declarationsGLSL + shader.vertexShader;
  // Replace dummy vertex shader code with custom code
  // (see https://blog.mozvr.com/customizing-vertex-shaders/)
  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>',
    vertexGLSL
  );

  // Store reference to shader so that values can be changed later
  waterObj.shader = shader;
};

buildGUI((gui, folders) => {
  const params = {
    frequency,
    amplitude,
    waterSpeed
  };

  folders.water.add(params, 'frequency', 0, 0.2).onChange(function (val) {
    frequency = val;
    waterObj.shader.uniforms.frequency.value = frequency;
  });
  folders.water.add(params, 'amplitude', 0, 10.0).onChange(function (val) {
    amplitude = val;
    waterObj.shader.uniforms.amplitude.value = amplitude;
  });
  folders.water.add(params, 'waterSpeed', 0, 5.0).onChange(function (val) {
    waterSpeed = val;
  });
});

export function createWater() {
  const { scale } = globalParams;

  const tileAmt = 4 * scale;

  albedo.wrapS = THREE.RepeatWrapping;
  albedo.wrapT = THREE.RepeatWrapping;
  albedo.repeat.set(tileAmt, tileAmt);

  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(tileAmt, tileAmt);

  const plane = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(
      4000 * scale,
      4000 * scale,
      200 * scale,
      200 * scale
    ),
    material
  );

  plane.rotation.x = (-90 * Math.PI) / 180;

  waterObj.plane = plane;
  waterObj.material = material;
  return plane;
}

export function updateWater(time) {
  const { shader, material } = waterObj;
  if (!shader) {
    console.log('Water shader still compiling...');
    return;
  }

  shader.uniforms.time.value = waterSpeed * 0.2 * time;

  if (!material.envMap) {
    material.envMap = reflectionRenderTarget.texture;
    material.envMapIntensity = 1;
    material.needsUpdate = true;
  }

  const texturePanSpd = waterSpeed * 0.00004;
  material.normalMap.offset.set(texturePanSpd * time, 0);
  material.map.offset.set(texturePanSpd * time, 0);
}
