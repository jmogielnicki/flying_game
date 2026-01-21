import * as THREE from 'three';

export class Glider {
  constructor(scene) {
    this.scene = scene;

    // State
    this.position = new THREE.Vector3(0, 1000, 0); // Start at 1000m
    this.velocity = new THREE.Vector3(0, 0, -20);  // Initial forward speed (m/s)
    this.rotation = new THREE.Quaternion();

    // Euler angles for easier manipulation
    this.pitch = 0;  // Rotation around X axis (nose up/down)
    this.roll = 0;   // Rotation around Z axis (banking)
    this.yaw = 0;    // Rotation around Y axis (heading)

    // Physics constants
    this.gravity = 9.81;           // m/s^2
    this.maxSpeed = 80;            // m/s (~288 km/h)
    this.minSpeed = 10;            // m/s - stall speed
    this.baseDrag = 0.02;          // Base drag coefficient
    this.liftCoefficient = 0.8;    // How much lift per speed
    this.pitchRate = 1.5;          // Radians per second at full input
    this.rollRate = 2.0;           // Radians per second at full input
    this.yawFromRoll = 0.5;        // How much yaw is induced by roll

    // Control input (set externally)
    this.pitchInput = 0;
    this.rollInput = 0;

    // State flags
    this.crashed = false;

    // Debug values
    this.debugLift = 0;
    this.debugAoA = 0;

    // Create mesh (placeholder cube for now)
    this.createMesh();
  }

  createMesh() {
    const geometry = new THREE.BoxGeometry(2, 0.5, 4); // Width, height, length
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.3,
      roughness: 0.7
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.scene.add(this.mesh);

    // Add a small nose indicator (red)
    const noseGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.5);
    const noseMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.position.z = -2;
    this.mesh.add(nose);

