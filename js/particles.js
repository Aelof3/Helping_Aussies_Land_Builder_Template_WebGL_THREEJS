import * as THREE from './lib/three.js';

// Particles are rendered as a single mesh with a vertex for each particle.
export function createParticleSystem() {
  const count = 9000;
  const size = 10000;
  const particles = new THREE.Geometry();
  const material = new THREE.PointsMaterial({
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
    let point = new THREE.Vector3(
      Math.random() * size - size / 2,
      Math.random() * size - size / 2,
      Math.random() * size - size / 2
    );

    // Add point as vertex
    particles.vertices.push(point);
  }
  return new THREE.Points(particles, material);
}
