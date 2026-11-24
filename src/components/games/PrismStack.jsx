import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const TARGET_HEIGHT = 10;
const SIZE = 2.6;

// 3D stacker: drop each block on top of the tower without missing.
export default function PrismStack({ onFinish }) {
  const mountRef = useRef(null);
  const [stacked, setStacked] = useState(0);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x06060b, 18, 42);
    const camera = new THREE.PerspectiveCamera(50, el.clientWidth / el.clientHeight, 0.1, 200);
    camera.position.set(7.5, 6.5, 10);
    camera.lookAt(0, 3, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const warm = new THREE.DirectionalLight(0xf0abfc, 2.2);
    warm.position.set(6, 10, 7);
    scene.add(warm);
    const cool = new THREE.DirectionalLight(0x2dd4bf, 1.8);
    cool.position.set(-8, 4, -4);
    scene.add(cool);

    const grid = new THREE.GridHelper(40, 40, 0x6d28d9, 0x1e1b4b);
    scene.add(grid);

    const palette = [0x8b5cf6, 0x2dd4bf, 0xf472b6, 0xfbbf24, 0x60a5fa];
    const blocks = [];

    const makeBlock = (x, y, colorIndex) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(SIZE, 1, SIZE),
        new THREE.MeshStandardMaterial({
          color: palette[colorIndex % palette.length],
          emissive: palette[colorIndex % palette.length],
          emissiveIntensity: 0.35,
          metalness: 0.55,
          roughness: 0.25,
        })
      );
      mesh.position.set(x, y, 0);
      return mesh;
    };

    const base = makeBlock(0, 0.5, 0);
    scene.add(base);
    blocks.push(base);

    let moving = makeBlock(0, 1.5, 1);
    scene.add(moving);
    let direction = 1;
    let dropY = null;
    let resolving = false;
    let finished = false;

    const finish = (win) => {
      if (finished) return;
      finished = true;
      onFinish(win ? "win" : "lose");
    };

    const drop = () => {
      if (dropY !== null || resolving || finished) return;
      dropY = blocks[blocks.length - 1].position.y + 1;
    };

    const resolveDrop = () => {
      resolving = true;
      const top = blocks[blocks.length - 1];
      const offset = Math.abs(moving.position.x - top.position.x);
      if (offset > SIZE * 0.72) {
        finish(false);
        return;
      }
      moving.position.x = THREE.MathUtils.lerp(moving.position.x, top.position.x, 0.35);
      moving.position.y = top.position.y + 1;
      blocks.push(moving);
      setStacked(blocks.length - 1);
      camera.position.y += 0.35;
      if (blocks.length - 1 >= TARGET_HEIGHT) {
        finish(true);
        return;
      }
      const next = makeBlock(0, blocks[blocks.length - 1].position.y + 1, blocks.length);
      next.position.x = direction > 0 ? -3.4 : 3.4;
      scene.add(next);
      moving = next;
      dropY = null;
      resolving = false;
    };

    const onKey = (e) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        drop();
      }
    };
    window.addEventListener("keydown", onKey);
    el.addEventListener("pointerdown", drop);

    const clock = new THREE.Clock();
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);

      if (!finished) {
        if (dropY === null) {
          const speed = 3.4 + blocks.length * 0.45;
          moving.position.x += direction * speed * dt;
          if (moving.position.x > 3.4) {
            moving.position.x = 3.4;
            direction = -1;
          }
          if (moving.position.x < -3.4) {
            moving.position.x = -3.4;
            direction = 1;
          }
        } else {
          moving.position.y -= 14 * dt;
          if (moving.position.y <= dropY) {
            moving.position.y = dropY;
            resolveDrop();
          }
        }
      }

      blocks.forEach((b, i) => {
        b.rotation.y = Math.sin(performance.now() * 0.0004 + i * 0.2) * 0.03;
      });

      camera.lookAt(0, Math.max(2.5, blocks.length * 0.4 + 1.5), 0);
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      el.removeEventListener("pointerdown", drop);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [onFinish]);

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full cursor-pointer touch-none" />
      <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-border bg-background/50 px-4 py-1.5 text-center backdrop-blur">
        <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/40">tower</p>
        <p className="font-display text-lg font-bold text-primary">
          {stacked} <span className="text-foreground/30">/ {TARGET_HEIGHT}</span>
        </p>
      </div>
      <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] text-foreground/30">
        click or press space to drop · keep the tower straight
      </p>
    </div>
  );
}