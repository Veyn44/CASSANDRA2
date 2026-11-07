export function bindCameraControls(s, r, listen, signal) {
  const heldKeys = new Set();
  let lastFrame = 0;

  listen(window, 'keydown', (e) => {
    if (s.paused) return;
    const key = e.key.toLowerCase();
    if (!'wasd'.includes(key) || e.target instanceof HTMLInputElement) return;
    e.preventDefault();
    heldKeys.add(key);
  });
  listen(window, 'keyup', (e) => heldKeys.delete(e.key.toLowerCase()));

  function cameraFrame(ts) {
    if (signal.aborted) return;
    const dt = lastFrame ? Math.min((ts - lastFrame) / 1000, 0.05) : 0;
    lastFrame = ts;
    const speed = (8 * dt) / Math.max(0.55, s.camera.zoom);
    let moved = false;
    if (heldKeys.has('w')) {
      s.camera.y -= speed;
      moved = true;
    }
    if (heldKeys.has('s')) {
      s.camera.y += speed;
      moved = true;
    }
    if (heldKeys.has('a')) {
      s.camera.x -= speed;
      moved = true;
    }
    if (heldKeys.has('d')) {
      s.camera.x += speed;
      moved = true;
    }
    if (moved && !s.paused) {
      s.camera.x = Math.max(0, Math.min(255, s.camera.x));
      s.camera.y = Math.max(0, Math.min(127, s.camera.y));
      r.draw();
    }
    requestAnimationFrame(cameraFrame);
  }

  requestAnimationFrame(cameraFrame);
}
