import * as THREE from './lib/three.js';
import { OrbitControls } from './lib/orbitControls.js';
import { GLTFLoader } from './lib/GLTFLoader.js';
import { buildGUI } from './gui.js';
import { generateTerrain } from './terrain.js';
import { createWater, updateWater } from './water.js';
import { createParticleSystem } from './particles.js';

const defaultReflectionSize = 200;

window.three = THREE;
window.gltfloader = GLTFLoader;

export const reflectionRenderTarget = new THREE.WebGLCubeRenderTarget(
  defaultReflectionSize
);

const cubeCamera = new THREE.CubeCamera(0.001, 15000, reflectionRenderTarget);

const initialWidth = window.innerWidth;
const initialHeight = window.innerHeight;

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

const water = createWater();

let cameraTarget = { x: 0, y: 0, z: 0 };
let lastRenderTime = performance.now();
let deltaTime = 0.0; // The amount of time between frames (s)

let sunPos = [2000, 2223, 300];
let hemiLightIntensity;
let sunIntensity = 0.5;
let particleSpeed = 0.01;
let sun, sky, hemiLight, directionalLight, terrain, particleSystem, dragon;
let cloudParticles = [];
let starParticles = [];
let star = false;
var morph, morphs = [], mixer, animGroups = [];
var container, stats;
var visibilityArray = [];

