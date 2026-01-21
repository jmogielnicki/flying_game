/**
 * Base class for terrain providers.
 * Defines the interface that all terrain implementations must follow.
 * This allows swapping LocalTerrainProvider for MapboxTerrainProvider later.
 */
export class TerrainProvider {
  constructor() {
    if (this.constructor === TerrainProvider) {
      throw new Error('TerrainProvider is abstract and cannot be instantiated directly');
    }

    this.ready = false;
    this.mesh = null;
  }

  /**
   * Initialize the terrain provider (load assets, etc.)
   * @returns {Promise<void>}
   */
  async init() {
    throw new Error('init() must be implemented by subclass');
  }

  /**
   * Get the ground height at a given world coordinate
   * @param {number} x - World X coordinate
   * @param {number} z - World Z coordinate
   * @returns {number} - Ground height in meters
   */
  getHeightAt(x, z) {
    throw new Error('getHeightAt() must be implemented by subclass');
  }

  /**
   * Get the Three.js mesh for this terrain
   * @returns {THREE.Mesh}
   */
  getMesh() {
    return this.mesh;
  }

  /**
   * Check if terrain is ready to use
   * @returns {boolean}
   */
  isReady() {
    return this.ready;
  }

  /**
   * Clean up resources
   */
  dispose() {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      if (this.mesh.material.map) {
        this.mesh.material.map.dispose();
      }
      this.mesh.material.dispose();
    }
  }
}
