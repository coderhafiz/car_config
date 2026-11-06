"use client";

import { Suspense, useEffect, useRef, useMemo, useState } from "react";
import { Canvas, useThree, useFrame, RootState } from "@react-three/fiber";
import {
  Environment,
  ContactShadows,
  PerspectiveCamera,
  PerformanceMonitor,
  OrbitControls,
  Html,
} from "@react-three/drei";
import * as THREE from "three";
import { easing } from "maath";

import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { motion } from "framer-motion";
import {
  Model,
  Showroom,
  ConfigState,
  PreloadModels,
  PreloadTextures,
  MODELS,
} from "./Model";

if (typeof window !== "undefined") {
  RectAreaLightUniformsLib.init();

  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (args[0] && typeof args[0] === "string") {
      if (args[0].includes("THREE.Clock")) return;
      if (args[0].includes("THREE.KTX2Loader")) return;
    }
    originalWarn(...args);
  };
}

interface ConfiguratorCanvasProps {
  onLoaded: () => void;
  config: ConfigState;
  isInitialLoading?: boolean;
  isCollapsed: boolean;
}

function CanvasLoader({ hidden }: { hidden?: boolean }) {
  if (hidden) return null;
  return (
    <Html center style={{ zIndex: 0 }}>
      <div className="flex flex-col items-center justify-center min-w-50 pointer-events-none select-none">
        <div className="relative w-16 h-16">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-4 border-brand-primary/20 border-t-brand-primary rounded-full"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-2 border-4 border-brand-secondary/20 border-t-brand-secondary rounded-full"
          />
        </div>
        <p className="mt-4 text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] whitespace-nowrap">
          Loading Vehicle
        </p>
      </div>
    </Html>
  );
}