buildGUI((gui, folders) => {
  const params = {
    dragon:false,
    sunPosX: sunPos[0],
    sunPosY: sunPos[1],
    sunPosZ: sunPos[2],
    sunIntensity,
    particleSpeed,
    reflectionResolution: defaultReflectionSize
  };
  folders.lighting.add(params, 'sunPosX', -3000, 3000).onChange((val) => {
    sunPos[0] = val;
  });
  folders.lighting.add(params, 'sunPosY', 0, 3000).onChange((val) => {
    sunPos[1] = val;
  });
  folders.lighting.add(params, 'sunPosZ', -3000, 3000).onChange((val) => {
    sunPos[2] = val;
  });
  folders.lighting.add(params, 'sunIntensity', 0, 5).onChange((val) => {
    sunIntensity = val;
  });
  folders.particles.add(params, 'particleSpeed', 0, 5).onChange((val) => {
    particleSpeed = val;
  });
  folders.particles.add(params, 'dragon').onChange((val) => {
    dragon = !dragon;
    console.log(visibilityArray);
    for (let index in visibilityArray) visibilityArray[index].scene.visible = !dragon;

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

  //cloud
  createCloud();
  //star
  //createStar();

  // Directional light
  directionalLight = new THREE.DirectionalLight(0xffffff, sunIntensity);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  // Terrain
  terrain = generateTerrain();
  scene.add(terrain);

  //load 3D Models
  loadModels();

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

//cloud
function createCloud() {
  const cloudGeometry = new THREE.PlaneBufferGeometry(500, 500);
  const cloudMaterial = new THREE.MeshLambertMaterial({
    map: new THREE.TextureLoader().load('./textures/try3.png'),
    transparent: true
  });
  for (let p = 0; p < 8; p++) {
    let cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
    cloud.position.set(-1000 + p * 300, 1500, Math.random() * 1700 - 400);
    cloud.rotation.x = 1.16;
    cloud.rotation.y = -0.12;
    cloud.rotation.z = Math.random() * 2 * Math.PI;
    cloud.material.opacity = 0.75;
    cloudParticles.push(cloud);
    scene.add(cloud);
  }
}

//star
function createStar() {
  const starGeometry = new THREE.PlaneBufferGeometry(50, 50);
  const starMaterial = new THREE.MeshLambertMaterial({
    map: new THREE.TextureLoader().load('./textures/try.png'),
    transparent: true
  });
  if (star) {
    for (let p = 0; p < 9; p++) {
      let star = new THREE.Mesh(starGeometry, starMaterial);
      star.position.set(Math.random() * 1700 - 400, 2000, -1000 + p * 300);
      star.rotation.x = 1.16;
      star.rotation.y = -0.12;
      star.rotation.z = Math.random() * 2 * Math.PI;
      star.material.opacity = 0.75;
      starParticles.push(star);
      scene.add(star);
    }
  }
}
// 3d Models
function loadModels() {
  //loader
  var loader = new GLTFLoader();
  // create material of geo
  var material_cube = new THREE.MeshLambertMaterial();
  // wireframe
  material_cube.wireframe = false;
  // create box geo
  var geo_cube = new THREE.BoxGeometry(5, 0.1, 5);
  // create box mesh
  var box_mesh = new THREE.Mesh(geo_cube, material_cube);
  box_mesh.castShadow = true;
  box_mesh.receiveShadow = true;
  // add geo to scene
  scene.add(box_mesh);

  loadDragon();
  // instantiate a 3dObject
  var array = terrain.geometry.attributes.position.array;
  var holder = 0;
  var holdNum = 0;
  var randYArray = [];
  for (var randCounter = 0; randCounter < 10; ) {
    var randNum = Math.floor(Math.random() * 256) + 1;
    if (randYArray.includes(randNum)) {
    } else {
      randYArray.push(randNum);
      randCounter++;
    }
  }
  console.log(randYArray);

  /*for (holder = 0; holder < array.length; holder += 3) {
    if (array[holder + 1] == 2000) {
      holdNum++;
      if (randYArray.includes(holdNum)) {
        console.log(array[holder], array[holder + 1], array[holder + 2]);
        const pos = [
          array[holder],
          array[holder + 1] / 10,
          array[holder + 2] * 10
        ];
        
        loader.load('models/dragon/scene.gltf', function (gltf) {
          gltf.scene.traverse((object) => {
            if (object.isMesh) {
              object.castShadow = true;
              object.receiveShadow = true;
              gltf.scene.scale.set(0.3, 0.3, 0.3);
              gltf.scene.position.set(pos[2], pos[1], pos[0]);
            }
          });
          //add the 3dObject to the mesh
          box_mesh.add(gltf.scene);
        });
      }
    }
  }*/
  
  /*loader.load('models/house/scene.gltf', function (gltf) {
    gltf.scene.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        gltf.scene.position.set(0, 200, 0);
      }
    });
    //add the 3dObject to the mesh
    box_mesh.add(gltf.scene);
  });
  loader.load('models/rock/scene.gltf', function (gltf) {
    gltf.scene.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        gltf.scene.scale.set(3.0, 3.0, 3.0);
        gltf.scene.position.set(100, 200, 0);
      }
    });
    //add the 3dObject to the mesh
    box_mesh.add(gltf.scene);
  });
  loader.load('models/tree/scene.gltf', function (gltf) {
    gltf.scene.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        gltf.scene.scale.set(0.1, 0.1, 0.1);
        gltf.scene.position.set(200, 200, 0);
      }
    });
    //add the 3dObject to the mesh
    box_mesh.add(gltf.scene);
  });*/
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

function loadDragon() {
  var dragon = 3;
  //loader
  var loader = new GLTFLoader();
  // create material of geo
  var material_cube = new THREE.MeshLambertMaterial();
  // wireframe
  material_cube.wireframe = false;
  // create box geo
  var geo_cube = new THREE.BoxGeometry(5, 0.1, 5);
  // create box mesh
  var box_mesh = new THREE.Mesh(geo_cube, material_cube);
  box_mesh.castShadow = true;
  box_mesh.receiveShadow = true;
  // add geo to scene
  scene.add(box_mesh);

  loader.load('/models/dragon/scene.gltf', function (gltf) {
    const root = gltf.scene;
    scene.add(root);
    root.scale.set(24, 24, 24);
    root.position.set(-1500, 700, 0);
    root.rotation.y += 1.65;
    visibilityArray.push(gltf);
    mixer = new THREE.AnimationMixer(root);
    // play animation
    gltf.animations.forEach((clip) => {
      mixer.clipAction(clip).play();
    });
  });
  box_mesh.rotation.y += 4.7;
  
  renderer.render( scene, camera );
}


var animate = function () {
  requestAnimationFrame( animate );


  renderer.render( scene, camera );
};

animate();

const cloneGltf = (gltf) => {
  const clone = {
    animations: gltf.animations,
    scene: gltf.scene.clone(true)
  };

  const skinnedMeshes = {};

  gltf.scene.traverse(node => {
    if (node.isSkinnedMesh) {
      skinnedMeshes[node.name] = node;
    }
  });

  const cloneBones = {};
  const cloneSkinnedMeshes = {};

  clone.scene.traverse(node => {
    if (node.isBone) {
      cloneBones[node.name] = node;
    }

    if (node.isSkinnedMesh) {
      cloneSkinnedMeshes[node.name] = node;
    }
  });

  for (let name in skinnedMeshes) {
    const skinnedMesh = skinnedMeshes[name];
    const skeleton = skinnedMesh.skeleton;
    const cloneSkinnedMesh = cloneSkinnedMeshes[name];

    const orderedCloneBones = [];

    for (let i = 0; i < skeleton.bones.length; ++i) {
      const cloneBone = cloneBones[skeleton.bones[i].name];
      orderedCloneBones.push(cloneBone);
    }

    cloneSkinnedMesh.bind(
        new THREE.Skeleton(orderedCloneBones, skeleton.boneInverses),
        cloneSkinnedMesh.matrixWorld);
  }

  return clone;
}

/*
const cloneGltf = (gltf) => {
  const clone = {
    animations: gltf.animations,
    scene: gltf.scene.clone(true)
  };

  const skinnedMeshes = {};

  gltf.scene.traverse(node => {
    if (node.isSkinnedMesh) {
      skinnedMeshes[node.name] = node;
    }
  });

  const cloneBones = {};
  const cloneSkinnedMeshes = {};

  clone.scene.traverse(node => {
    if (node.isBone) {
      cloneBones[node.name] = node;
    }

    if (node.isSkinnedMesh) {
      cloneSkinnedMeshes[node.name] = node;
    }
  });

  for (let name in skinnedMeshes) {
    const skinnedMesh = skinnedMeshes[name];
    const skeleton = skinnedMesh.skeleton;
    const cloneSkinnedMesh = cloneSkinnedMeshes[name];

    const orderedCloneBones = [];

    for (let i = 0; i < skeleton.bones.length; ++i) {
      const cloneBone = cloneBones[skeleton.bones[i].name];
      orderedCloneBones.push(cloneBone);
    }

    cloneSkinnedMesh.bind(
        new Skeleton(orderedCloneBones, skeleton.boneInverses),
        cloneSkinnedMesh.matrixWorld);
  }

  return clone;
}*/

export function update() {
  // Update sun
  sun.position.set(...sunPos);
  directionalLight.position.set(...sunPos).normalize();
  directionalLight.intensity = sunIntensity;

  //Update day,night light and adding the cloud | star
  if (sun.position.y > 0) {
    hemiLight.intensity = sun.position.y * 0.0007;
    //if (sun.position.y < 1000) {
    // star = true;
    //  createStar();

    //}
  }

  //update cloud
  cloudParticles.forEach((p) => {
    p.rotation.z -= 0.002;
  });
  //update star
  //starParticles.forEach(p => {
  //  p.rotation.z -= 0.01;
  //});

  // Animate water
  updateWater(lastRenderTime);

  // Animate particles
  particleSystem.rotation.y += particleSpeed * deltaTime;

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

  // Render the reflection
  cubeCamera.update(renderer, scene);

  // Make hidden stuff visible again for main render
  water.visible = true;
  sky.visible = true;
  particleSystem.visible = true;

  // Finally render the frame
  renderer.render(scene, camera);

  controls.update();
}
