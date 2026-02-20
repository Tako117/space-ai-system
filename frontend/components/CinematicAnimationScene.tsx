"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import Earth from "./Earth";

/** ---------- helpers ---------- */

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function smooth01(t: number) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x); // smoothstep
}

function computeScaleBySpan(obj: THREE.Object3D, desiredSpan: number) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);
  const span = Math.max(size.x, size.z, 1e-6);
  return desiredSpan / span;
}

function computeScaleByDiameter(obj: THREE.Object3D, desiredSize: number) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);
  const d = Math.max(size.x, size.y, size.z, 1e-6);
  return desiredSize / d;
}

function cloneWithClonedMaterials(scene: THREE.Object3D) {
  const cloned = scene.clone(true);
  cloned.traverse((o: any) => {
    if (o?.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      if (o.material) o.material = o.material.clone();
    }
  });
  return cloned;
}

/** ---------- models ---------- */

function Satellite({
  refObj,
  desiredSpan,
  damaged,
  powerOff,
}: {
  refObj: React.MutableRefObject<THREE.Object3D | null>;
  desiredSpan: number;
  damaged: boolean;
  powerOff: boolean;
}) {
  const { scene } = useGLTF("/assets/models/satellite.glb");

  const normalized = useMemo(() => {
    const cloned = cloneWithClonedMaterials(scene);
    const scale = computeScaleBySpan(cloned, desiredSpan);
    return { obj: cloned, scale };
  }, [scene, desiredSpan]);

  // Visual "power off" (darken) without replacing materials
  useEffect(() => {
    const obj = normalized.obj;
    if (!obj) return;

    obj.traverse((o: any) => {
      if (!o?.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        // Try standard material first
        const mat: any = m;
        if (mat?.color) {
          // reset baseline first
          // (we don't know original, so we do soft multiply only on powerOff)
          if (powerOff) mat.color.multiplyScalar(0.6);
          else mat.color.multiplyScalar(1.0);
        }
        if ("emissiveIntensity" in mat) {
          mat.emissiveIntensity = powerOff ? 0.0 : mat.emissiveIntensity ?? 0.2;
        }
        mat.needsUpdate = true;
      }
    });
  }, [normalized.obj, powerOff]);

  // Damage tumble (very visible)
  useFrame((_, dt) => {
    if (!refObj.current) return;

    if (damaged) {
      refObj.current.rotation.x += dt * 1.4;
      refObj.current.rotation.y += dt * 1.0;
      refObj.current.rotation.z += dt * 1.2;
    } else {
      // slow stable drift pre-impact
      refObj.current.rotation.y += dt * 0.18;
    }
  });

  return <primitive object={normalized.obj} ref={refObj as any} scale={normalized.scale} />;
}

function Debris({
  refObj,
  desiredSize,
  visible,
}: {
  refObj: React.MutableRefObject<THREE.Object3D | null>;
  desiredSize: number;
  visible: boolean;
}) {
  const { scene } = useGLTF("/assets/models/debris_fragment.glb");

  const normalized = useMemo(() => {
    const cloned = cloneWithClonedMaterials(scene);
    const scale = computeScaleByDiameter(cloned, desiredSize);
    return { obj: cloned, scale };
  }, [scene, desiredSize]);

  useFrame((_, dt) => {
    if (!refObj.current) return;
    if (!visible) return;
    refObj.current.rotation.x += dt * 2.1;
    refObj.current.rotation.z += dt * 2.4;
  });

  return (
    <primitive
      object={normalized.obj}
      ref={refObj as any}
      scale={normalized.scale}
      visible={visible}
    />
  );
}

/** ---------- animation driver ---------- */

type Phase = "SETUP" | "APPROACH" | "IMPACT" | "FAILURE" | "DONE";

