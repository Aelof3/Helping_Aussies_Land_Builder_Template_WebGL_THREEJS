import * as THREE from './lib/three.js';

// Particles are rendered as a single mesh with a vertex for each particle.
export function createParticleSystem() {
  var count = 700;
  var size = 3000;
  var particles = new THREE.Geometry();
  var material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 30,
    map: THREE.ImageUtils.loadTexture('./textures/test_particle.png'),
    blending: THREE.AdditiveBlending,
    depthWrite: false, // Prevents particle alpha from glitching with other transparent materials
    transparent: true
  });

  // Create individual particles and position them randomly
  // Using "- size / 2" means the scattering will be centered on the origin
  for (let i = 0; i < count; i++) {
    // Create point
    var point = new THREE.Vector3(
      Math.random() * size - size / 2,
      Math.random() * size - size / 2,
      Math.random() * size - size / 2
    );

    // Add point as vertex
    particles.vertices.push(point);
  }
  return new THREE.Points(particles, material);
}
