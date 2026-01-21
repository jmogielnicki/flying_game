import * as THREE from 'three';

export class ChaseCamera {
  constructor(camera) {
    this.camera = camera;

    // Camera offset from glider (in local space)
    this.offset = new THREE.Vector3(0, 3, 12); // Behind and above

    // Current camera position (for smoothing)
    this.currentPosition = new THREE.Vector3();
    this.currentLookAt = new THREE.Vector3();

    // Smoothing factor (lower = smoother/laggier)
    this.positionLerp = 0.05;
    this.lookAtLerp = 0.1;

    // Initialize
    this.currentPosition.copy(this.offset);
  }

  update(glider, deltaTime) {
    // Calculate target position (offset rotated by glider orientation)
    const targetOffset = this.offset.clone();
    targetOffset.applyQuaternion(glider.rotation);
    const targetPosition = glider.position.clone().add(targetOffset);

    // Calculate target look-at (slightly ahead of glider)
    const lookAhead = glider.getForwardDirection().multiplyScalar(10);
    const targetLookAt = glider.position.clone().add(lookAhead);

    // Smoothly interpolate camera position
    this.currentPosition.lerp(targetPosition, this.positionLerp);
    this.currentLookAt.lerp(targetLookAt, this.lookAtLerp);

    // Apply to camera
    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookAt);
  }

  reset(glider) {
    const targetOffset = this.offset.clone();
    targetOffset.applyQuaternion(glider.rotation);
    this.currentPosition.copy(glider.position).add(targetOffset);
    this.currentLookAt.copy(glider.position);
    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookAt);
  }
}