function SceneContent({
  config,
  onLoaded,
  isInitialLoading,
  isCollapsed,
  carRotationRef,
  isDraggingCarRef,
}: {
  config: ConfigState;
  onLoaded: () => void;
  isInitialLoading: boolean;
  isCollapsed: boolean;
  carRotationRef: React.MutableRefObject<number>;
  isDraggingCarRef: React.MutableRefObject<boolean>;
}) {
  const { size } = useThree();
  const isMobile = size.width < 640;
  const isLandscape = size.width > size.height;

  const modelInfo =
    MODELS.find((m) => m.id === config.selectedModel) || MODELS[0];

  // Camera preset based on view mode
  const activeCamera =
    config.viewMode === "interior"
      ? modelInfo.interiorCamera
      : modelInfo.exteriorCamera;

  const { xTarget, yTarget } = useMemo(() => {
    let y = 35;
    let x = 0;

    if (config.viewMode === "interior") {
      // Interior view: look at dashboard level
      x = 0;
      y = 55;
    } else if (isLandscape && size.height < 700) {
      x = -150;
      y = 35;
    } else if (isMobile) {
      x = 0;
      y = 32;
    } else {
      x = 0;
      y = 35;
    }
    return { xTarget: x, yTarget: y };
  }, [isMobile, isLandscape, size.height, config.viewMode]);

  const targetPos = useRef(new THREE.Vector3(...activeCamera.position));
  const targetFoc = useRef(new THREE.Vector3(xTarget, yTarget, 0));
  const targetLookDir = useRef(new THREE.Vector3(0, 0, 1));
  const panOffsetYRef = useRef(0);
  const isUserInteracting = useRef(false);
  const isAutoFraming = useRef(true);
  const prevViewKey = useRef("");

  // Re-enable auto-framing on model/view/layout changes (and exterior zoom changes)
  useEffect(() => {
    if (config.viewMode === "exterior") {
      isAutoFraming.current = true;
    }
  }, [config.zoom, config.viewMode]);

  useEffect(() => {
    isAutoFraming.current = true;
  }, [
    isMobile,
    isLandscape,
    size.height,
    config.selectedModel,
    config.viewMode,
  ]);

  // Update camera targets for both exterior and interior views
  useEffect(() => {
    const viewKey = `${config.selectedModel}-${config.viewMode}-${isMobile}-${isLandscape}-${size.height < 700}`;
    const viewChanged = prevViewKey.current !== viewKey;
    prevViewKey.current = viewKey;

    if (config.viewMode === "interior") {
      if (viewChanged) {
        const basePos = new THREE.Vector3(...activeCamera.position);
        const baseFoc = new THREE.Vector3(...activeCamera.target);
        const lookDir = baseFoc.clone().sub(basePos).normalize();

        const isPortrait = isMobile && !isLandscape;
        const mobileBackOffset = isPortrait ? 4 : 0;
        targetPos.current
          .copy(basePos)
          .addScaledVector(lookDir, -mobileBackOffset);
        targetLookDir.current.copy(lookDir);
        // Look directly at the dashboard/steering wheel target during transition
        targetFoc.current.copy(baseFoc);
        isAutoFraming.current = true;
      }
    } else {
      // Scale camera outward based on zoom slider (700 default = ~comfortable exterior distance)
      // On mobile portrait, pull back further so the entire car body fits horizontally.
      const mobileFit = isMobile && !isLandscape ? 1.48 : 1;
      const zoomFactor = ((1100 - config.zoom) / 400) * mobileFit; // 0.25 (close) → 2.5 (far)
      const basePos = new THREE.Vector3(...activeCamera.position);
      const baseFoc = new THREE.Vector3(xTarget, yTarget, 0);
      const baseDist = basePos.distanceTo(baseFoc);

      if (viewChanged) {
        targetFoc.current.copy(baseFoc);
        targetPos.current.set(
          basePos.x * zoomFactor,
          Math.min(110, basePos.y * zoomFactor),
          basePos.z * zoomFactor,
        );
      } else {
        const dir = targetPos.current.clone().sub(targetFoc.current);
        if (dir.lengthSq() > 0.0001) {
          dir.normalize();
          targetPos.current
            .copy(targetFoc.current)
            .addScaledVector(dir, baseDist * zoomFactor);
          targetPos.current.y = Math.min(115, targetPos.current.y);
        } else {
          targetPos.current.set(
            basePos.x * zoomFactor,
            Math.min(110, basePos.y * zoomFactor),
            basePos.z * zoomFactor,
          );
        }
      }
    }
  }, [
    config.zoom,
    config.viewMode,
    config.selectedModel,
    isMobile,
    isLandscape,
    size.height,
    xTarget,
    yTarget,
    activeCamera,
  ]);

  const superloopSpotRef = useRef<THREE.SpotLight>(null!);
  const superloopCenterRef = useRef<THREE.PointLight>(null!);
  const ringLight0Ref = useRef<THREE.PointLight>(null!);
  const ringLight1Ref = useRef<THREE.PointLight>(null!);
  const ringLight2Ref = useRef<THREE.PointLight>(null!);
  const ringLight3Ref = useRef<THREE.PointLight>(null!);
  const ambientLightRef = useRef<THREE.AmbientLight>(null!);
  const interiorFillRef = useRef<THREE.PointLight>(null!);

  useEffect(() => {
    if (superloopSpotRef.current) superloopSpotRef.current.intensity = 0;
    if (superloopCenterRef.current) superloopCenterRef.current.intensity = 0;
    if (ringLight0Ref.current) ringLight0Ref.current.intensity = 0;
    if (ringLight1Ref.current) ringLight1Ref.current.intensity = 0;
    if (ringLight2Ref.current) ringLight2Ref.current.intensity = 0;
    if (ringLight3Ref.current) ringLight3Ref.current.intensity = 0;
    if (ambientLightRef.current) ambientLightRef.current.intensity = 0;
    if (interiorFillRef.current) interiorFillRef.current.intensity = 0;
  }, [config.selectedModel]);

  useFrame((state, delta) => {
    const isInterior = config.viewMode === "interior";
    // Boost studio illumination in interior mode so the cockpit details,
    // dashboard instrumentation, and leather cabin textures are clearly and brightly visible
    const studioMultiplier = isInterior ? 1.85 : 1.0;
    const ambientMultiplier = isInterior ? 4.2 : 1.0;

    // Smooth light fade-in & Studio Light control for Superloop Light 200
    if (superloopSpotRef.current)
      easing.damp(
        superloopSpotRef.current,
        "intensity",
        config.lightIntensity * 1.1 * studioMultiplier,
        0.25,
        delta,
      );
    if (superloopCenterRef.current)
      easing.damp(
        superloopCenterRef.current,
        "intensity",
        config.lightIntensity * 1.4 * studioMultiplier,
        0.25,
        delta,
      );
    const ringIntensity = config.lightIntensity * 0.55 * studioMultiplier;
    if (ringLight0Ref.current)
      easing.damp(ringLight0Ref.current, "intensity", ringIntensity, 0.25, delta);
    if (ringLight1Ref.current)
      easing.damp(ringLight1Ref.current, "intensity", ringIntensity, 0.25, delta);
    if (ringLight2Ref.current)
      easing.damp(ringLight2Ref.current, "intensity", ringIntensity, 0.25, delta);
    if (ringLight3Ref.current)
      easing.damp(ringLight3Ref.current, "intensity", ringIntensity, 0.25, delta);
    if (ambientLightRef.current)
      easing.damp(
        ambientLightRef.current,
        "intensity",
        config.lightIntensity * 0.25 * ambientMultiplier,
        0.25,
        delta,
      );
    if (interiorFillRef.current) {
      const targetFill = isInterior ? config.lightIntensity * 2.2 : 0;
      easing.damp(interiorFillRef.current, "intensity", targetFill, 0.25, delta);
      interiorFillRef.current.visible = isInterior || interiorFillRef.current.intensity > 0.05;
    }

    // Smoothly adjust camera FOV for interior zoom and pan the scene on mobile
    // so the car sits centered in the uncovered screen area above the opened config panel.
    if (state.camera instanceof THREE.PerspectiveCamera) {
      const isPortrait = isMobile && !isLandscape;
      const targetFov =
        config.viewMode === "interior"
          ? isPortrait
            ? config.zoom >= 700
              ? 75 - ((config.zoom - 700) / 300) * 23 // 700 → 75°, 1000 → 52°
              : 75 + ((700 - config.zoom) / 600) * 23 // 700 → 75°, 100 → 98°
            : config.zoom >= 700
              ? 45 - ((config.zoom - 700) / 300) * 27
              : 45 + ((700 - config.zoom) / 600) * 30
          : isPortrait
            ? 54
            : 45;
      if (Math.abs(state.camera.fov - targetFov) > 0.05) {
        easing.damp(state.camera, "fov", targetFov, 0.25, delta);
        state.camera.updateProjectionMatrix();
      }

      const targetPanY =
        isPortrait
          ? isCollapsed
            ? size.height * 0.03
            : config.viewMode === "interior"
              ? size.height * 0.16
              : size.height * 0.25
          : 0;
      if (Math.abs(panOffsetYRef.current - targetPanY) > 0.2) {
        easing.damp(panOffsetYRef, "current", targetPanY, 0.22, delta);
        if (Math.abs(panOffsetYRef.current) > 0.5) {
          state.camera.setViewOffset(
            size.width,
            size.height,
            0,
            panOffsetYRef.current,
            size.width,
            size.height,
          );
        } else {
          state.camera.clearViewOffset();
        }
      }
    }

    const controls = (
      state as RootState & {
        controls?: { target: THREE.Vector3; update: () => void };
      }
    ).controls;

    if (isUserInteracting.current) {
      if (config.viewMode === "exterior") {
        // Keep target refs synced with manual OrbitControls rotation/panning in exterior mode
        targetPos.current.copy(state.camera.position);
        if (controls) {
          targetFoc.current.copy(controls.target);
        }
      }
      return;
    }

    if (!isAutoFraming.current) return;

    easing.damp3(state.camera.position, targetPos.current, 0.35, delta);

    if (controls) {
      easing.damp3(controls.target, targetFoc.current, 0.35, delta);
      controls.update();

      const posDist = state.camera.position.distanceTo(targetPos.current);
      const focDist = controls.target.distanceTo(targetFoc.current);

      if (posDist < 0.08 && focDist < 0.08) {
        state.camera.position.copy(targetPos.current);
        controls.target.copy(targetFoc.current);

        if (config.viewMode === "interior") {
          // Once arrived in the driver's seat, set the orbit pivot 0.01 units ahead
          // along the line of sight for 360° first-person look-around
          controls.target
            .copy(targetPos.current)
            .addScaledVector(targetLookDir.current, 0.01);
        }

        controls.update();
        isAutoFraming.current = false;
      }
    }
  });

  return (
    <>
      <OrbitControls
        makeDefault
        enableDamping={true}
        dampingFactor={config.viewMode === "interior" ? 0.05 : 0.08}
        rotateSpeed={config.viewMode === "interior" ? 0.4 : 0.8}
        minPolarAngle={config.viewMode === "interior" ? 0.05 : 0}
        maxPolarAngle={
          config.viewMode === "exterior" ? Math.PI / 2 - 0.02 : Math.PI - 0.05
        }
        enablePan={false}
        enableZoom={false}
        enableRotate={config.viewMode === "interior"}
        onStart={() => {
          isUserInteracting.current = true;
          isAutoFraming.current = false;
        }}
        onEnd={() => {
          isUserInteracting.current = false;
        }}
        touches={
          config.viewMode === "interior"
            ? {
                ONE: THREE.TOUCH.ROTATE,
                TWO: THREE.TOUCH.ROTATE,
              }
            : undefined
        }
        mouseButtons={
          config.viewMode === "interior"
            ? {
                LEFT: THREE.MOUSE.ROTATE,
              }
            : {}
        }
      />

      <Environment
        files="/hdri/brown_photostudio_01_1k.exr"
        blur={1}
        background={false}
        environmentIntensity={0.45 * config.lightIntensity}
      />

      <ambientLight
        ref={ambientLightRef}
        intensity={config.lightIntensity * 0.25}
      />

      {/* Scene lights emitted directly from the Superloop Light 200 ring (y = 130, radius = 79.2) */}
      <spotLight
        ref={superloopSpotRef}
        position={[0, 130, 0]}
        angle={Math.PI / 1.75}
        penumbra={1}
        decay={0}
        intensity={config.lightIntensity * 1.1}
        color="#fffaf2"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
      />

      <pointLight
        ref={superloopCenterRef}
        position={[0, 128, 0]}
        intensity={config.lightIntensity * 1.4}
        color="#fffaf2"
        decay={0.35}
      />

      <pointLight
        ref={ringLight0Ref}
        position={[79.2, 128, 0]}
        intensity={config.lightIntensity * 0.55}
        color="#fff8ee"
        decay={0.35}
      />
      <pointLight
        ref={ringLight1Ref}
        position={[-79.2, 128, 0]}
        intensity={config.lightIntensity * 0.55}
        color="#fff8ee"
        decay={0.35}
      />
      <pointLight
        ref={ringLight2Ref}
        position={[0, 128, 79.2]}
        intensity={config.lightIntensity * 0.55}
        color="#fff8ee"
        decay={0.35}
      />
      <pointLight
        ref={ringLight3Ref}
        position={[0, 128, -79.2]}
        intensity={config.lightIntensity * 0.55}
        color="#fff8ee"
        decay={0.35}
      />

      {/* Interior cabin fill light: illuminates steering wheel, dashboard & cabin leather */}
      <pointLight
        ref={interiorFillRef}
        position={[0, 52, 4]}
        color="#fffbf6"
        decay={0.2}
        distance={140}
        intensity={0}
        visible={config.viewMode === "interior"}
      />

      <Suspense fallback={<CanvasLoader hidden={isInitialLoading} />}>
        <Showroom lightIntensity={config.lightIntensity} />
        <Model
          config={config}
          onFirstPaint={onLoaded}
          carRotationRef={carRotationRef}
          isDraggingCarRef={isDraggingCarRef}
        />
      </Suspense>

      {/* Ground contact shadow positioned flush with the showroom floor beneath the tires */}
      <ContactShadows
        position={[0, 0.04, 0]}
        opacity={0.92}
        scale={360}
        blur={1.6}
        far={65}
        resolution={1024}
        color="#000000"
      />
    </>
  );
}

