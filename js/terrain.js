import * as THREE from './lib/three.js';
import { Perlin } from './lib/perlin.js';
import { buildGUI } from './gui.js';
import * as scene from './scene.js';

let myseed = 0;

//Peak affects the maximum height of mountains. Has different effects depending on smoothing and frequency.
var peak = 400;
//Smoothing affects the distribution and size of the 'islands', ranging from archipelago to a zoomed in chunk of a landmass
var smoothing = 100;
//Increasing frequency makes the mountains more varied and interesting. Decreasing flattens things out.
var freq = 10;
//Terracing option to make the landscape into layers.
var terrace = 1;
//Flattens specific vertices to create a 'polygonal' look.
var flatshader = true;
//How long each of the colour bands are.
var colorInterval = 250.0;
//Colour array for storing the 'bands' of colour
var colorArr = [
  [235, 233, 90, 160],
  [100, 120, 60, 100],
  [100, 160, 60, 350],
  [180, 180, 180, 550],
  [230, 230, 180, 300]
];

const materialOnBeforeCompile = (shader) => {
  // Vertex Shader

  shader.vertexShader = shader.vertexShader.replace(
    `#include <common>`,
    `
        #include <common>
        varying float y;
        `
  );
  shader.vertexShader = shader.vertexShader.replace(
    `#include <begin_vertex>`,
    `
        #include <begin_vertex>
        y = ( position.z + 0.1 ) * 5.0;
        `
  );

  // Fragment Shader

  shader.fragmentShader = shader.fragmentShader.replace(
    `#include <common>`,
    `
        #include <common>
        varying float y;
        vec3 col;
        `
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    `gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,
    `
        ${colorInt(colorArr)}
        outgoingLight *= col;
        gl_FragColor = vec4( outgoingLight, diffuseColor.a );
        `
  );
};
//Shader colour definition for each bands. It retrieves different GLSL vector 3 colours from the array.
var colorLevel = function (color) {
  return `col = vec3 ((${color[0]}.0 / 255.0), (${color[1]}.0 / 255.0), (${color[2]}.0 / 255.0));`;
};

var colorInt = function (colorArray) {
  let s = ``;
  let vn = 0;
  for (var i = 0; i < colorArray.length; i++) {
    vn += colorArray[i][3];
    let vd = vn - colorArray[i][3];
    if (i == 0) {
      s += `if (y <= ${vn}.0){
            ${colorLevel(colorArray[i])}
          }
          `;
    } else if (i == colorArray.length - 1) {
      s += `if (y > ${vd}.0){
            ${colorLevel(colorArray[i])}
          }
          `;
    } else {
      s += `if (y > ${vd}.0 && y < ${vn}.0 ){
            ${colorLevel(colorArray[i])}
          }
          `;
    }
  }
  return s;
};

const flatMaterial = new THREE.MeshPhongMaterial({ flatShading: true });
flatMaterial.onBeforeCompile = materialOnBeforeCompile;

const normals = THREE.ImageUtils.loadTexture('./textures/sand2.jpg');
const smoothMaterial = new THREE.MeshPhysicalMaterial({
  normalMap: normals,
  normalScale: new THREE.Vector2(0.1, 0.01),
  roughness: 0.7,
  clearcoatNormalMap: normals,
  clearcoatNormalScale: new THREE.Vector2(0.9, 1),
  clearcoatRoughness: 0.56,
  clearcoat: 0.4,
  emissive: 0xffffff,
  emissiveIntensity: 0.1
});
smoothMaterial.onBeforeCompile = materialOnBeforeCompile;

buildGUI((gui, folders) => {
  var params = {
    hillpeak: peak,
    randomseed: myseed,
    smoothvalue: smoothing,
    frequency: freq,
    terrace: terrace,
    flatshader: flatshader
  };

  folders.terrain.add(params, 'hillpeak', 0, 1000).onChange(function (val) {
    peak = val;
    updateTerrain();
  });
  folders.terrain.add(params, 'randomseed').onChange(function (val) {
    myseed = val;
    updateTerrain();
  });
  folders.terrain.add(params, 'smoothvalue', 1, 200).onChange(function (val) {
    smoothing = val;
    updateTerrain();
  });
  folders.terrain.add(params, 'frequency', 1, 25).onChange(function (val) {
    freq = val;
    updateTerrain();
  });
  folders.terrain.add(params, 'terrace', 1, 100).onChange(function (val) {
    terrace = val;
    updateTerrain();
  });
  folders.terrain.add(params, 'flatshader').onChange(function (val) {
    flatshader = val;
    updateTerrain();
  });
});

export function generateTerrain() {
  const { scale } = scene.globalParams;
  var geometry = new THREE.PlaneBufferGeometry(
    scale * 4000,
    scale * 4000,
    scale * 256,
    scale * 256
  );

  const tileAmt = 10;
  normals.wrapS = THREE.RepeatWrapping;
  normals.wrapT = THREE.RepeatWrapping;
  normals.repeat.set(tileAmt, tileAmt);

  var material = flatshader ? flatMaterial : smoothMaterial;

  var terrain = new THREE.Mesh(geometry, material);
  terrain.rotation.x = -Math.PI / 2;
  terrain.geometry.attributes.position.needsUpdate = true;
  terrain.geometry.computeVertexNormals();

  //Change the peak value for different sizes.
  var perlin = new Perlin(myseed);
  var vertices = terrain.geometry.attributes.position.array;
  //Algorithm for creating proper mountainous landscapes
  for (var i = 0; i <= vertices.length; i += 3) {
    let x = vertices[i];
    let y = vertices[i + 1];
    let smooth = smoothing * 40;
    let nx = x / smooth - 0.5,
      ny = y / smooth - 0.5;
    let vert = 0;
    let vertdiv1 = 1;
    let vertdiv2 = 1;
    let itt = 0;
    while (itt < freq) {
      vert += vertdiv1 * perlin.noise(nx * vertdiv2, ny * vertdiv2);
      let v1 = vertdiv1 / 2;
      let v2 = vertdiv2 * 2;
      vertdiv1 = v1;
      vertdiv2 = v2;
      itt += 1;
    }

    vertices[i + 2] = Math.ceil((peak * vert) / terrace) * terrace;
  }
  terrain.geometry.attributes.position.needsUpdate = true;
  terrain.geometry.computeVertexNormals();
  return terrain;
}

function updateTerrain() {
  const newTerrain = generateTerrain();
  scene.setTerrain(newTerrain);
}
