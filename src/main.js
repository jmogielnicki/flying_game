import * as THREE from 'three';
import { Glider } from './Glider.js';
import { InputManager } from './InputManager.js';
import { ChaseCamera } from './ChaseCamera.js';
import { HUD } from './HUD.js';
import { DebugMode } from './DebugMode.js';

class Game {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = null;

    this.glider = null;
    this.inputManager = null;
    this.chaseCamera = null;
    this.hud = null;
    this.debugMode = null;

    // Map boundaries (3km x 3km)
    this.mapSize = 3000; // meters
    this.mapBoundary = this.mapSize / 2;

    this.init();
  }

  init() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
    this.scene.fog = new THREE.Fog(0x87CEEB, 500, 5000);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').appendChild(this.renderer.domElement);

    // Clock for delta time
    this.clock = new THREE.Clock();

    // Setup lighting
    this.setupLighting();

    // Create infinite ground plane (temporary for Milestone 1)
    this.createGroundPlane();

    // Create glider
    this.glider = new Glider(this.scene);

    // Create input manager
    this.inputManager = new InputManager();

    // Create chase camera
    this.chaseCamera = new ChaseCamera(this.camera);
    this.chaseCamera.reset(this.glider);

    // Create HUD
    this.hud = new HUD();

    // Create debug mode
    this.debugMode = new DebugMode(this.scene);

    // Setup game over handling
    this.setupGameOver();

    // Handle window resize
    window.addEventListener('resize', () => this.onResize());

    // Start game loop
    this.animate();
  }

  setupLighting() {
    // Ambient light
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);

    // Directional light (sun)
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(100, 200, 100);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 1000;
    sun.shadow.camera.left = -200;
    sun.shadow.camera.right = 200;
    sun.shadow.camera.top = 200;
    sun.shadow.camera.bottom = -200;
    this.scene.add(sun);

    // Hemisphere light for sky/ground color variation
    const hemi = new THREE.HemisphereLight(0x87CEEB, 0x3a5f0b, 0.3);
    this.scene.add(hemi);
  }

  createGroundPlane() {
    // Large ground plane for Milestone 1
    const groundGeometry = new THREE.PlaneGeometry(this.mapSize, this.mapSize, 64, 64);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a5f0b, // Green grass color
      roughness: 0.9,
      metalness: 0.0
    });

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Add grid helper for visual reference
    const gridHelper = new THREE.GridHelper(this.mapSize, 60, 0x444444, 0x666666);
    gridHelper.position.y = 0.1;
    this.scene.add(gridHelper);

    // Add boundary markers
    this.createBoundaryMarkers();
  }

  createBoundaryMarkers() {
    const markerMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const markerGeometry = new THREE.CylinderGeometry(5, 5, 100, 8);

    const positions = [
      { x: -this.mapBoundary, z: -this.mapBoundary },
      { x: this.mapBoundary, z: -this.mapBoundary },
      { x: -this.mapBoundary, z: this.mapBoundary },
      { x: this.mapBoundary, z: this.mapBoundary }
    ];

    positions.forEach(pos => {
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.set(pos.x, 50, pos.z);
      this.scene.add(marker);
    });
  }

  setupGameOver() {
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => this.restart());
    }
  }

  restart() {
    this.glider.reset();
    this.chaseCamera.reset(this.glider);
    document.getElementById('game-over').classList.remove('visible');
  }

  checkBoundaries() {
    const pos = this.glider.position;
    const buffer = 100; // Buffer zone before boundary

    // Check if approaching boundaries
    const distToEdge = {
      x: Math.abs(pos.x) - (this.mapBoundary - buffer),
      z: Math.abs(pos.z) - (this.mapBoundary - buffer)
    };

    if (distToEdge.x > 0 || distToEdge.z > 0) {
      // Calculate direction to center
      const toCenter = new THREE.Vector3(-pos.x, 0, -pos.z).normalize();

      // Apply turning force based on how far past boundary
      const strength = Math.max(distToEdge.x, distToEdge.z) / buffer;
      this.glider.applyBoundaryForce(toCenter, Math.min(strength, 1));
    }
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const deltaTime = this.clock.getDelta();

    // Update input
    this.inputManager.update();

    // Pass input to glider
    this.glider.setInput(
      this.inputManager.getPitch(),
      this.inputManager.getRoll()
    );

    // Update glider physics
    this.glider.update(deltaTime);

    // Check boundaries
    this.checkBoundaries();

    // Check for crash
    if (this.glider.crashed) {
      document.getElementById('game-over').classList.add('visible');
    }

    // Update camera
    this.chaseCamera.update(this.glider, deltaTime);

    // Update HUD
    this.hud.update(this.glider);

    // Update debug
    this.debugMode.update(this.glider);

    // Render
    this.renderer.render(this.scene, this.camera);
  }
}

// Start the game
new Game();
