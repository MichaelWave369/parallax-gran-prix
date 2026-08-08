import * as THREE from 'three';

let installed = false;

/**
 * Soft deconfliction for the trackside racer labels.
 *
 * Labels are presentation only. This hook never touches physics, ordering, or
 * race state. It simply fades labels that project too close to another label
 * in the same renderer frame, allowing the first readable label in a cluster
 * to remain prominent while the rest recede.
 */
export function installSmartLabelDeclutter() {
  if (installed) return;
  installed = true;

  const original = THREE.Sprite.prototype.onBeforeRender;
  const projected: Array<{ x: number; y: number }> = [];
  const world = new THREE.Vector3();
  let frame = -1;

  THREE.Sprite.prototype.onBeforeRender = function onBeforeRender(
    renderer,
    scene,
    camera,
    geometry,
    material,
    group
  ) {
    original.call(this, renderer, scene, camera, geometry, material, group);

    const sprite = this as THREE.Sprite;
    const spriteMaterial = sprite.material;
    if (!(spriteMaterial instanceof THREE.SpriteMaterial)) return;
    if (!(spriteMaterial.map instanceof THREE.CanvasTexture)) return;

    const renderFrame = renderer.info.render.frame;
    if (renderFrame !== frame) {
      frame = renderFrame;
      projected.length = 0;
    }

    sprite.getWorldPosition(world).project(camera);
    const width = Math.max(1, renderer.domElement.clientWidth);
    const height = Math.max(1, renderer.domElement.clientHeight);
    const point = {
      x: (world.x * 0.5 + 0.5) * width,
      y: (-world.y * 0.5 + 0.5) * height
    };

    const nearest = projected.reduce((best, candidate) => {
      const dx = candidate.x - point.x;
      const dy = candidate.y - point.y;
      return Math.min(best, Math.hypot(dx, dy));
    }, Number.POSITIVE_INFINITY);

    const dense = nearest < 118;
    const crowded = nearest < 76;
    spriteMaterial.opacity = crowded ? 0.08 : dense ? 0.26 : 0.9;
    spriteMaterial.transparent = true;

    if (!dense) projected.push(point);
  };
}
