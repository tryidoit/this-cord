import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const TARGET = 14;
const TIME_LIMIT = 36;

// 3D target practice: shatter all 12 orbiting cores before the clock runs out.
export default function OrbitSlam({ onFinish }) {
  const mountRef = useRef(null);
  const [hits, setHits] = useState(0);
  const [time, setTime] = useState(TIME_LIMIT);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, el.clientWidth / el.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 11);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const l1 = new THREE.PointLight(0xa855f7, 60, 40);
    l1.position.set(4, 5, 6);
    scene.add(l1);
    const l2 = new THREE.PointLight(0x2dd4bf, 45, 40);
    l2.position.set(-5, -4, 4);
    scene.add(l2);

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.25, 1),
      new THREE.MeshStandardMaterial({ color: 0x1e1b4b, emissive: 0x6d28d9, emissiveIntensity: 0.7, metalness: 0.6, roughness: 0.25, flatShading: true })
    );
    scene.add(core);
    const shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.7, 0),
      new THREE.MeshBasicMaterial({ color: 0x8b5cf6, wireframe: true, transparent: true, opacity: 0.35 })
    );
    scene.add(shell);

    const orbs = [];
    for (let i = 0; i < TARGET; i += 1) {
      const pivot = new THREE.Object3D();
      pivot.rotation.x = (Math.random() - 0.5) * 1.5;
      pivot.rotation.z = (Math.random() - 0.5) * 1.4;
      pivot.rotation.y = Math.random() * Math.PI;
      const mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.42, 0),
        new THREE.MeshStandardMaterial({ color: 0x2dd4bf, emissive: 0x0d9488, emissiveIntensity: 1.5, metalness: 0.6, roughness: 0.15, flatShading: true })
      );
      const radius = 3.1 + (i % 3) * 0.6;
      mesh.position.set(radius, 0, 0);
      pivot.add(mesh);
      scene.add(pivot);
      orbs.push({ pivot, mesh, speed: 0.55 + Math.random() * 0.85, alive: true, radius });
    }

    let finished = false;
    let remaining = TIME_LIMIT;
    let hitCount = 0;
    const finish = (win) => {
      if (finished) return;
      finished = true;
      onFinish(win ? "win" : "lose");
    };

    const timer = setInterval(() => {
      remaining -= 1;
      setTime(Math.max(0, remaining));
      if (remaining <= 0) {
        clearInterval(timer);
        finish(false);
      }
    }, 1000);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onPointer = (e) => {
      if (finished) return;
      const rect = el.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const alive = orbs.filter((o) => o.alive).map((o) => o.mesh);
      const hit = raycaster.intersectObjects(alive, false)[0];
      if (!hit) {
        camera.position.x += (Math.random() - 0.5) * 0.3;
        return;
      }
      const target = orbs.find((o) => o.mesh === hit.object);
      if (!target) return;
      target.alive = false;
      target.pivot.remove(target.mesh);
      hitCount += 1;
      setHits(hitCount);
      if (hitCount >= TARGET) finish(true);
    };
    el.addEventListener("pointerdown", onPointer);

    const clock = new THREE.Clock();
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      core.rotation.y += dt * 0.35;
      core.rotation.x += dt * 0.15;
      shell.rotation.y -= dt * 0.22;
      orbs.forEach((o) => {
        if (!o.alive) return;
        o.pivot.rotation.y += dt * o.speed;
        o.pivot.rotation.z += dt * o.speed * 0.35;
        o.mesh.rotation.x += dt * 2;
        o.mesh.rotation.y += dt * 1.4;
      });
      camera.position.z = 11 + Math.sin(performance.now() * 0.0006) * 0.4;
      camera.lookAt(0, 0, 0);
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
      clearInterval(timer);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      el.removeEventListener("pointerdown", onPointer);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [onFinish]);

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full cursor-crosshair touch-none" />
      <div className="pointer-events-none absolute inset-x-0 top-4 flex items-start justify-center gap-3">
        <div className="rounded-full border border-border bg-background/50 px-4 py-1.5 text-center backdrop-blur">
          <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/40">shattered</p>
          <p className="font-display text-lg font-bold text-info">
            {hits} <span className="text-foreground/30">/ {TARGET}</span>
          </p>
        </div>
        <div className="rounded-full border border-border bg-background/50 px-4 py-1.5 text-center backdrop-blur">
          <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/40">time</p>
          <p className={`font-display text-lg font-bold ${time <= 10 ? "text-danger" : "text-foreground"}`}>{time}s</p>
        </div>
      </div>
      <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] text-foreground/30">
        tap or click every cyan core
      </p>
    </div>
  );
}