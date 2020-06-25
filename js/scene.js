import * as THREE from './lib/three.js';
import { OrbitControls } from './lib/orbitControls.js';
import { GLTFLoader } from './lib/GLTFLoader.js';
import { buildGUI } from './gui.js';
import { generateTerrain } from './terrain.js';
import { createWater, updateWater } from './water.js';
import { createParticleSystem } from './particles.js';

export const globalParams = { scale: 2.4 };

const defaultReflectionSize = 200;

export const reflectionRenderTarget = new THREE.WebGLCubeRenderTarget(
  defaultReflectionSize
);

const cubeCamera = new THREE.CubeCamera(0.001, 10000, reflectionRenderTarget);

const initialWidth = window.innerWidth;
const initialHeight = window.innerHeight;
let mixer0, mixer1, mixer2, mixer3;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,
  initialWidth / initialHeight,
  0.1,
  100000
);

const renderer = new THREE.WebGLRenderer();

const controls = new OrbitControls(camera, renderer.domElement);
controls.maxDistance = 12700.0;

let water = createWater();

let cameraTarget = { x: 0, y: 0, z: 0 };
let lastRenderTime = performance.now();
let deltaTime = 0.0; // The amount of time between frames (s)

let sunPos = [5000, 2223, 300];
let hemiLightIntensity;
let sunIntensity = 0.5;
let particleSpeed = 0.005;

let sun, sky, hemiLight, directionalLight, terrain, particleSystem;
let dragon, phoenix, balerion, robot;
const meshes = {
  dragon: {
    visible: false,
    position: [-1000, 700, 0]
  },
  phoenix: {
    visible: false,
    position: [1000, 700, 0]
  },
  balerion: {
    visible: false,
    position: [0, 700, -2000]
  },
  robot: {
    visible: true,
    position: [0, 2500, 2500]
  }
};

buildGUI((gui, folders) => {
  const params = {
    scale: globalParams.scale,
    sunPosX: sunPos[0],
    sunPosY: sunPos[1],
    sunPosZ: sunPos[2],
    sunIntensity,
    particleSpeed,
    reflectionResolution: defaultReflectionSize,
    dragon: meshes.dragon.visible,
    phoenix: meshes.phoenix.visible,
    balerion: meshes.balerion.visible,
    robot: meshes.robot.visible
  };

  folders.scene.add(params, 'scale', 0, 6).onChange((val) => {
    globalParams.scale = val;

    // Update water and terrain (mesh positions scale on update)
    setTerrain(generateTerrain());
    setWater(createWater());
  });
  folders.creatures.add(params, 'dragon').onChange((val) => {
    meshes.dragon.visible = val;
  });
  folders.creatures.add(params, 'phoenix').onChange((val) => {
    meshes.phoenix.visible = val;
  });
  folders.creatures.add(params, 'balerion').onChange((val) => {
    meshes.balerion.visible = val;
  });
  folders.creatures.add(params, 'robot').onChange((val) => {
    meshes.robot.visible = val;
  });
  folders.lighting.add(params, 'sunPosX', -5000, 5000).onChange((val) => {
    sunPos[0] = val;
  });
  folders.lighting.add(params, 'sunPosY', 0, 3000).onChange((val) => {
    sunPos[1] = val;
  });
  folders.lighting.add(params, 'sunPosZ', -5000, 5000).onChange((val) => {
    sunPos[2] = val;
  });
  folders.lighting.add(params, 'sunIntensity', 0, 5).onChange((val) => {
    sunIntensity = val;
  });
  folders.particles.add(params, 'particleSpeed', 0, 0.1).onChange((val) => {
    particleSpeed = val;
  });
  folders.rendering
    .add(params, 'reflectionResolution', 0, 512)
    .onChange((val) => {
      cubeCamera.renderTarget.setSize(val, val);
    });
});

