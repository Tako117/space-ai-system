"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import Earth from "./Earth";

export type Decision = {
  action: "NO_ACTION" | "MONITOR" | "AVOIDANCE_MANEUVER";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  time_window_s: number;
};

export type PredictionResponse = {
  satellite_id: string;
  debris_id: string;
  collision_risk: number;
  final_risk?: number;
  time_to_closest_s: number;
  min_distance_m: number;
  relative_speed_mps: number;
  decision: Decision;
};

export type ScenarioRiskRequest = {
  closest_approach_km: number;
  relative_velocity_kms: number;
  time_to_closest_min: number;
  altitude_difference_km: number;
};

// --- Helpers ---

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function smooth01(t: number) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

function computeScaleBySpan(obj: THREE.Object3D, desiredSpan: number) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);
  const span = Math.max(size.x, size.z, 1e-6);
  return desiredSpan / span;
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

function computeScaleByDiameter(obj: THREE.Object3D, desiredSize: number) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);
  const d = Math.max(size.x, size.y, size.z, 1e-6);
  return desiredSize / d;
}

// --- Models ---

function Satellite({
  refObj,
  desiredSpan,
  damaged,
  powerOff,
  opacity = 1.0,
}: {
  refObj: React.MutableRefObject<THREE.Object3D | null>;
  desiredSpan: number;
  damaged: boolean;
  powerOff: boolean;
  opacity?: number;
}) {
  const { scene } = useGLTF("/assets/models/satellite.glb");

  const normalized = useMemo(() => {
    const cloned = cloneWithClonedMaterials(scene);
    const scale = computeScaleBySpan(cloned, desiredSpan);
    return { obj: cloned, scale };
  }, [scene, desiredSpan]);

  useEffect(() => {
    const obj = normalized.obj;
    if (!obj) return;
    obj.traverse((o: any) => {
      if (!o?.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        const mat: any = m;
        if (mat?.color) {
          if (powerOff) mat.color.setHex(0x333333);
          else mat.color.setHex(0xffffff); // simplistic reset
        }
        if ("emissiveIntensity" in mat) {
          mat.emissiveIntensity = powerOff ? 0.0 : mat.emissiveIntensity ?? 0.2;
        }
        mat.transparent = opacity < 1.0;
        mat.opacity = opacity;
        mat.needsUpdate = true;
      }
    });
  }, [normalized.obj, powerOff, opacity]);

  useFrame((_, dt) => {
    if (!refObj.current) return;
    if (damaged) {
      refObj.current.rotation.x += dt * 1.4;
      refObj.current.rotation.y += dt * 1.0;
      refObj.current.rotation.z += dt * 1.2;
    } else {
      refObj.current.rotation.y += dt * 0.18;
    }
  });

  return <primitive object={normalized.obj} ref={refObj as any} scale={normalized.scale} />;
}

