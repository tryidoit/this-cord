import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const LANES = [-2.4, 0, 2.4];
const TARGET = 12;

// 3D neon dodger: collect 12 energy cores while dodging the red blocks.
export default function VortexRun({ onFinish }) {
  const mountRef = useRef(null);
  const [collected, setCollected] = useState(0);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x06060b, 0.03);
    const camera = new THREE.PerspectiveCamera(64, el.clientWidth / el.clientHeight, 0.1, 140);
    camera.position.set(0, 3.6, 8);
    camera.lookAt(0, 1, -6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const violet = new THREE.DirectionalLight(0xa855f7, 2);
    violet.position.set(4, 7, 5);
    scene.add(violet);
    const teal = new THREE.DirectionalLight(0x2dd4bf, 1.6);
    teal.position.set(-5, 3, -3);
    scene.add(teal);

    const grid = new THREE.GridHelper(80, 80, 0x8b5cf6, 0x1e1b4b);
    grid.position.set(0, 0, -20);
    scene.add(grid);

    const player = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.95, 0.95),
      new THREE.MeshStandardMaterial({ color: 0x8b5cf6, emissive: 0x6d28d9, emissiveIntensity: 0.9, metalness: 0.5, roughness: 0.2 })
    );
    player.position.set(0, 0.75, 2);
    scene.add(player);

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(1.05, 0.03, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.7 })
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.06;
    scene.add(halo);

    let lane = 1;
    let targetX = 0;
    let score = 0;
    let spawnTimer = 0.35;
    let orbTimer = 0.8;
    let finished = false;
    const obstacles = [];
    const orbs = [];

    const finish = (win) => {
      if (finished) return;
      finished = true;
      onFinish(win ? "win" : "lose");
    };

    const spawnObstacle = () => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 1.7, 1.7),
        new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0x7f1d1d, emissiveIntensity: 0.8, metalness: 0.35, roughness: 0.5 })
      );
      mesh.position.set(LANES[Math.floor(Math.random() * 3)], 1, -50 - Math.random() * 14);
      scene.add(mesh);
      obstacles.push(mesh);
    };

    const spawnOrb = () => {
      const mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.46, 0),
        new THREE.MeshStandardMaterial({ color: 0x2dd4bf, emissive: 0x14b8a6, emissiveIntensity: 1.6, metalness: 0.6, roughness: 0.1 })
      );
      mesh.position.set(LANES[Math.floor(Math.random() * 3)], 0.95, -55 - Math.random() * 20);
      scene.add(mesh);
      orbs.push(mesh);
    };

    const onKey = (e) => {
      if (["ArrowLeft", "a", "A"].includes(e.key)) {
        lane = Math.max(0, lane - 1);
        targetX = LANES[lane];
        e.preventDefault();
      }
      if (["ArrowRight", "d", "D"].includes(e.key)) {
        lane = Math.min(2, lane + 1);
        targetX = LANES[lane];
        e.preventDefault();
      }
    };

    const onPointer = (e) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      if (x < 0.34) lane = Math.max(0, lane - 1);
      else if (x > 0.66) lane = Math.min(2, lane + 1);
      targetX = LANES[lane];
    };

    window.addEventListener("keydown", onKey);
    el.addEventListener("pointerdown", onPointer);

    const clock = new THREE.Clock();
    let raf = 0;

    const animate = () => {
      if (finished) return;
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const speed = 26 + score * 1.6;

      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnObstacle();
        spawnTimer = Math.max(0.26, 0.88 - score * 0.07);
      }
      orbTimer -= dt;
      if (orbTimer <= 0) {
        spawnOrb();
        orbTimer = 1.3;
      }

      player.position.x += (targetX - player.position.x) * Math.min(1, dt * 9);
      player.rotation.y += dt * 1.4;
      player.rotation.x += dt * 0.6;
      halo.position.x = player.position.x;
      camera.position.x = player.position.x * 0.32;
      camera.lookAt(player.position.x * 0.2, 1, -6);

      for (let i = obstacles.length - 1; i >= 0; i -= 1) {
        const o = obstacles[i];
        o.position.z += speed * dt;
        o.rotation.y += dt * 1.6;
        if (Math.abs(o.position.z - player.position.z) < 1.55 && Math.abs(o.position.x - player.position.x) < 1.38) {
          finish(false);
          return;
        }
        if (o.position.z > 10) {
          scene.remove(o);
          obstacles.splice(i, 1);
        }
      }

      for (let i = orbs.length - 1; i >= 0; i -= 1) {
        const o = orbs[i];
        o.position.z += speed * dt;
        o.rotation.y += dt * 3;
        o.position.y = 0.95 + Math.sin(performance.now() * 0.003 + i) * 0.16;
        if (Math.abs(o.position.z - player.position.z) < 1.5 && Math.abs(o.position.x - player.position.x) < 1.3) {
          scene.remove(o);
          orbs.splice(i, 1);
          score += 1;
          setCollected(score);
          if (score >= TARGET) {
            finish(true);
            return;
          }
        } else if (o.position.z > 10) {
          scene.remove(o);
          orbs.splice(i, 1);
        }
      }

      grid.position.z += speed * dt;
      if (grid.position.z > 1) grid.position.z -= 1;

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
      el.removeEventListener("pointerdown", onPointer);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [onFinish]);

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full touch-none" />
      <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-border bg-background/50 px-4 py-1.5 text-center backdrop-blur">
        <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/40">energy</p>
        <p className="font-display text-lg font-bold text-info">
          {collected} <span className="text-foreground/30">/ {TARGET}</span>
        </p>
      </div>
      <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] text-foreground/30">
        ← → or tap the sides · dodge red, grab cyan
      </p>
    </div>
  );
}