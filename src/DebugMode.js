import * as THREE from 'three';

export class DebugMode {
  constructor(scene) {
    this.scene = scene;
    this.enabled = false;

    this.panel = document.getElementById('debug-panel');
    this.elements = {
      pitch: document.getElementById('debug-pitch'),
      roll: document.getElementById('debug-roll'),
      yaw: document.getElementById('debug-yaw'),
      velocity: document.getElementById('debug-velocity'),
      lift: document.getElementById('debug-lift'),
      aoa: document.getElementById('debug-aoa'),
      fps: document.getElementById('debug-fps')
    };

    // FPS tracking
    this.frameCount = 0;
    this.lastFpsUpdate = performance.now();
    this.currentFps = 0;

    // Debug visualization objects
    this.velocityArrow = null;
    this.liftArrow = null;

    // Setup keyboard toggle
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyG') {
        this.toggle();
      }
    });
  }

  toggle() {
    this.enabled = !this.enabled;

    if (this.panel) {
      this.panel.classList.toggle('visible', this.enabled);
    }

    if (this.enabled) {
      this.createDebugVisuals();
    } else {
      this.removeDebugVisuals();
    }
  }

  createDebugVisuals() {
    // Velocity arrow (blue)
    this.velocityArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0, 0, 0),
      10,
      0x0088ff,
      2,
      1
    );
    this.scene.add(this.velocityArrow);

    // Lift arrow (green)
    this.liftArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0),
      5,
      0x00ff00,
      1,
      0.5
    );
    this.scene.add(this.liftArrow);
  }

  removeDebugVisuals() {
    if (this.velocityArrow) {
      this.scene.remove(this.velocityArrow);
      this.velocityArrow = null;
    }
    if (this.liftArrow) {
      this.scene.remove(this.liftArrow);
      this.liftArrow = null;
    }
  }

  update(glider) {
    // Update FPS
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }

    if (!this.enabled) return;

    // Update panel text
    if (this.elements.pitch) {
      this.elements.pitch.textContent = THREE.MathUtils.radToDeg(glider.pitch).toFixed(1) + '°';
    }
    if (this.elements.roll) {
      this.elements.roll.textContent = THREE.MathUtils.radToDeg(glider.roll).toFixed(1) + '°';
    }
    if (this.elements.yaw) {
      this.elements.yaw.textContent = THREE.MathUtils.radToDeg(glider.yaw).toFixed(1) + '°';
    }
    if (this.elements.velocity) {
      const v = glider.velocity;
      this.elements.velocity.textContent = `${v.x.toFixed(1)}, ${v.y.toFixed(1)}, ${v.z.toFixed(1)}`;
    }
    if (this.elements.lift) {
      this.elements.lift.textContent = glider.debugLift.toFixed(2);
    }
    if (this.elements.aoa) {
      this.elements.aoa.textContent = glider.debugAoA.toFixed(1) + '°';
    }
    if (this.elements.fps) {
      this.elements.fps.textContent = this.currentFps;
    }

    // Update debug arrows
    if (this.velocityArrow) {
      this.velocityArrow.position.copy(glider.position);
      const velDir = glider.velocity.clone().normalize();
      const velLen = glider.getSpeed() / 5;
      this.velocityArrow.setDirection(velDir);
      this.velocityArrow.setLength(velLen, velLen * 0.2, velLen * 0.1);
    }

    if (this.liftArrow) {
      this.liftArrow.position.copy(glider.position);
      const liftDir = new THREE.Vector3(0, 1, 0);
      liftDir.applyQuaternion(glider.rotation);
      const liftLen = glider.debugLift / 2;
      this.liftArrow.setDirection(liftDir);
      this.liftArrow.setLength(Math.max(liftLen, 0.1), liftLen * 0.2, liftLen * 0.1);
    }
  }
}