export function initialiseScene() {
  // Set camera pos
  camera.position.y = 2000;
  camera.position.z = 5000;
  camera.rotation.x = (-15 * Math.PI) / 180;

  // Renderer settings
  renderer.setClearColor(0x000000, 100);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(initialWidth, initialHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Add to DOM
  document.body.appendChild(renderer.domElement);

  // Sky and sun (jiebin)
  const skyGeometry = new THREE.SphereGeometry(8000, 32, 32);
  const skyMaterial = new THREE.MeshLambertMaterial({
    map: new THREE.TextureLoader().load('./textures/sky.png'),
    side: THREE.BackSide
  });
  sky = new THREE.Mesh(skyGeometry, skyMaterial);
  scene.add(sky);

  // Hemisphere light (simulates scattered sunlight and prevents shadows from looking too harsh)
  hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, hemiLightIntensity);
  hemiLight.color.setHSL(0.6, 0.75, 0.5);
  hemiLight.position.set(0, 500, 0);
  scene.add(hemiLight);

  // Sun mesh
  const sphereGeometry = new THREE.SphereGeometry(100, 30, 30);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xf9d71c });
  sun = new THREE.Mesh(sphereGeometry, sphereMaterial);
  scene.add(sun);

  // Directional light
  directionalLight = new THREE.DirectionalLight(0xffffff, sunIntensity);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  // Terrain
  terrain = generateTerrain();
  scene.add(terrain);

  //load 3D Models
  //loader
  const gltfLoader = new GLTFLoader();
  //Dragon by RedCoreTimber Sketchfab
  //load model Asynchronus
  gltfLoader.load('./models/dragon/scene.gltf', (gltf) => {
    //set const to avoid calling gltf.scene multiple times
    const root = gltf.scene;
    //add to scene
    scene.add(root);
    //scale scene
    root.scale.set(45, 45, 45);
    //set position
    root.position.set(...meshes.dragon.position);
    //set rotation
    root.rotation.y += 1.65;
    dragon = gltf.scene;
    //visibility
    root.visible = meshes.dragon.visible;
    //Animation Mixer var
    mixer0 = new THREE.AnimationMixer(root);
    // play animation
    gltf.animations.forEach((clip) => {
      mixer0.clipAction(clip).play();
    });
  });
  //Phoenix by Sketchfab
  //load model Asynchronus
  gltfLoader.load('./models/phoenix/scene.gltf', (gltf) => {
    const root = gltf.scene;
    // add to scene
    scene.add(root);
    // scale scene
    root.scale.set(3, 3, 3);
    // set position
    root.position.set(...meshes.phoenix.position);
    // set rotation
    root.rotation.y += 2.7;
    phoenix = gltf.scene;
    // visibility
    root.visible = meshes.phoenix.visible;
    //Animation Mixer var
    mixer1 = new THREE.AnimationMixer(root);
    // play animation
    gltf.animations.forEach((clip) => {
      mixer1.clipAction(clip).play();
    });
  });
  //Balerion from Game of Thrones by Anthony Yanez Sketchfab
  //load model Asynchronus
  gltfLoader.load('./models/balerion/scene.gltf', (gltf) => {
    const root = gltf.scene;
    //add to scene
    scene.add(root);
    //scale scene
    root.scale.set(2, 2, 2);
    // set position
    root.position.set(...meshes.balerion.position);
    // set rotation
    root.rotation.y += 1.65;
    balerion = gltf.scene;
    //visibility
    root.visible = meshes.balerion.visible;
    //Animation Mixer var
    mixer2 = new THREE.AnimationMixer(root);
    // play animation
    gltf.animations.forEach((clip) => {
      mixer2.clipAction(clip).play();
    });
  });
  //Robot by Wakarma sketchfab
  //load model Asynchronus
  gltfLoader.load('./models/robot/scene.gltf', (gltf) => {
    const root = gltf.scene;
    //add to scene
    scene.add(root);
    //scale scene
    root.scale.set(1, 1, 1);
    //set position
    root.position.set(...meshes.robot.position);
    //set rotation
    root.rotation.y += 4.8;
    root.rotation.x -= 0.5;
    robot = gltf.scene;
    //visibility
    root.visible = meshes.robot.visible;
    //Animation mixer Var
    mixer3 = new THREE.AnimationMixer(root);
    // play animation
    gltf.animations.forEach((clip) => {
      mixer3.clipAction(clip).play();
    });
  });

  // Water
  scene.add(water);

  // Particle system
  particleSystem = createParticleSystem();
  scene.add(particleSystem);

  // Cube camera (for water reflections)
  scene.add(cubeCamera);

  // Start the update loop
  renderer.setAnimationLoop(update);

  // Add event listeners
  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  //get the new sizes
  const width = window.innerWidth;
  const height = window.innerHeight;
  //then update the renderer
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  //and update the aspect ratio of the camera
  camera.aspect = width / height;

  //update the projection matrix given the new values
  camera.updateProjectionMatrix();
  //and finally render the scene again
  renderer.render(scene, camera);
}

