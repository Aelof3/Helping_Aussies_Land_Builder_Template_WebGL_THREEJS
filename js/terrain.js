import * as THREE from './lib/three.js';
import { Perlin } from './lib/perlin.js';
import { buildGUI } from './gui.js';
import * as scene from './scene.js';

let peak = 400,
smoothing = 100,
myseed = Math.floor(1000 * Math.random()),
freq = 40,
terrace = 1,
flatshader = 1,
colorInterval = 160.0,
colorArr = [[235,233,90],[100,120,60],[100,160,60],[180,180,180],[230,230,180]],
len = 4000,
width = 4000;

buildGUI((gui, folders) => {
  var params = {
    hillpeak: peak,
    randomseed: myseed,
    smoothvalue: smoothing,
    frequency: freq,
    terrace: terrace,
    flatshader: flatshader,
    length: len,
    width: width
  };

  folders.terrain.add(params, 'hillpeak', 0, 1000).onChange(function (val) {
    peak = val;
    updateTerrain();
  });
  folders.terrain.add(params, 'randomseed', 0, 1000).onChange(function (val) {
    //TODO: Make this one work
    myseed = val;
    updateTerrain();
  });
  folders.terrain.add(params, 'smoothvalue', 1, 200).onChange(function (val) {
    smoothing = val;
    updateTerrain();
  });
  folders.terrain.add(params, 'frequency', 1, 100).onChange(function (val) {
    freq = val;
    updateTerrain();
  });
  folders.terrain.add(params, 'terrace', 1, 100).onChange(function (val) {
    terrace = val;
    updateTerrain();
  });
  folders.terrain.add(params, 'flatshader', 0, 1).onChange(function (val) {
    flatshader = val;
    updateTerrain();
  });
  folders.terrain.add(params, 'width', 0, 10000).onChange(function (val) {
    width = val;
    updateTerrain();
  });
  folders.terrain.add(params, 'length', 0, 10000).onChange(function (val) {
    len = val;
    updateTerrain();
  });
});

export function generateTerrain() {
  var geometry = new THREE.PlaneBufferGeometry(len, width, 256, 256);
  
  var fs = Math.round(flatshader) == 1 ? true : false;
  var material = new THREE.MeshPhongMaterial({flatShading: fs});

  material.onBeforeCompile = shader => {

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
        ${colorInt(colorInterval,colorArr)}
        outgoingLight *= col;
        gl_FragColor = vec4( outgoingLight, diffuseColor.a );
        `
      );
      
    }
  
    var colorLevel = function( color ){
      return `col = vec3 ((${color[0]}.0 / 255.0), (${color[1]}.0 / 255.0), (${color[2]}.0 / 255.0));`
    }

    var colorInt = function( interval,colorArray ){
      let s = ``;

      for (var i=0;i<colorArray.length;i++){
        if (i == 0){
          s += `if (y <= ${interval}.0){
            ${colorLevel(colorArray[i])}
          }
          `
        } else if ( i == colorArray.length - 1 ) {
          s += `if (y > ${(i * interval)}.0){
            ${colorLevel(colorArray[i])}
          }
          `
        } else {
          s += `if (y > ${(i * interval)}.0 && y < ${(i * interval) + interval}.0 ){
            ${colorLevel(colorArray[i])}
          }
          `
        }
        
      }
      return s
    }
    
  var terrain = new THREE.Mesh(geometry, material);
  terrain.rotation.x = -Math.PI / 2;
  terrain.geometry.attributes.position.needsUpdate = true;
  terrain.geometry.computeVertexNormals();

  //Change the peak value for different sizes.
  var perlin = new Perlin();
  var vertices = terrain.geometry.attributes.position.array;

  for (var i = 0; i <= vertices.length; i += 3) {
    let x = vertices[i];
    let y = vertices[i+1];
    let smooth = (smoothing * 40);
    let nx = x/smooth - 0.5, ny = y/smooth - 0.5;
    let vert = 0;
    let vertdiv1 = 1;
    let vertdiv2 = 1;
    let itt = 0;
    while (itt < freq){
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

/*void function getYPosition(float_x, float_z){
  var y = perlin.noise((float_x + 100) / 15, (float_z+100) / 15, mySeed);
  y *= 10;
  y += dist(float_x, float_z, 0, 0) / 2;
  return y;
}
*/
//Reverse engineer that one https://www.openprocessing.org/sketch/816746 for this section!
/* float getYHeight (float _x, float _z) {
	float y = noise((_x+100) / 15, mySeed, (_z+100) / 15);
	y *= 10;
	y += dist(_x, _z, 0, 0) / 2;
	return y;
} 
*/