    // Add wings for visual reference
    const wingGeometry = new THREE.BoxGeometry(8, 0.1, 1);
    const wingMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    const wings = new THREE.Mesh(wingGeometry, wingMaterial);
    wings.position.y = 0.1;
    this.mesh.add(wings);
  }

  setInput(pitchInput, rollInput) {
    this.pitchInput = pitchInput;
    this.rollInput = rollInput;
  }

  update(deltaTime) {
    if (this.crashed) return;

    // Clamp delta time to prevent physics explosions
    deltaTime = Math.min(deltaTime, 0.1);

    // Update rotation based on input
    this.updateRotation(deltaTime);

    // Update physics
    this.updatePhysics(deltaTime);

    // Update mesh transform
    this.updateMesh();
  }

  updateRotation(deltaTime) {
    // Apply pitch input
    this.pitch += this.pitchInput * this.pitchRate * deltaTime;
    this.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.pitch)); // Limit pitch

    // Apply roll input
    this.roll += this.rollInput * this.rollRate * deltaTime;
    this.roll = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.roll)); // Limit roll

    // Derive yaw from roll (banking turns)
    // When banked, the glider naturally turns
    const yawRate = Math.sin(this.roll) * this.yawFromRoll * this.getSpeed() / 20;
    this.yaw += yawRate * deltaTime;

    // Auto-level roll slightly when no input
    if (Math.abs(this.rollInput) < 0.1) {
      this.roll *= (1 - 0.5 * deltaTime);
    }

    // Build quaternion from euler angles (YXZ order for flight)
    const euler = new THREE.Euler(this.pitch, this.yaw, this.roll, 'YXZ');
    this.rotation.setFromEuler(euler);
  }

  updatePhysics(deltaTime) {
    const speed = this.getSpeed();

    // Get forward direction from rotation
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.rotation);

    // Calculate angle of attack (angle between velocity and forward direction)
    const velocityDir = this.velocity.clone().normalize();
    const dot = forward.dot(velocityDir);
    const angleOfAttack = Math.acos(Math.max(-1, Math.min(1, dot)));
    this.debugAoA = THREE.MathUtils.radToDeg(angleOfAttack);

    // === GRAVITY ===
    this.velocity.y -= this.gravity * deltaTime;

    // === LIFT ===
    // Lift depends on speed and angle of attack
    // Maximum lift when angle of attack is small and speed is high
    if (speed > this.minSpeed) {
      const speedFactor = Math.min(speed / 30, 1.5); // More speed = more lift
      const pitchFactor = Math.cos(this.pitch); // Less lift when pointing straight up/down

      // Effective lift based on how "level" we're flying
      // Lift acts perpendicular to wings (up in local space)
      const liftMagnitude = this.liftCoefficient * speedFactor * pitchFactor * this.gravity;
      this.debugLift = liftMagnitude;

      // Apply lift in the local "up" direction
      const liftDir = new THREE.Vector3(0, 1, 0);
      liftDir.applyQuaternion(this.rotation);
      this.velocity.add(liftDir.multiplyScalar(liftMagnitude * deltaTime));
    } else {
      this.debugLift = 0;
    }

    // === DRAG ===
    // Base drag plus extra drag when pitching up
    let dragCoeff = this.baseDrag;
    if (this.pitch > 0.1) {
      // Extra drag when pitching up (induced drag)
      dragCoeff += this.pitch * 0.05;
    }
    // Also more drag at higher angles of attack
    dragCoeff += angleOfAttack * 0.02;

    const dragForce = speed * speed * dragCoeff * deltaTime;
    if (speed > 0.1) {
      const dragVec = velocityDir.multiplyScalar(-dragForce);
      this.velocity.add(dragVec);
    }

    // === DIVE (Energy conversion) ===
    // When pitching down, we convert altitude to speed more efficiently
    if (this.pitch < -0.1 && this.velocity.y < 0) {
      // Transfer some of the downward velocity to forward speed
      const diveBoost = Math.abs(this.pitch) * 0.3 * deltaTime;
      const currentSpeed = this.getSpeed();
      if (currentSpeed < this.maxSpeed) {
        // Add speed in forward direction
        const forwardBoost = forward.multiplyScalar(diveBoost * 10);
        this.velocity.add(forwardBoost);
      }
    }

    // Clamp max speed
    if (this.getSpeed() > this.maxSpeed) {
      this.velocity.normalize().multiplyScalar(this.maxSpeed);
    }

    // Update position
    this.position.add(this.velocity.clone().multiplyScalar(deltaTime));

    // Keep altitude non-negative (will be replaced by terrain collision)
    if (this.position.y < 0) {
      this.crash();
    }
  }

  updateMesh() {
    this.mesh.position.copy(this.position);
    this.mesh.quaternion.copy(this.rotation);
  }

  getSpeed() {
    return this.velocity.length();
  }

  getSpeedKmh() {
    return this.getSpeed() * 3.6; // m/s to km/h
  }

  getAltitude() {
    return this.position.y;
  }

  getForwardDirection() {
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.rotation);
    return forward;
  }

  crash() {
    this.crashed = true;
    this.velocity.set(0, 0, 0);
  }

  reset() {
    this.position.set(0, 1000, 0);
    this.velocity.set(0, 0, -20);
    this.pitch = 0;
    this.roll = 0;
    this.yaw = 0;
    this.rotation.identity();
    this.crashed = false;
    this.updateMesh();
  }

  // Apply boundary force to turn glider back inward
  applyBoundaryForce(directionToCenter, strength) {
    // Gradually adjust yaw toward center
    const targetYaw = Math.atan2(directionToCenter.x, -directionToCenter.z);
    const yawDiff = targetYaw - this.yaw;

    // Normalize angle difference
    let normalizedDiff = yawDiff;
    while (normalizedDiff > Math.PI) normalizedDiff -= 2 * Math.PI;
    while (normalizedDiff < -Math.PI) normalizedDiff += 2 * Math.PI;

    this.yaw += normalizedDiff * strength * 0.02;
  }
}