export function update() {
  //animation clip updates
  if (mixer0) mixer0.update(deltaTime);
  if (mixer1) mixer1.update(deltaTime);
  if (mixer2) mixer2.update(deltaTime);
  if (mixer3) mixer3.update(deltaTime);

  // Update sun
  sun.position.set(...sunPos);
  directionalLight.position.set(...sunPos).normalize();
  directionalLight.intensity = sunIntensity;

  //Update day,night light and adding the cloud | star
  if (sun.position.y > 0) {
    hemiLight.intensity = sun.position.y * 0.0007;
  }

  //update cloud
  sky.rotation.y -= 0.0003;
  // Animate water
  updateWater(lastRenderTime);

  // Animate particles
  particleSystem.rotation.y += particleSpeed * deltaTime;

  // Update mesh positions and visibility (if loaded)
  const posScale = Math.max(Math.min(globalParams.scale, 3.0), 2.4);

  if (dragon) {
    dragon.position.set(...meshes.dragon.position.map((v) => v * posScale));
    dragon.visible = meshes.dragon.visible;
  }
  if (phoenix) {
    phoenix.position.set(...meshes.phoenix.position.map((v) => v * posScale));
    phoenix.visible = meshes.phoenix.visible;
  }
  if (balerion) {
    balerion.position.set(...meshes.balerion.position.map((v) => v * posScale));
    balerion.visible = meshes.balerion.visible;
  }
  if (robot) {
    robot.visible = meshes.robot.visible;
  }

  // Finally render
  render();

  // Calculate delta time based on time after previous render
  const renderTime = performance.now();
  deltaTime = (renderTime - lastRenderTime) / 1000.0;
  lastRenderTime = renderTime;
}

export function setTerrain(newTerrain) {
  scene.remove(terrain);
  terrain = newTerrain;
  scene.add(terrain);
}

export function setWater(newWater) {
  scene.remove(water);
  water = newWater;
  scene.add(water);
}

export function render() {
  // Update water reflections

  // Hide sky and water so reflection isn't affected
  water.visible = false;
  sky.visible = false;

  // Don't render particles if reflection resolution is low
  // (particles take up too much of the reflection map otherwise)
  if (reflectionRenderTarget.width < 180) {
    particleSystem.visible = false;
  }

  // Update position of reflection camera
  cubeCamera.position.set(
    camera.position.x,
    -camera.position.y, // Negative so that the underside of the world is rendered
    camera.position.z
  );

  if (reflectionRenderTarget.width > 1) {
    // Render the reflection
    cubeCamera.update(renderer, scene);
  }

  // Make hidden stuff visible again for main render
  water.visible = true;
  sky.visible = true;
  particleSystem.visible = true;

  // Finally render the frame
  renderer.render(scene, camera);

  controls.update();
}
