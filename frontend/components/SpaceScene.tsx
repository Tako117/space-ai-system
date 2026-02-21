"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Earth from "./Earth";
import Satellite from "./Satellite";
import DebrisModel from "./Debris";
import { connectSocket, publishState, RiskReport, TelemetryEnvelope } from "../lib/socket";

type Mode = "landing" | "problem" | "orbit" | "scenario" | "animation";

type Scenario = {
  debrisCount: number;
  debrisVelocity: number; // factor
  orbitAltitude: number; // scale
  satelliteType: "standard" | "heavy" | "agile";
  // NEW:
  debrisRadiusDelta?: number; // lets orbits intersect more easily
  phaseOffset?: number; // lets you force close approaches
};

type Props = {
  mode: Mode;
  showDebris?: boolean;
  showPaths?: boolean;
  scenario?: Scenario;
  onReport?: (r: RiskReport | null) => void;
  onStateIds?: (ids: { satellites: string[]; debris: string[] } | null) => void;

  // NEW: real IDs
  satelliteId?: string;
  debrisId?: string;
};

function vec3ToObj(v: THREE.Vector3) {
  return { x: v.x, y: v.y, z: v.z };
}

function makeArrow() {
  const dir = new THREE.Vector3(1, 0, 0);
  const origin = new THREE.Vector3(0, 0, 0);
  const length = 1;
  const hex = 0xffffff;
  return new THREE.ArrowHelper(dir, origin, length, hex, 0.25, 0.18);
}

function VelocityVectors({
  satPos,
  satVel,
  debPos,
  debVel,
  enabled,
}: {
  satPos: THREE.Vector3;
  satVel: THREE.Vector3;
  debPos: THREE.Vector3;
  debVel: THREE.Vector3;
  enabled: boolean;
}) {
  const { scene } = useThree();
  const satArrowRef = useRef<THREE.ArrowHelper | null>(null);
  const debArrowRef = useRef<THREE.ArrowHelper | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const satA = makeArrow();
    satA.setColor(new THREE.Color(0.45, 0.9, 1));
    const debA = makeArrow();
    debA.setColor(new THREE.Color(1, 0.25, 0.45));

    satArrowRef.current = satA;
    debArrowRef.current = debA;

    scene.add(satA);
    scene.add(debA);

    return () => {
      scene.remove(satA);
      scene.remove(debA);
      satArrowRef.current = null;
      debArrowRef.current = null;
    };
  }, [scene, enabled]);

  useFrame(() => {
    if (!enabled) return;
    const aS = satArrowRef.current;
    const aD = debArrowRef.current;
    if (!aS || !aD) return;

    {
      const dir = satVel.clone();
      const speed = dir.length();
      if (speed > 1e-6) dir.normalize();
      aS.position.copy(satPos);
      aS.setDirection(dir);
      aS.setLength(Math.min(2.6, 0.55 + speed * 3.2), 0.22, 0.14);
    }

    {
      const dir = debVel.clone();
      const speed = dir.length();
      if (speed > 1e-6) dir.normalize();
      aD.position.copy(debPos);
      aD.setDirection(dir);
      aD.setLength(Math.min(2.6, 0.55 + speed * 3.2), 0.22, 0.14);
    }
  });

  return null;
}

function ClosestApproachMarker({ position, enabled }: { position: THREE.Vector3; enabled: boolean }) {
  if (!enabled) return null;
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.18, 24, 24]} />
      <meshStandardMaterial emissive={new THREE.Color(1, 0.35, 0.55)} emissiveIntensity={2.2} />
    </mesh>
  );
}

