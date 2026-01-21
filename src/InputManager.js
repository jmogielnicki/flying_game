export class InputManager {
  constructor() {
    this.pitch = 0;  // -1 to 1 (down to up)
    this.roll = 0;   // -1 to 1 (left to right)

    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false
    };

    this.touchActive = false;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchCurrentX = 0;
    this.touchCurrentY = 0;

    this.setupKeyboardListeners();
    this.setupTouchListeners();
  }

  setupKeyboardListeners() {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  handleKeyDown(e) {
    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.keys.up = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.keys.down = true;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.keys.left = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.keys.right = true;
        break;
    }
  }

  handleKeyUp(e) {
    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.keys.up = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.keys.down = false;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.keys.left = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.keys.right = false;
        break;
    }
  }

  setupTouchListeners() {
    const touchZone = document.getElementById('touch-zone');
    const touchIndicator = document.getElementById('touch-indicator');

    if (!touchZone) return;

    touchZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.touchActive = true;
      this.touchStartX = touch.clientX;
      this.touchStartY = touch.clientY;
      this.touchCurrentX = touch.clientX;
      this.touchCurrentY = touch.clientY;

      if (touchIndicator) {
        touchIndicator.style.left = touch.clientX + 'px';
        touchIndicator.style.top = touch.clientY + 'px';
        touchIndicator.classList.add('active');
      }
    });

    touchZone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!this.touchActive) return;

      const touch = e.touches[0];
      this.touchCurrentX = touch.clientX;
      this.touchCurrentY = touch.clientY;

      if (touchIndicator) {
        touchIndicator.style.left = touch.clientX + 'px';
        touchIndicator.style.top = touch.clientY + 'px';
      }
    });

    touchZone.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.touchActive = false;
      if (touchIndicator) {
        touchIndicator.classList.remove('active');
      }
    });

    touchZone.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      this.touchActive = false;
      if (touchIndicator) {
        touchIndicator.classList.remove('active');
      }
    });
  }

  update() {
    // Process keyboard input
    if (this.keys.up) {
      this.pitch = Math.min(this.pitch + 0.05, 1);
    } else if (this.keys.down) {
      this.pitch = Math.max(this.pitch - 0.05, -1);
    } else {
      this.pitch *= 0.9; // Return to neutral
    }

    if (this.keys.left) {
      this.roll = Math.max(this.roll - 0.05, -1);
    } else if (this.keys.right) {
      this.roll = Math.min(this.roll + 0.05, 1);
    } else {
      this.roll *= 0.9; // Return to neutral
    }

    // Process touch input (overrides keyboard if active)
    if (this.touchActive) {
      const maxDelta = 100; // pixels for full deflection

      const deltaX = this.touchCurrentX - this.touchStartX;
      const deltaY = this.touchCurrentY - this.touchStartY;

      // Inverted Y: drag up = pitch up (positive)
      this.pitch = Math.max(-1, Math.min(1, -deltaY / maxDelta));
      this.roll = Math.max(-1, Math.min(1, deltaX / maxDelta));
    }
  }

  getPitch() {
    return this.pitch;
  }

  getRoll() {
    return this.roll;
  }
}
