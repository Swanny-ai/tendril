// Shared scene timeline. seek(t) puts every CSS animation and scripted part at time t (seconds),
// so the renderer can capture exact frames. Opened normally, the scene simply plays in a loop.
window.SCENE = window.SCENE || { duration: 12, update: null };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
window.ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
window.prog = (t, a, b) => ease((t - a) / (b - a));
window.seek = (t) => {
  for (const a of document.getAnimations()) {
    a.pause();
    a.currentTime = t * 1000;
  }
  if (window.SCENE.update) window.SCENE.update(t);
};
if (!location.search.includes("capture")) {
  addEventListener("load", () => {
    const start = performance.now();
    const loop = (now) => {
      seek(((now - start) / 1000) % window.SCENE.duration);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}