function Driver({
  runId,
  onFinished,
}: {
  runId: number;
  onFinished: () => void;
}) {
  const satRef = useRef<THREE.Object3D | null>(null);
  const debrisRef = useRef<THREE.Object3D | null>(null);
  const flashRef = useRef<THREE.Mesh | null>(null);

  const [phase, setPhase] = useState<Phase>("SETUP");
  const [damaged, setDamaged] = useState(false);
  const [powerOff, setPowerOff] = useState(false);
  const [debrisVisible, setDebrisVisible] = useState(true);

  // Earth radius is 5 in your Earth.tsx
  const EARTH_R = 5;
  const ORBIT_R = 8.4;

  // One place to control ratios
  const VIS = useMemo(
    () => ({
      satelliteSpan: 2.2,
      debrisSize: 0.35,
    }),
    []
  );

  const t0Ref = useRef<number | null>(null);
  const tImpactRef = useRef<number | null>(null);

  // Precomputed positions
  const satStart = useMemo(() => new THREE.Vector3(ORBIT_R, 0, 0), []);
  const debrisStart = useMemo(() => new THREE.Vector3(-ORBIT_R - 2.0, 0.6, 1.4), []);
  const debrisEndOffset = useMemo(() => new THREE.Vector3(1.6, 0.2, -1.0), []);

  // Reset on restart
  useEffect(() => {
    setPhase("SETUP");
    setDamaged(false);
    setPowerOff(false);
    setDebrisVisible(true);
    t0Ref.current = null;
    tImpactRef.current = null;

    if (satRef.current) {
      satRef.current.position.copy(satStart);
      satRef.current.rotation.set(0, 0, 0);
    }
    if (debrisRef.current) {
      debrisRef.current.position.copy(debrisStart);
      debrisRef.current.rotation.set(0, 0, 0);
      debrisRef.current.visible = true;
    }
    if (flashRef.current) {
      flashRef.current.visible = false;
      flashRef.current.scale.set(1, 1, 1);
      (flashRef.current.material as THREE.MeshBasicMaterial).opacity = 0.0;
    }
  }, [runId, debrisStart, satStart]);

  useFrame((state, dt) => {
    if (!satRef.current || !debrisRef.current) return;
    if (phase === "DONE") return;

    const t = state.clock.getElapsedTime();
    if (t0Ref.current == null) t0Ref.current = t;
    const tt = t - (t0Ref.current ?? 0);

    // Keep satellite in a believable orbit ring (small motion only)
    // (so it looks alive before impact)
    const orbitOmega = 0.25;
    const a = tt * orbitOmega;
    satRef.current.position.set(Math.cos(a) * ORBIT_R, 0, Math.sin(a) * ORBIT_R);

    if (phase === "SETUP") {
      // debris starts far away, visible
      debrisRef.current.position.copy(debrisStart);
      setPhase("APPROACH");
    }

    if (phase === "APPROACH") {
      // 0..4 seconds approach to satellite
      const u = smooth01(tt / 4.0);

      // debris aims at current satellite position (so impact is guaranteed and visible)
      const target = satRef.current.position.clone();
      const from = debrisStart.clone();
      const to = target.clone();

      // add slight curve so it doesn't look like a straight line in screen-space
      const curve = new THREE.Vector3(0, 0.8 * Math.sin(u * Math.PI), 0.6 * Math.cos(u * Math.PI));
      debrisRef.current.position.copy(from.lerp(to, u).add(curve.multiplyScalar(0.35)));

      const dist = debrisRef.current.position.distanceTo(target);
      if (dist < 0.35) {
        setPhase("IMPACT");
        tImpactRef.current = t;
      }
    }

    if (phase === "IMPACT") {
      // Visible flash at impact point
      if (flashRef.current) {
        flashRef.current.visible = true;
        flashRef.current.position.copy(satRef.current.position);
      }

      // debris passes through and continues a bit (so users SEE it hit)
      const passDir = debrisRef.current.position
        .clone()
        .sub(satRef.current.position)
        .normalize()
        .multiplyScalar(0.18);
      debrisRef.current.position.add(passDir);

      if (!damaged) setDamaged(true);
      if (!powerOff) setPowerOff(true);

      // Flash fade 0.7s then go to failure
      const tImpact = tImpactRef.current ?? t;
      const elapsed = t - tImpact;

      if (flashRef.current) {
        const k = clamp01(1.0 - elapsed / 0.7);
        const s = 1.0 + (1.0 - k) * 3.0;
        flashRef.current.scale.set(s, s, s);

        const mat = flashRef.current.material as THREE.MeshBasicMaterial;
        mat.transparent = true;
        mat.opacity = 0.9 * k;
      }

      if (elapsed >= 0.75) setPhase("FAILURE");
    }

    if (phase === "FAILURE") {
      // keep tumbling for a few seconds, then stop animation once
      const timeInFailure = (t - (tImpactRef.current ?? t)) - 0.75;

      // optionally let debris drift away and then hide it
      if (timeInFailure > 0.6) {
        debrisRef.current.position.lerp(
          debrisRef.current.position.clone().add(debrisEndOffset),
          0.02
        );
      }
      if (timeInFailure > 2.5) {
        setDebrisVisible(false);
      }

      if (timeInFailure > 4.0) {
        setPhase("DONE");
        onFinished();
      }
    }
  });

  return (
    <>
      <Satellite
        refObj={satRef}
        desiredSpan={VIS.satelliteSpan}
        damaged={damaged}
        powerOff={powerOff}
      />

      <Debris refObj={debrisRef} desiredSize={VIS.debrisSize} visible={debrisVisible} />

      {/* Impact flash (separate object; will NOT become part of the satellite) */}
      <mesh ref={flashRef as any} visible={false}>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshBasicMaterial color={0xff3b6b} />
      </mesh>

      {/* Optional: faint orbit ring for context (tiny, simple) */}
      <line>
        <bufferGeometry
          attach="geometry"
          onUpdate={(g) => {
            const pts: THREE.Vector3[] = [];
            const steps = 160;
            for (let i = 0; i <= steps; i++) {
              const a = (i / steps) * Math.PI * 2;
              pts.push(new THREE.Vector3(Math.cos(a) * ORBIT_R, 0, Math.sin(a) * ORBIT_R));
            }
            (g as any).setFromPoints(pts);
          }}
        />
        <lineBasicMaterial transparent opacity={0.18} color={new THREE.Color(1, 1, 1)} />
      </line>

      {/* keep Earth in scene */}
      <Earth />
    </>
  );
}

/** ---------- component ---------- */

export default function CinematicAnimationScene() {
  const [finished, setFinished] = useState(false);
  const [runId, setRunId] = useState(1);

  return (
    <div className="relative w-full h-full">
      <Canvas camera={{ position: [0, 9, 18], fov: 45, near: 0.1, far: 2000 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.35} />
          <directionalLight position={[10, 10, 5]} intensity={1.2} />
          <pointLight position={[-8, 6, -10]} intensity={0.55} />

          <OrbitControls enablePan enableZoom enableRotate />

          <Driver
            runId={runId}
            onFinished={() => {
              setFinished(true);
            }}
          />
        </Suspense>
      </Canvas>

      {finished && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <button
            onClick={() => {
              setFinished(false);
              setRunId((x) => x + 1); // restart without page reload
            }}
            className="px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/15 transition"
          >
            Restart
          </button>
        </div>
      )}
    </div>
  );
}

useGLTF.preload("/assets/models/satellite.glb");
useGLTF.preload("/assets/models/debris_fragment.glb");
