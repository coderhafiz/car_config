"use client";

import { Suspense, useEffect, useRef, useMemo, useState } from "react";
import { Canvas, useThree, useFrame, RootState } from "@react-three/fiber";
import {
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
  const superloopFrontRef = useRef<THREE.SpotLight>(null!);
  const planeLightGroupRef = useRef<THREE.Group>(null!);
  const planeLightRef = useRef<THREE.RectAreaLight>(null!);
  const planeDirectionalRef = useRef<THREE.DirectionalLight>(null!);
  const ambientLightRef = useRef<THREE.AmbientLight>(null!);
  const interiorFillRef = useRef<THREE.PointLight>(null!);

  const { gl } = useThree();

  useEffect(() => {
    if (planeLightGroupRef.current) {
      planeLightGroupRef.current.lookAt(0, 20, 0);
    }
    if (planeDirectionalRef.current) {
      planeDirectionalRef.current.target.position.set(0, 20, 0);
      planeDirectionalRef.current.target.updateMatrixWorld();
    }
  }, []);

  useEffect(() => {
    const renderer = gl as THREE.WebGLRenderer;
    renderer.toneMapping = THREE.AgXToneMapping;
    renderer.toneMappingExposure = 1.35;
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    return () => {
      gl.shadowMap.autoUpdate = true;
    };
  }, [gl]);

  useEffect(() => {
    if (superloopSpotRef.current) superloopSpotRef.current.intensity = 0;
    if (superloopCenterRef.current) superloopCenterRef.current.intensity = 0;
    if (superloopFrontRef.current) superloopFrontRef.current.intensity = 0;
    if (planeLightRef.current) planeLightRef.current.intensity = 0;
    if (planeDirectionalRef.current) planeDirectionalRef.current.intensity = 0;
    if (ambientLightRef.current) ambientLightRef.current.intensity = 0;
    if (interiorFillRef.current) interiorFillRef.current.intensity = 0;
    gl.shadowMap.needsUpdate = true;
  }, [config.selectedModel, gl]);

  useFrame((state, delta) => {
    const isInterior = config.viewMode === "interior";
    // Boost studio illumination in interior mode so the cockpit details,
    // dashboard instrumentation, and leather cabin textures are clearly and brightly visible
    const studioMultiplier = isInterior ? 1.85 : 1.0;
    const ambientMultiplier = isInterior ? 4.2 : 1.0;

    // Powerful downward illumination from Superloop Light 200 ring directly onto vehicle
    const targetSpot = config.lightIntensity * 7.5 * studioMultiplier;
    if (superloopSpotRef.current && Math.abs(superloopSpotRef.current.intensity - targetSpot) > 0.005) {
      easing.damp(superloopSpotRef.current, "intensity", targetSpot, 0.25, delta);
    }
    // Strong overhead studio flood emitted from inside the ring light
    const targetCenter = config.lightIntensity * 16.0 * studioMultiplier;
    if (superloopCenterRef.current && Math.abs(superloopCenterRef.current.intensity - targetCenter) > 0.005) {
      easing.damp(superloopCenterRef.current, "intensity", targetCenter, 0.25, delta);
    }
    // Front studio fill from the front ring light arc to illuminate the front hood, grille, and headlights
    const targetFront = config.lightIntensity * 6.5 * studioMultiplier;
    if (superloopFrontRef.current && Math.abs(superloopFrontRef.current.intensity - targetFront) > 0.005) {
      easing.damp(superloopFrontRef.current, "intensity", targetFront, 0.25, delta);
    }
    // Studio Plane Light replacing HDRI lighting from the same overhead key direction
    const targetPlaneLight = config.lightIntensity * 16.0 * studioMultiplier;
    if (planeLightRef.current && Math.abs(planeLightRef.current.intensity - targetPlaneLight) > 0.05) {
      easing.damp(planeLightRef.current, "intensity", targetPlaneLight, 0.25, delta);
    }
    const targetPlaneDir = config.lightIntensity * 2.2 * studioMultiplier;
    if (planeDirectionalRef.current && Math.abs(planeDirectionalRef.current.intensity - targetPlaneDir) > 0.01) {
      easing.damp(planeDirectionalRef.current, "intensity", targetPlaneDir, 0.25, delta);
    }

    // Ambient studio bounce so sculpt lines and shadows are distinct and never pitch black
    const targetAmbient = config.lightIntensity * 0.45 * ambientMultiplier;
    if (ambientLightRef.current && Math.abs(ambientLightRef.current.intensity - targetAmbient) > 0.005) {
      easing.damp(ambientLightRef.current, "intensity", targetAmbient, 0.25, delta);
    }
    if (interiorFillRef.current) {
      const targetFill = isInterior ? config.lightIntensity * 1.35 : 0;
      if (Math.abs(interiorFillRef.current.intensity - targetFill) > 0.005) {
        easing.damp(interiorFillRef.current, "intensity", targetFill, 0.25, delta);
      }
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

      const posDistSq = state.camera.position.distanceToSquared(targetPos.current);
      const focDistSq = controls.target.distanceToSquared(targetFoc.current);

      if (posDistSq < 0.0064 && focDistSq < 0.0064) {
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

      {/* Studio Plane Light (RectAreaLight): completely invisible light emitter with no visible geometry */}
      <group ref={planeLightGroupRef} position={[45, 120, 50]}>
        <rectAreaLight
          ref={planeLightRef}
          width={140}
          height={55}
          color="#ffffff"
          intensity={config.lightIntensity * 16.0}
        />
      </group>

      {/* Paired directional studio key light from the plane light direction */}
      <directionalLight
        ref={planeDirectionalRef}
        position={[45, 120, 50]}
        intensity={config.lightIntensity * 2.2}
        color="#fffbf7"
        castShadow={false}
      />

      <ambientLight
        ref={ambientLightRef}
        intensity={config.lightIntensity * 0.25}
      />

      {/* Key studio spotlight focused directly downward from Superloop Light 200 */}
      <spotLight
        ref={superloopSpotRef}
        position={[0, 130, 0]}
        angle={Math.PI / 2.6}
        penumbra={0.7}
        decay={0.2}
        distance={300}
        intensity={config.lightIntensity * 7.5}
        color="#fffaf2"
        castShadow
        shadow-mapSize={isMobile ? [1024, 1024] : [2048, 2048]}
        shadow-bias={-0.0004}
      />

      {/* Powerful overhead studio flood emitted from inside the ring light */}
      <pointLight
        ref={superloopCenterRef}
        position={[0, 126, 0]}
        distance={300}
        decay={0.25}
        intensity={config.lightIntensity * 16.0}
        color="#fffaf2"
      />

      {/* Front-angled studio fill from front ring arc to brightly light the hood, headlights & grille */}
      <spotLight
        ref={superloopFrontRef}
        position={[0, 126, 75]}
        angle={Math.PI / 2.8}
        penumbra={0.8}
        decay={0.25}
        distance={300}
        intensity={config.lightIntensity * 6.5}
        color="#fffaf2"
      />

      {/* Interior cabin fill light: illuminates steering wheel, dashboard & cabin leather */}
      <pointLight
        ref={interiorFillRef}
        position={[0, 52, 4]}
        color="#fffbf6"
        decay={1.0}
        distance={140}
        intensity={0}
        visible={config.viewMode === "interior"}
      />

      <Suspense fallback={<CanvasLoader hidden={isInitialLoading} />}>
        <Showroom lightIntensity={config.lightIntensity} mainColor={config.mainColor} />
        <Model
          config={config}
          onFirstPaint={onLoaded}
          carRotationRef={carRotationRef}
          isDraggingCarRef={isDraggingCarRef}
        />
      </Suspense>
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
  const [isMobileViewport] = useState(
    () =>
      typeof window !== "undefined" &&
      (window.innerWidth < 768 || navigator.maxTouchPoints > 1)
  );
  const [dpr, setDpr] = useState(() => (isMobileViewport ? 1.15 : 1.5));

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
          toneMapping: THREE.AgXToneMapping,
          toneMappingExposure: 1.25,
        }}
        dpr={dpr}
        className="w-full h-full"
      >
        <PreloadModels />
        <PreloadTextures />
        <PerformanceMonitor
          onDecline={() => setDpr(isMobileViewport ? 0.9 : 1.0)}
          onIncline={() => setDpr(isMobileViewport ? 1.2 : 1.5)}
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
