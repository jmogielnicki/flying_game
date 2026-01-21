import * as THREE from 'three';
import { Glider } from './Glider.js';
import { InputManager } from './InputManager.js';
import { ChaseCamera } from './ChaseCamera.js';
import { HUD } from './HUD.js';
import { DebugMode } from './DebugMode.js';
import { LocalTerrainProvider } from './LocalTerrainProvider.js';

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
    this.terrainProvider = null;

    // Map boundaries (3km x 3km)
    this.mapSize = 3000; // meters
    this.mapBoundary = this.mapSize / 2;

    // Loading state
    this.loading = true;

    this.init();
  }

  async init() {
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

    // Load terrain
    await this.loadTerrain();

    // Create glider (pass terrain provider for collision)
    this.glider = new Glider(this.scene, this.terrainProvider);

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

    // Done loading
    this.loading = false;

    // Start game loop
    this.animate();
  }

  setupLighting() {
    // Ambient light
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);

    // Directional light (sun)
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(500, 1000, 500);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 100;
    sun.shadow.camera.far = 3000;
    sun.shadow.camera.left = -1500;
    sun.shadow.camera.right = 1500;
    sun.shadow.camera.top = 1500;
    sun.shadow.camera.bottom = -1500;
    this.scene.add(sun);

    // Hemisphere light for sky/ground color variation
    const hemi = new THREE.HemisphereLight(0x87CEEB, 0x8B4513, 0.3);
    this.scene.add(hemi);
  }

  async loadTerrain() {
    console.log('Loading terrain...');

    // Heightmap is 5752x3016 pixels (1.9:1 aspect ratio)
    // Grand Canyon elevation range is ~1500m (river ~600m, rim ~2100m)
    const terrainWidth = 5700;  // meters (match aspect ratio)
    const terrainDepth = 3000;  // meters

    this.terrainProvider = new LocalTerrainProvider({
      heightmapPath: '/maps/grand_canyon/terrain_height.png',
      colorMapPath: '/maps/grand_canyon/terrain_color.png',
      width: terrainWidth,
      depth: terrainDepth,
      maxHeight: 2000,  // Appropriate for Grand Canyon
      segments: 256
    });

    // Update map boundaries to match terrain
    this.mapSize = Math.max(terrainWidth, terrainDepth);
    this.mapBoundary = this.mapSize / 2;

    await this.terrainProvider.init();

    // Add terrain mesh to scene
    const terrainMesh = this.terrainProvider.getMesh();
    this.scene.add(terrainMesh);

    // Add boundary markers at corners
    this.createBoundaryMarkers();

    console.log('Terrain loaded!');
  }

  createBoundaryMarkers() {
    const markerMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const markerGeometry = new THREE.CylinderGeometry(10, 10, 500, 8);
    const bounds = this.terrainProvider.getBounds();

    const positions = [
      { x: bounds.minX, z: bounds.minZ },
      { x: bounds.maxX, z: bounds.minZ },
      { x: bounds.minX, z: bounds.maxZ },
      { x: bounds.maxX, z: bounds.maxZ }
    ];

    positions.forEach(pos => {
      const groundHeight = this.terrainProvider.getHeightAt(pos.x, pos.z);
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.set(pos.x, groundHeight + 250, pos.z);
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
    const bounds = this.terrainProvider.getBounds();

    // Check if approaching boundaries (rectangular terrain)
    const distToEdge = {
      x: Math.max(pos.x - (bounds.maxX - buffer), (bounds.minX + buffer) - pos.x),
      z: Math.max(pos.z - (bounds.maxZ - buffer), (bounds.minZ + buffer) - pos.z)
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

    if (this.loading) return;

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
