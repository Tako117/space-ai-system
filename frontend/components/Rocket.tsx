"use client";

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

type Props = {
  position: THREE.Vector3;
  rotation?: THREE.Euler;
  // desired visual height in scene units (Earth radius is 5)
  desiredHeight?: number;
};

function computeNormalizedScaleByHeight(obj: THREE.Object3D, desiredHeight: number) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);

  const h = Math.max(size.y, 1e-6);
  return desiredHeight / h;
}

export default function Rocket({ position, rotation, desiredHeight = 2.2 }: Props) {
  const { scene } = useGLTF("/assets/models/rocket.glb");

  const normalized = useMemo(() => {
    const cloned = scene.clone(true);

    // IMPORTANT: ensure stable visuals + avoid shared material weirdness
    cloned.traverse((o: any) => {
      if (o?.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;

        // clone material so multiple instances don't fight each other
        if (o.material) o.material = o.material.clone();
      }
    });

    const scale = computeNormalizedScaleByHeight(cloned, desiredHeight);
    return { object: cloned, scale };
  }, [scene, desiredHeight]);

  return (
    <primitive
      object={normalized.object}
      position={position}
      rotation={rotation}
      scale={normalized.scale}
    />
  );
}

useGLTF.preload("/assets/models/rocket.glb");