function Debris({
  refObj,
  desiredSize,
  visible,
  opacity = 1.0,
}: {
  refObj: React.MutableRefObject<THREE.Object3D | null>;
  desiredSize: number;
  visible: boolean;
  opacity?: number;
}) {
  const { scene } = useGLTF("/assets/models/debris_fragment.glb");

  const normalized = useMemo(() => {
    const cloned = cloneWithClonedMaterials(scene);
    const scale = computeScaleByDiameter(cloned, desiredSize);
    return { obj: cloned, scale };
  }, [scene, desiredSize]);

  useEffect(() => {
    const obj = normalized.obj;
    if (!obj) return;
    obj.traverse((o: any) => {
      if (!o?.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        const mat = m as THREE.Material;
        mat.transparent = opacity < 1.0;
        mat.opacity = opacity;
        mat.needsUpdate = true;
      }
    });
  }, [normalized.obj, opacity]);

  useFrame((_, dt) => {
    if (!refObj.current || !visible) return;
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

// --- Driver: Collision Preview ---

function CollisionDriver({
  report,
  inputs,
  runId,
  onFinished,
}: {
  report: PredictionResponse;
  inputs: ScenarioRiskRequest;
  runId: number;
  onFinished: () => void;
}) {
  const satRef = useRef<THREE.Object3D | null>(null);
  const debrisRef = useRef<THREE.Object3D | null>(null);
  const flashRef = useRef<THREE.Mesh | null>(null);

  const [phase, setPhase] = useState<"SETUP" | "APPROACH" | "IMPACT" | "PASS" | "FAILURE" | "DONE">("SETUP");
  const [damaged, setDamaged] = useState(false);
  const [powerOff, setPowerOff] = useState(false);

  const ORBIT_R = 8.4;
  const VIS = { satelliteSpan: 1.8, debrisSize: 0.35 };

  const t0Ref = useRef<number | null>(null);
  const tEventRef = useRef<number | null>(null);

  const satStart = useMemo(() => new THREE.Vector3(ORBIT_R, 0, 0), []);
  const debrisStart = useMemo(() => new THREE.Vector3(-ORBIT_R - 2.0, 0.5, 2.0), []);

  const isCollision = report.decision.severity === "HIGH" || report.decision.severity === "CRITICAL";

  // approach distance
  const missDistance = isCollision ? 0.0 : Math.max(0.4, Math.min(2.0, inputs.closest_approach_km / 100));

  useEffect(() => {
    setPhase("SETUP");
    setDamaged(false);
    setPowerOff(false);
    t0Ref.current = null;
    tEventRef.current = null;

    if (satRef.current) {
      satRef.current.position.copy(satStart);
      satRef.current.rotation.set(0, 0, 0);
    }
    if (debrisRef.current) {
      debrisRef.current.position.copy(debrisStart);
      debrisRef.current.rotation.set(0, 0, 0);
    }
    if (flashRef.current) {
      flashRef.current.visible = false;
      flashRef.current.scale.set(1, 1, 1);
      (flashRef.current.material as THREE.MeshBasicMaterial).opacity = 0.0;
    }
  }, [runId, report, inputs, satStart, debrisStart]);

  useFrame((state) => {
    if (!satRef.current || !debrisRef.current) return;
    if (phase === "DONE") return;

    const t = state.clock.getElapsedTime();
    if (t0Ref.current == null) t0Ref.current = t;
    const tt = t - (t0Ref.current ?? 0);

    // Speed affected by inputs (relative vel)
    const dtVel = Math.max(1.0, Math.min(15.0, inputs.relative_velocity_kms));
    const speedFactor = dtVel / 8.0;

    // Time to closest should affect pacing
    const dtTca = Math.max(1.0, Math.min(60.0, inputs.time_to_closest_min));
    const pacingFactor = dtTca / 15.0; // range 0.06 to 4.0

    const approachDuration = 4.0 * pacingFactor / speedFactor;

    const orbitOmega = 0.2;
    const a = tt * orbitOmega;
    satRef.current.position.set(Math.cos(a) * ORBIT_R, 0, Math.sin(a) * ORBIT_R);

    if (phase === "SETUP") {
      debrisRef.current.position.copy(debrisStart);
      setPhase("APPROACH");
    }

    if (phase === "APPROACH") {
      const u = smooth01(tt / approachDuration);

      const targetSpace = satRef.current.position.clone();
      if (!isCollision) {
        // add miss vector offset
        targetSpace.x += missDistance * 0.8;
        targetSpace.y += missDistance * 0.6;
        targetSpace.z += missDistance * 0.5;
      }

      const from = debrisStart.clone();
      const to = targetSpace;
      
      const distToCover = from.distanceTo(to);
      const currentPos = from.clone().lerp(to, u);
      
      // Arc bulge depends on altitude diff, make it very obvious
      const bulgeAmt = Math.max(0, Math.min(5.0, inputs.altitude_difference_km / 3.0));
      currentPos.y += Math.sin(u * Math.PI) * bulgeAmt;
      
      if (currentPos.length() < 5.2) currentPos.setLength(5.2);
      debrisRef.current.position.copy(currentPos);

      const dist = debrisRef.current.position.distanceTo(satRef.current.position);
      if (u >= 0.99) {
        if (isCollision && dist < 0.8) {
          setPhase("IMPACT");
        } else {
          setPhase("PASS");
        }
        tEventRef.current = t;
      }
    }

    if (phase === "IMPACT") {
      if (flashRef.current && !flashRef.current.visible) {
        flashRef.current.visible = true;
        flashRef.current.position.copy(satRef.current.position);
        setDamaged(true);
        setPowerOff(true);
      }

      const passDir = debrisRef.current.position.clone().sub(satRef.current.position).normalize().multiplyScalar(0.12);
      debrisRef.current.position.add(passDir);

      const elapsed = t - (tEventRef.current ?? t);
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

    if (phase === "PASS") {
      // Just continue drift
      const passDir = debrisRef.current.position.clone().normalize().multiplyScalar(0.05);
      passDir.y -= 0.05;
      debrisRef.current.position.add(passDir);

      const elapsed = t - (tEventRef.current ?? t);
      if (elapsed > 2.5) {
        setPhase("DONE");
        onFinished();
      }
    }

    if (phase === "FAILURE") {
      const elapsed = t - (tEventRef.current ?? t) - 0.75;
      if (elapsed > 2.5) {
        setPhase("DONE");
        onFinished();
      }
    }
  });

  return (
    <group>
      <Satellite refObj={satRef} desiredSpan={VIS.satelliteSpan} damaged={damaged} powerOff={powerOff} />
      <Debris refObj={debrisRef} desiredSize={VIS.debrisSize} visible={true} />
      <mesh ref={flashRef as any} visible={false}>
        <sphereGeometry args={[0.25, 24, 24]} />
        <meshBasicMaterial color={0xff3b6b} />
      </mesh>
      <lineLoop>
        <bufferGeometry attach="geometry" onUpdate={(g) => {
          const pts: THREE.Vector3[] = [];
          for (let i = 0; i <= 100; i++) {
            const a = (i / 100) * Math.PI * 2;
            pts.push(new THREE.Vector3(Math.cos(a) * ORBIT_R, 0, Math.sin(a) * ORBIT_R));
          }
          (g as any).setFromPoints(pts);
        }} />
        <lineBasicMaterial transparent opacity={0.2} color={new THREE.Color(0.45, 0.9, 1.0)} />
      </lineLoop>
    </group>
  );
}

// --- Driver: Avoidance Preview ---

function AvoidanceDriver({
  report,
  inputs,
  maneuver,
  runId,
  onFinished,
}: {
  report: PredictionResponse;
  inputs: ScenarioRiskRequest;
  maneuver?: any;
  runId: number;
  onFinished: () => void;
}) {
  const satSafeRef = useRef<THREE.Object3D | null>(null);
  const debrisRef = useRef<THREE.Object3D | null>(null);
  
  const [phase, setPhase] = useState<"SETUP" | "BURN" | "AVOID" | "DONE">("SETUP");

  const ORBIT_R = 8.4;
  const VIS = { satelliteSpan: 1.8, debrisSize: 0.35 };

  const t0Ref = useRef<number | null>(null);
  const satStart = useMemo(() => new THREE.Vector3(ORBIT_R, 0, 0), []);
  const debrisStart = useMemo(() => new THREE.Vector3(-ORBIT_R - 2.0, 0.5, 2.0), []);

  // Avoidance safe offset derived from maneuver recommendation
  const safeOffset = useMemo(() => {
    if (maneuver?.type === "Radial Raise") return new THREE.Vector3(0, 2.5, 0);
    if (maneuver?.type === "Normal-plane Offset") return new THREE.Vector3(0, 0, 3.0);
    return new THREE.Vector3(1.5, 0.5, 0.0); // Default Prograde
  }, [maneuver]);

  // Precompute ghost lines
  const originalLineGeom = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 100; i++) {
        const a = (i / 100) * 0.2 * 7.0; 
        pts.push(new THREE.Vector3(Math.cos(a) * ORBIT_R, 0, Math.sin(a) * ORBIT_R));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  const safeLineGeom = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 100; i++) {
        const timeStep = (i / 100) * 7.0;
        const a = timeStep * 0.2;
        const bP = new THREE.Vector3(Math.cos(a) * ORBIT_R, 0, Math.sin(a) * ORBIT_R);
        const bpProgress = clamp01((timeStep - 1.0) / 1.5);
        const sb = smooth01(bpProgress);
        pts.push(bP.add(safeOffset.clone().multiplyScalar(sb)));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [safeOffset]);

  useEffect(() => {
    setPhase("SETUP");
    t0Ref.current = null;

    if (satSafeRef.current) {
      satSafeRef.current.position.copy(satStart);
      satSafeRef.current.rotation.set(0, 0, 0);
    }
    if (debrisRef.current) {
      debrisRef.current.position.copy(debrisStart);
    }
  }, [runId, report, inputs, satStart, debrisStart]);

  useFrame((state) => {
    if (!satSafeRef.current || !debrisRef.current) return;
    if (phase === "DONE") return;

    const t = state.clock.getElapsedTime();
    if (t0Ref.current == null) t0Ref.current = t;
    const tt = t - (t0Ref.current ?? 0);

    const orbitOmega = 0.2;
    const a = tt * orbitOmega;
    const baseSatPos = new THREE.Vector3(Math.cos(a) * ORBIT_R, 0, Math.sin(a) * ORBIT_R);

    // The old path (ghost) is drawn as a line.
    
    // Dynamic approach duration based on inputs
    const dtVel = Math.max(1.0, Math.min(15.0, inputs.relative_velocity_kms));
    const speedFactor = dtVel / 8.0; 
    const dtTca = Math.max(1.0, Math.min(60.0, inputs.time_to_closest_min));
    const pacingFactor = dtTca / 15.0; 

    const approachDuration = 5.0 * pacingFactor / speedFactor;
    const burnStartTt = 1.0;
    const burnEndTt = 2.5;

    if (phase === "SETUP") {
      setPhase("BURN");
    }

    // Satellite Burn logic
    const burnProgress = clamp01((tt - burnStartTt) / (burnEndTt - burnStartTt));
    const smoothBurn = smooth01(burnProgress);
    
    // Safe satellite deviates to avoid collision
    const safePos = baseSatPos.clone().add(safeOffset.clone().multiplyScalar(smoothBurn));
    satSafeRef.current.position.copy(safePos);
    
    // Debris targets base position
    const u = clamp01(tt / approachDuration);
    const smoothU = smooth01(u);
    const targetCollisionPos = new THREE.Vector3(Math.cos(approachDuration * orbitOmega) * ORBIT_R, 0, Math.sin(approachDuration * orbitOmega) * ORBIT_R);
    
    const dPos = debrisStart.clone().lerp(targetCollisionPos, smoothU);
    if (dPos.length() < 5.2) dPos.setLength(5.2);
    debrisRef.current.position.copy(dPos);

    if (tt > approachDuration + 2.0) {
      setPhase("DONE");
      onFinished();
    }
  });

  return (
    <group>
      <Satellite refObj={satSafeRef} desiredSpan={VIS.satelliteSpan} damaged={false} powerOff={false} />
      <Debris refObj={debrisRef} desiredSize={VIS.debrisSize} visible={true} />
      
      {/* Ghost lines for original vs safe path */}
      <lineLoop geometry={originalLineGeom}>
        <lineBasicMaterial transparent opacity={0.6} color={new THREE.Color(1, 0.2, 0.2)} />
      </lineLoop>

      <lineLoop geometry={safeLineGeom}>
        <lineBasicMaterial transparent opacity={0.8} color={new THREE.Color(0.2, 1, 0.5)} />
      </lineLoop>
    </group>
  );
}

export default function ScenarioVisualizer({
  mode,
  report,
  inputs,
  maneuver,
}: {
  mode: "collision" | "avoidance";
  report: PredictionResponse;
  inputs: ScenarioRiskRequest;
  maneuver?: any;
}) {
  const [runId, setRunId] = useState(1);
  const [finished, setFinished] = useState(false);

  // Restart when inputs change meaningfully
  useEffect(() => {
    setRunId((r) => r + 1);
    setFinished(false);
  }, [report?.collision_risk, inputs?.closest_approach_km]);

  return (
    <div className="relative w-full h-full bg-black/40 rounded-xl overflow-hidden shadow-inner">
      <Canvas camera={{ position: [0, 8, 16], fov: 45, near: 0.1, far: 2000 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.35} />
          <directionalLight position={[10, 10, 5]} intensity={1.2} />
          <pointLight position={[-8, 6, -10]} intensity={0.55} />
          <OrbitControls enablePan enableZoom enableRotate />

          <Earth />

          {mode === "collision" && (
            <CollisionDriver
              report={report}
              inputs={inputs}
              runId={runId}
              onFinished={() => setFinished(true)}
            />
          )}

          {mode === "avoidance" && (
            <AvoidanceDriver
              report={report}
              inputs={inputs}
              maneuver={maneuver}
              runId={runId}
              onFinished={() => setFinished(true)}
            />
          )}
        </Suspense>
      </Canvas>

      {finished && (
        <div className="absolute inset-x-0 bottom-4 flex justify-center">
          <button
            onClick={() => {
              setRunId((r) => r + 1);
              setFinished(false);
            }}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-semibold tracking-widest uppercase text-white transition backdrop-blur-sm"
          >
            Replay
          </button>
        </div>
      )}
    </div>
  );
}
