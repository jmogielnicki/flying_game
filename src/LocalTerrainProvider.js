import * as THREE from 'three';
import { TerrainProvider } from './TerrainProvider.js';

/**
 * Terrain provider that loads static heightmap and color images.
 * Used for the MVP "Local Stages" approach.
 */
export class LocalTerrainProvider extends TerrainProvider {
  constructor(options = {}) {
    super();

    // Paths to terrain images
    this.heightmapPath = options.heightmapPath || '/maps/grand_canyon/terrain_height.png';
    this.colorMapPath = options.colorMapPath || '/maps/grand_canyon/terrain_color.png';

    // Terrain dimensions in world units (meters)
    this.terrainWidth = options.width || 3000;  // 3km
    this.terrainDepth = options.depth || 3000;  // 3km

    // Height scaling: pixel value 255 = maxHeight meters
    this.maxHeight = options.maxHeight || 8849; // Mount Everest height
    this.minHeight = options.minHeight || 0;

    // Mesh resolution (number of segments)
    this.segments = options.segments || 256;

    // Internal data
    this.heightData = null;  // Float32Array of heights
    this.heightDataWidth = 0;
    this.heightDataHeight = 0;
  }

  async init() {
    // Load heightmap into canvas and extract pixel data
    await this.loadHeightmap();

    // Create the terrain mesh
    this.createMesh();

    this.ready = true;
  }

  async loadHeightmap() {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        // Create canvas to read pixel data
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Get pixel data
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const pixels = imageData.data;

        // Store dimensions
        this.heightDataWidth = img.width;
        this.heightDataHeight = img.height;

        // Convert to height values (use red channel, or average RGB for grayscale)
        this.heightData = new Float32Array(img.width * img.height);

        for (let i = 0; i < this.heightData.length; i++) {
          const pixelIndex = i * 4;
          // Use red channel (grayscale images have R=G=B)
          const pixelValue = pixels[pixelIndex];
          // Map 0-255 to minHeight-maxHeight
          this.heightData[i] = this.minHeight + (pixelValue / 255) * (this.maxHeight - this.minHeight);
        }

        resolve();
      };

      img.onerror = () => {
        reject(new Error(`Failed to load heightmap: ${this.heightmapPath}`));
      };

      img.src = this.heightmapPath;
    });
  }

  createMesh() {
    // Create plane geometry
    const geometry = new THREE.PlaneGeometry(
      this.terrainWidth,
      this.terrainDepth,
      this.segments,
      this.segments
    );

    // Rotate to be horizontal (PlaneGeometry is vertical by default)
    geometry.rotateX(-Math.PI / 2);

    // Displace vertices based on heightmap
    const positions = geometry.attributes.position.array;
    const vertexCount = (this.segments + 1) * (this.segments + 1);

    for (let i = 0; i < vertexCount; i++) {
      // Get vertex position
      const x = positions[i * 3];      // X position
      const z = positions[i * 3 + 2];  // Z position (after rotation)

      // Convert world position to UV coordinates (0-1)
      const u = (x + this.terrainWidth / 2) / this.terrainWidth;
      const v = (z + this.terrainDepth / 2) / this.terrainDepth;

      // Sample height from heightmap
      const height = this.sampleHeightmap(u, v);

      // Set Y position (index 1 after rotation)
      positions[i * 3 + 1] = height;
    }

    // Update geometry
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    // Load color texture
    const textureLoader = new THREE.TextureLoader();
    const colorTexture = textureLoader.load(this.colorMapPath);
    colorTexture.wrapS = THREE.ClampToEdgeWrapping;
    colorTexture.wrapT = THREE.ClampToEdgeWrapping;
    colorTexture.minFilter = THREE.LinearMipmapLinearFilter;
    colorTexture.magFilter = THREE.LinearFilter;

    // Create material
    const material = new THREE.MeshStandardMaterial({
      map: colorTexture,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.FrontSide
    });

    // Create mesh
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;
  }

  /**
   * Sample the heightmap at UV coordinates (0-1)
   * Uses bilinear interpolation for smooth results
   */
  sampleHeightmap(u, v) {
    // Clamp UV to valid range
    u = Math.max(0, Math.min(1, u));
    v = Math.max(0, Math.min(1, v));

    // Convert to pixel coordinates
    const px = u * (this.heightDataWidth - 1);
    const py = v * (this.heightDataHeight - 1);

    // Get integer and fractional parts
    const x0 = Math.floor(px);
    const y0 = Math.floor(py);
    const x1 = Math.min(x0 + 1, this.heightDataWidth - 1);
    const y1 = Math.min(y0 + 1, this.heightDataHeight - 1);
    const fx = px - x0;
    const fy = py - y0;

    // Sample four corners
    const h00 = this.heightData[y0 * this.heightDataWidth + x0];
    const h10 = this.heightData[y0 * this.heightDataWidth + x1];
    const h01 = this.heightData[y1 * this.heightDataWidth + x0];
    const h11 = this.heightData[y1 * this.heightDataWidth + x1];

    // Bilinear interpolation
    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;
    return h0 * (1 - fy) + h1 * fy;
  }

  /**
   * Get ground height at world coordinates
   */
  getHeightAt(x, z) {
    if (!this.heightData) return 0;

    // Convert world coordinates to UV (0-1)
    const u = (x + this.terrainWidth / 2) / this.terrainWidth;
    const v = (z + this.terrainDepth / 2) / this.terrainDepth;

    // Return 0 if outside terrain bounds
    if (u < 0 || u > 1 || v < 0 || v > 1) {
      return 0;
    }

    return this.sampleHeightmap(u, v);
  }

  /**
   * Get terrain bounds
   */
  getBounds() {
    return {
      minX: -this.terrainWidth / 2,
      maxX: this.terrainWidth / 2,
      minZ: -this.terrainDepth / 2,
      maxZ: this.terrainDepth / 2,
      width: this.terrainWidth,
      depth: this.terrainDepth
    };
  }
}
