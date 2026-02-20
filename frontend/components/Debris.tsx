"use client";

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

type Props = {
  position: THREE.Vector3;
  rotation?: THREE.Euler;
  // desired visual diameter in scene units
  desiredSize?: number;
};

function computeNormalizedScaleByDiameter(obj: THREE.Object3D, desiredSize: number) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);

  const d = Math.max(size.x, size.y, size.z, 1e-6);
  return desiredSize / d;
}

export default function Debris({ position, rotation, desiredSize = 0.35 }: Props) {
  const { scene } = useGLTF("/assets/models/debris_fragment.glb");

  const normalized = useMemo(() => {
    const cloned = scene.clone(true);

    cloned.traverse((o: any) => {
      if (o?.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (o.material) o.material = o.material.clone();
      }
    });

    const scale = computeNormalizedScaleByDiameter(cloned, desiredSize);
    return { object: cloned, scale };
  }, [scene, desiredSize]);

  return (
    <primitive
      object={normalized.object}
      position={position}
      rotation={rotation}
      scale={normalized.scale}
    />
  );
}

useGLTF.preload("/assets/models/debris_fragment.glb");