export default function ConfiguratorCanvas({
  onLoaded,
  config,
  isInitialLoading = false,
  isCollapsed,
}: ConfiguratorCanvasProps) {
  const carRotationRef = useRef(config.rotationY);
  const isDraggingCarRef = useRef(false);
  const lastPointerXRef = useRef(0);
  const [dpr, setDpr] = useState(1.5);

  const canDragRotateCar = config.viewMode === "exterior";

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !canDragRotateCar) return;
    isDraggingCarRef.current = true;
    lastPointerXRef.current = e.clientX;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingCarRef.current || !canDragRotateCar) return;
    const deltaX = e.clientX - lastPointerXRef.current;
    lastPointerXRef.current = e.clientX;
    carRotationRef.current += deltaX * 0.007;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingCarRef.current) {
      isDraggingCarRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  return (
    <div
      className={`relative w-full h-full touch-none select-none ${
        canDragRotateCar ? "cursor-grab active:cursor-grabbing" : ""
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
        }}
        dpr={dpr}
        className="w-full h-full"
      >
        <PreloadModels />
        <PreloadTextures />
        <PerformanceMonitor
          onDecline={() => setDpr(1)}
          onIncline={() => setDpr(1.5)}
        />

        <Suspense fallback={null}>
          <PerspectiveCamera
            makeDefault
            position={[250, 250, 250]}
            fov={45}
            far={10000}
          />

          <SceneContent
            config={config}
            onLoaded={onLoaded}
            isInitialLoading={isInitialLoading}
            isCollapsed={isCollapsed}
            carRotationRef={carRotationRef}
            isDraggingCarRef={isDraggingCarRef}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
