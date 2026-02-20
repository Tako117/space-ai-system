"use client";

import { useLoader } from "@react-three/fiber";
import * as THREE from "three";

export default function Earth() {
  const texture = useLoader(THREE.TextureLoader, "/assets/earth/earth_diffuse.jpg");
  const normal = useLoader(THREE.TextureLoader, "/assets/earth/earth_normal.jpg");
  const specular = useLoader(THREE.TextureLoader, "/assets/earth/earth_specular.jpg");

  // ✅ FIX: was 128x128 (heavy) and can trigger WebGL context loss during fast refresh.
  // 64x64 is visually fine and much lighter.
  return (
    <mesh position={[0, 0, 0]}>
      <sphereGeometry args={[5, 64, 64]} />
      <meshPhongMaterial map={texture} normalMap={normal} specularMap={specular} />
    </mesh>
  );
}
