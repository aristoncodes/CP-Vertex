"use client";

import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";

interface ParticleStormProps {
  intensity?: number;
}

export function ParticleStorm({ intensity = 1 }: ParticleStormProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 12;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    /* ── Floating particles ── */
    const particleCount = 600;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    const palette = [
      new THREE.Color("#ff2d55"),
      new THREE.Color("#00e5ff"),
      new THREE.Color("#7c3aed"),
      new THREE.Color("#ffffff"),
    ];

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3]     = (Math.random() - 0.5) * 30;
      positions[i3 + 1] = (Math.random() - 0.5) * 30;
      positions[i3 + 2] = (Math.random() - 0.5) * 20 - 5;

      velocities[i3]     = (Math.random() - 0.5) * 0.008;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.008;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.004;

      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i3]     = c.r;
      colors[i3 + 1] = c.g;
      colors[i3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);

    /* ── Sword geometry ── */
    const swordGroup = new THREE.Group();

    /* Blade — angular katana shape */
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0, -2.5);
    bladeShape.lineTo(0.12, -2);
    bladeShape.lineTo(0.08, 2.5);
    bladeShape.lineTo(0, 3);
    bladeShape.lineTo(-0.08, 2.5);
    bladeShape.lineTo(-0.12, -2);
    bladeShape.lineTo(0, -2.5);

    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
      depth: 0.04,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 1,
    });
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a1a,
      metalness: 0.98,
      roughness: 0.02,
      emissive: 0x0044cc,
      emissiveIntensity: 0.4,
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.z = -0.02;
    swordGroup.add(blade);

    /* Guard — crimson bar */
    const guardGeo = new THREE.BoxGeometry(0.5, 0.06, 0.08);
    const guardMat = new THREE.MeshStandardMaterial({
      color: 0xff2d55,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0xff2d55,
      emissiveIntensity: 0.5,
    });
    const guard = new THREE.Mesh(guardGeo, guardMat);
    guard.position.y = -2;
    swordGroup.add(guard);

    /* Handle */
    const handleGeo = new THREE.CylinderGeometry(0.04, 0.035, 1, 6);
    const handleMat = new THREE.MeshStandardMaterial({
      color: 0x12151f,
      metalness: 0.7,
      roughness: 0.4,
    });
    const handleMesh = new THREE.Mesh(handleGeo, handleMat);
    handleMesh.position.y = -2.7;
    swordGroup.add(handleMesh);

    /* Edge glow line */
    const edgeGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -2.5, 0.04),
      new THREE.Vector3(0, 3, 0.04),
    ]);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.8,
    });
    swordGroup.add(new THREE.Line(edgeGeo, edgeMat));

    swordGroup.position.set(0, 0, 0);
    swordGroup.rotation.z = 0.15;
    scene.add(swordGroup);

    /* ── Lights ── */
    scene.add(new THREE.AmbientLight(0x1a1a3e, 0.6));

    const cyanLight = new THREE.PointLight(0x00e5ff, 3, 30);
    cyanLight.position.set(4, 4, 8);
    scene.add(cyanLight);

    const accentLight = new THREE.PointLight(0xff2d55, 2, 25);
    accentLight.position.set(-3, -2, 6);
    scene.add(accentLight);

    /* ── Animate ── */
    let t = 0;
    const animate = () => {
      t += 0.005;
      animationRef.current = requestAnimationFrame(animate);

      /* Drift particles */
      const pos = geo.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        arr[i3]     += velocities[i3] * intensity;
        arr[i3 + 1] += velocities[i3 + 1] * intensity;
        arr[i3 + 2] += velocities[i3 + 2] * intensity;
        if (Math.abs(arr[i3]) > 15) arr[i3] *= -0.95;
        if (Math.abs(arr[i3 + 1]) > 15) arr[i3 + 1] *= -0.95;
        if (Math.abs(arr[i3 + 2]) > 12) arr[i3 + 2] *= -0.95;
      }
      pos.needsUpdate = true;

      /* Cursor → sword tilt */
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      swordGroup.rotation.x += (my * 0.12 - swordGroup.rotation.x) * 0.04;
      swordGroup.rotation.y += (mx * 0.12 - swordGroup.rotation.y) * 0.04;
      swordGroup.rotation.z = 0.15 + Math.sin(t) * 0.03;

      /* Breathing glow */
      bladeMat.emissiveIntensity = 0.4 + Math.sin(t * 2) * 0.2;

      /* Moving lights */
      cyanLight.position.x = Math.sin(t * 0.5) * 5;
      cyanLight.position.y = Math.cos(t * 0.3) * 4;

      renderer.render(scene, camera);
    };
    animate();

    /* Resize */
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", handleMouseMove);
      renderer.dispose();
      geo.dispose();
      mat.dispose();
    };
  }, [intensity, handleMouseMove]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}
