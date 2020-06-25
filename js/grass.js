import * as THREE from './lib/three.js';
import { Perlin } from './lib/perlin.js';
import { buildGUI } from './gui.js';
import * as scene from './scene.js';

var ls = JSON.parse(localStorage.getItem('IslandMaker'));
var peak = ls.peak;
var smoothing = ls.smoothing;
var myseed = ls.myseed;
var freq = ls.freq;
var terrace = ls.terrace;
var flatshader = ls.flatshader;
var colorInterval = ls.colorInterval;
var colorArr = ls.colorArr;
let len = ls.len;
let width = ls.width;

export function generateGrass() {



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

function grassInit( ){
    grassArr = [];
    var mesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( 25, 25 ), new THREE.MeshBasicMaterial( {
        color: new THREE.Color().setHSL( 0.3, 0.75, 0.5 * 0.4 + 0.1 ),
        map: new THREE.CanvasTexture( genGrass() ),
        depthTest: false,
        depthWrite: false,
        transparent: true
    } ) );

    for ( var i = 0; i < 15; i ++ ) {
        let m2 = mesh.clone();
        m2.material.color = new THREE.Color().setHSL( 0.3, 0.75, ( i / 15 ) * 0.4 + 0.1 ),

        m2.position.y = i * 0.05;
        m2.rotation.x = - Math.PI / 2;
        
        grassArr.push( m2 );

        scene.add( m2 );

    }
    scene.children.reverse();

}

function grassMove() {

    var time = Date.now() / 600;
    
    for ( var i = 0, l = grassArr.length; i < l; i ++ ) {

        var mesh = grassArr[ i ];
        mesh.position.x = Math.sin( time * 1 ) * i * 0.005;
        mesh.position.z = Math.cos( time * 1 ) * i * 0.005;

    }
}

function genGrass() {

    var canvas = document.createElement( 'canvas' );
    canvas.width = 512;
    canvas.height = 512;

    var context = canvas.getContext( '2d' );

    for ( var i = 0; i < 20000; i ++ ) {

        context.fillStyle = 'hsl(0,0%,' + ( Math.random() * 50 + 50 ) + '%)';
        context.beginPath();
        context.arc( Math.random() * canvas.width, Math.random() * canvas.height, Math.random() + 0.15, 0, Math.PI * 2, true );
        context.fill();

    }

    context.globalAlpha = 0.075;
    context.globalCompositeOperation = 'lighter';

    return canvas;

}