function SceneInner({
  mode,
  showDebris,
  showPaths,
  scenario,
  onReport,
  onStateIds,
  satelliteId,
  debrisId,
}: Required<Pick<Props, "mode" | "showDebris" | "showPaths">> &
  Pick<Props, "scenario" | "onReport" | "onStateIds" | "satelliteId" | "debrisId">) {
  const [latestReport, setLatestReport] = useState<RiskReport | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const lastSendRef = useRef<number>(0);

  const unitToMeters = 100_000;

  const s = scenario ?? {
    debrisCount: 18,
    debrisVelocity: 1.0,
    orbitAltitude: 1.0,
    satelliteType: "standard" as const,
    debrisRadiusDelta: 0.0,
    phaseOffset: 0.0,
  };

  const satRot = useRef(new THREE.Euler(0, 0, 0));
  const debrisRot = useRef(new THREE.Euler(0, 0, 0));

  const simRef = useRef({
    t: 0,

    satRadius: 8.8 * s.orbitAltitude,
    satOmega: 0.12,
    satPhase: 0.2,
    satPos: new THREE.Vector3(),
    satVel: new THREE.Vector3(),

    debrisRadius: (9.6 + (s.debrisRadiusDelta ?? 0.0)) * s.orbitAltitude,
    debrisOmega: 0.135 * s.debrisVelocity,
    debrisPhase: 2.1 + (s.phaseOffset ?? 0.0),
    debrisPos: new THREE.Vector3(),
    debrisVel: new THREE.Vector3(),

    debrisPoints: [] as {
      id: string;
      p: THREE.Vector3;
      v: THREE.Vector3;
      phase: number;
      omega: number;
      r: number;
    }[],

    rocketPos: new THREE.Vector3(0, -12, 0),
    rocketRot: new THREE.Euler(0, 0, 0),

    released: false,
    impact: false,

    markerPos: new THREE.Vector3(0, 0, 0),
  });

  useEffect(() => {
    const sim = simRef.current;
    sim.satRadius = 8.8 * s.orbitAltitude;
    sim.debrisRadius = (9.6 + (s.debrisRadiusDelta ?? 0.0)) * s.orbitAltitude;
    sim.debrisOmega = 0.135 * s.debrisVelocity;
    sim.debrisPhase = 2.1 + (s.phaseOffset ?? 0.0);

    const count = Math.max(0, Math.min(64, s.debrisCount));
    const pts: any[] = [];

    // IMPORTANT: start from 2 to avoid DEB-1 collision with primary
    for (let i = 0; i < count; i++) {
      const phase = (i / Math.max(1, count)) * Math.PI * 2 + 0.6;
      const r = (9.1 + (i % 5) * 0.25) * s.orbitAltitude;
      const omega = (0.11 + (i % 7) * 0.004) * s.debrisVelocity;
      pts.push({
        id: `DEB-${i + 2}`,
        p: new THREE.Vector3(),
        v: new THREE.Vector3(),
        phase,
        omega,
        r,
      });
    }
    sim.debrisPoints = pts;
  }, [s.debrisCount, s.debrisVelocity, s.orbitAltitude, s.debrisRadiusDelta, s.phaseOffset]);

  const orbitGeom = useMemo(() => {
    const steps = 256;
    const satR = 8.8 * s.orbitAltitude;
    const debR = (9.6 + (s.debrisRadiusDelta ?? 0.0)) * s.orbitAltitude;

    const ptsSat: THREE.Vector3[] = [];
    const ptsDeb: THREE.Vector3[] = [];

    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      ptsSat.push(new THREE.Vector3(Math.cos(a) * satR, 0, Math.sin(a) * satR));
      ptsDeb.push(new THREE.Vector3(Math.cos(a) * debR, 0, Math.sin(a) * debR));
    }
    return {
      gSat: new THREE.BufferGeometry().setFromPoints(ptsSat),
      gDeb: new THREE.BufferGeometry().setFromPoints(ptsDeb),
    };
  }, [s.orbitAltitude, s.debrisRadiusDelta]);

  useEffect(() => {
    const ws = connectSocket((msg: TelemetryEnvelope) => {
      if (msg.type === "telemetry_report") {
        setLatestReport(msg.report);
        onReport?.(msg.report);
      } else if (msg.type === "telemetry_state") {
        const sats = msg.state.objects.filter((o) => o.kind === "satellite").map((o) => o.id);
        const debs = msg.state.objects.filter((o) => o.kind === "debris").map((o) => o.id);
        onStateIds?.({ satellites: sats, debris: debs });
      }
    });

    wsRef.current = ws;
    return () => {
      try {
        ws.close();
      } catch {}
      wsRef.current = null;
    };
  }, [onReport, onStateIds]);

  useFrame((state, delta) => {
    const sim = simRef.current;
    sim.t += delta;

    const satA = sim.satPhase + sim.t * sim.satOmega;
    sim.satPos.set(Math.cos(satA) * sim.satRadius, 0, Math.sin(satA) * sim.satRadius);
    sim.satVel.set(
      -Math.sin(satA) * sim.satRadius * sim.satOmega,
      0,
      Math.cos(satA) * sim.satRadius * sim.satOmega
    );

    const debA0 = sim.debrisPhase + sim.t * sim.debrisOmega;
    sim.debrisPos.set(Math.cos(debA0) * sim.debrisRadius, 0, Math.sin(debA0) * sim.debrisRadius);
    sim.debrisVel.set(
      -Math.sin(debA0) * sim.debrisRadius * sim.debrisOmega,
      0,
      Math.cos(debA0) * sim.debrisRadius * sim.debrisOmega
    );

    for (const d of sim.debrisPoints) {
      const a = d.phase + sim.t * d.omega;
      d.p.set(Math.cos(a) * d.r, 0, Math.sin(a) * d.r);
      d.v.set(-Math.sin(a) * d.r * d.omega, 0, Math.cos(a) * d.r * d.omega);
    }

    // rotations
    satRot.current.y += 0.005;
    debrisRot.current.z += 0.01;

    // closest approach marker (from backend report if exists)
    if (latestReport && Number.isFinite(latestReport.time_to_closest_s)) {
      const tca = Math.max(0, Math.min(600, latestReport.time_to_closest_s));
      const satPosM = sim.satPos.clone().multiplyScalar(unitToMeters);
      const debPosM = sim.debrisPos.clone().multiplyScalar(unitToMeters);
      const satVelMps = sim.satVel.clone().multiplyScalar(unitToMeters);
      const debVelMps = sim.debrisVel.clone().multiplyScalar(unitToMeters);

      const satAt = satPosM.addScaledVector(satVelMps, tca);
      const debAt = debPosM.addScaledVector(debVelMps, tca);
      const mid = satAt.add(debAt).multiplyScalar(0.5);
      sim.markerPos.copy(mid.multiplyScalar(1 / unitToMeters));
    } else {
      sim.markerPos.copy(sim.satPos.clone().add(sim.debrisPos).multiplyScalar(0.5));
    }

    // publish state ONLY orbit/scenario
    const shouldPublish = mode === "orbit" || mode === "scenario";
    const now = state.clock.elapsedTime;

    if (shouldPublish && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      if (now - lastSendRef.current > 0.1) {
        lastSendRef.current = now;

        const objects: any[] = [];

        const satPosM = sim.satPos.clone().multiplyScalar(unitToMeters);
        const satVelMps = sim.satVel.clone().multiplyScalar(unitToMeters);

        objects.push({
          id: satelliteId || "SAT-1",
          kind: "satellite",
          position_m: vec3ToObj(satPosM),
          velocity_mps: vec3ToObj(satVelMps),
        });

        objects.push({
          id: debrisId || "DEB-1",
          kind: "debris",
          position_m: vec3ToObj(sim.debrisPos.clone().multiplyScalar(unitToMeters)),
          velocity_mps: vec3ToObj(sim.debrisVel.clone().multiplyScalar(unitToMeters)),
        });

        if (showDebris) {
          const extra = sim.debrisPoints.slice(0, Math.min(10, sim.debrisPoints.length));
          for (const d of extra) {
            objects.push({
              id: d.id,
              kind: "debris",
              position_m: vec3ToObj(d.p.clone().multiplyScalar(unitToMeters)),
              velocity_mps: vec3ToObj(d.v.clone().multiplyScalar(unitToMeters)),
            });
          }
        }

        publishState(wsRef.current, { timestamp: Date.now(), objects });
      }
    }
  });

  return (
    <>
      <Environment
        files={[
          "/assets/skybox/px.png",
          "/assets/skybox/nx.png",
          "/assets/skybox/py.png",
          "/assets/skybox/ny.png",
          "/assets/skybox/pz.png",
          "/assets/skybox/nz.png",
        ]}
        background
      />

      <ambientLight intensity={0.18} />
      <directionalLight position={[12, 10, 6]} intensity={1.6} />
      <pointLight position={[-10, 6, -12]} intensity={0.6} />

      <OrbitControls enablePan enableRotate enableZoom />

      <Earth />

      {showPaths && (mode === "orbit" || mode === "scenario") && (
        <group>
          {/* Use lineLoop (Three.js) to avoid SVG <line> typing conflict in TS */}
          <lineLoop geometry={orbitGeom.gSat}>
            <lineBasicMaterial color={new THREE.Color(0.45, 0.9, 1)} transparent opacity={0.22} />
          </lineLoop>
          <lineLoop geometry={orbitGeom.gDeb}>
            <lineBasicMaterial color={new THREE.Color(1, 0.25, 0.45)} transparent opacity={0.18} />
          </lineLoop>
        </group>
      )}

      <Satellite position={simRef.current.satPos} rotation={satRot.current} damaged={false} />

      {(showDebris || mode === "animation") && (
        <DebrisModel position={simRef.current.debrisPos} rotation={debrisRot.current} />
      )}

      {showDebris && (mode === "orbit" || mode === "scenario") && (
        <>
          {simRef.current.debrisPoints
            .slice(0, Math.min(18, simRef.current.debrisPoints.length))
            .map((d) => (
              <DebrisModel key={d.id} position={d.p} rotation={debrisRot.current} desiredSize={0.45} />
            ))}
        </>
      )}

      {(mode === "orbit" || mode === "scenario") && (
        <>
          <VelocityVectors
            enabled={true}
            satPos={simRef.current.satPos}
            satVel={simRef.current.satVel}
            debPos={simRef.current.debrisPos}
            debVel={simRef.current.debrisVel}
          />
          <ClosestApproachMarker enabled={true} position={simRef.current.markerPos} />
        </>
      )}
    </>
  );
}

export default function SpaceScene({
  mode,
  showDebris = true,
  showPaths = true,
  scenario,
  onReport,
  onStateIds,
  satelliteId,
  debrisId,
}: Props) {
  return (
    <Canvas
      camera={{ position: [0, 8, 22], fov: 50, near: 0.1, far: 3000 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <Suspense fallback={null}>
        <SceneInner
          mode={mode}
          showDebris={showDebris}
          showPaths={showPaths}
          scenario={scenario}
          onReport={onReport}
          onStateIds={onStateIds}
          satelliteId={satelliteId}
          debrisId={debrisId}
        />
      </Suspense>
    </Canvas>
  );
}