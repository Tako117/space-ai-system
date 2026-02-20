"use client";

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

type Props = {
  position: THREE.Vector3;
  rotation?: THREE.Euler;
  damaged?: boolean;
  // desired panel span (width) in scene units (Earth radius is 5)
  desiredSpan?: number;
};

function computeNormalizedScaleBySpan(obj: THREE.Object3D, desiredSpan: number) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);

  // span should represent the “wings”/overall width of satellite
  const span = Math.max(size.x, size.z, 1e-6);
  return desiredSpan / span;
}

export default function Satellite({ position, rotation, damaged, desiredSpan = 2.0 }: Props) {
  const { scene } = useGLTF("/assets/models/satellite.glb");

  const normalized = useMemo(() => {
    const cloned = scene.clone(true);

    cloned.traverse((o: any) => {
      if (o?.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;

        // clone material so “damaged” effect doesn't mutate the original shared material
        if (o.material) o.material = o.material.clone();

        if (damaged && o.material) {
          // subtle darken; DO NOT create emissive artifacts
          try {
            const mat = o.material as THREE.MeshStandardMaterial;
            if (mat.color) mat.color.multiplyScalar(0.7);
            mat.needsUpdate = true;
          } catch {}
        }
      }
    });

    const scale = computeNormalizedScaleBySpan(cloned, desiredSpan);
    return { object: cloned, scale };
  }, [scene, desiredSpan, damaged]);

  return (
    <primitive
      object={normalized.object}
      position={position}
      rotation={rotation}
      scale={normalized.scale}
    />
  );
}

useGLTF.preload("/assets/models/satellite.glb");
