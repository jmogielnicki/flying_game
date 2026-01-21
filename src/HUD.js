export class HUD {
  constructor() {
    this.speedElement = document.getElementById('speed');
    this.altitudeElement = document.getElementById('altitude');
  }

  update(glider) {
    if (this.speedElement) {
      this.speedElement.textContent = Math.round(glider.getSpeedKmh());
    }
    if (this.altitudeElement) {
      this.altitudeElement.textContent = Math.round(glider.getAltitude());
    }
  }
}
