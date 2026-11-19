"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import {
  Camera,
  X,
  RotateCcw,
  Trash2,
  Upload,
  Sparkles,
  Check,
  Sliders,
  Maximize2,
  RotateCw,
  Layers,
  Download,
  Smartphone,
  Crosshair,
} from "lucide-react";
import { DEFAULT_STICKERS } from "./Model";
import { trackStudioEvent } from "@/lib/telemetry";

// ─── WebXR Type Extensions for TypeScript ─────────────────────────────────────
interface XRHitTestSource {
  cancel(): void;
}

interface XRTransientInputHitTestSource {
  cancel(): void;
}

interface XRHitTestResult {
  getPose(baseSpace: EventTarget): XRPose | null;
}

interface XRTransientInputHitTestResult {
  readonly inputSource: unknown;
  readonly results: readonly XRHitTestResult[];
}

interface XRPose {
  readonly transform: {
    readonly position: DOMPointReadOnly;
    readonly orientation: DOMPointReadOnly;
    readonly matrix: Float32Array;
  };
}

interface XRCPUDepthInformation {
  readonly width: number;
  readonly height: number;
  readonly normDepthBufferFromNormView: {
    readonly matrix: Float32Array;
  };
  getDepthInMeters(x: number, y: number): number;
}

interface XRFrameExtended {
  readonly session: XRSessionExtended;
  getViewerPose(referenceSpace: EventTarget): {
    readonly views: readonly unknown[];
    readonly transform: XRPose["transform"];
  } | null;
  getHitTestResults(hitTestSource: XRHitTestSource): readonly XRHitTestResult[];
  getHitTestResultsForTransientInput(
    hitTestSource: XRTransientInputHitTestSource
  ): readonly XRTransientInputHitTestResult[];
  getDepthInformation?: (view: unknown) => XRCPUDepthInformation | null;
}

interface XRSessionExtended extends EventTarget {
  requestReferenceSpace(type: string): Promise<EventTarget>;
  requestHitTestSource?: (options: {
    space: EventTarget;
    offsetRay?: unknown;
  }) => Promise<XRHitTestSource>;
  requestHitTestSourceForTransientInput?: (options: {
    profile: string;
  }) => Promise<XRTransientInputHitTestSource>;
  end(): Promise<void>;
}

interface SurfaceSample {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  timestamp: number;
}

export interface StickerItem {
  id: string;
  name: string;
  url: string;
}

interface PlacedARSticker {
  id: string;
  mesh: THREE.Mesh;
  name: string;
  textureUrl: string;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  normal: THREE.Vector3;
  size: number;
  rotationDeg: number;
  curvatureX: number;
  curvatureY: number;
}

interface ARStickerStudioProps {
  isOpen: boolean;
  onClose: () => void;
  initialStickerUrl?: string;
}

/**
 * Generates a high-subdivision 3D surface-conforming decal mesh that bends
 * to match the real car body's local surface curvature sampled via WebXR hit-test
 * point cloud & depth estimation.
 */
function createConformingStickerGeometry(
  width: number,
  height: number,
  centerPos: THREE.Vector3,
  centerQuat: THREE.Quaternion,
  centerNormal: THREE.Vector3,
  surfaceSamples: SurfaceSample[],
  manualCurvatureX: number,
  manualCurvatureY: number,
  depthCurvatureEstimate: { cx: number; cy: number }
): THREE.BufferGeometry {
  const segsX = 20;
  const segsY = 20;
  const geom = new THREE.PlaneGeometry(width, height, segsX, segsY);
  const posAttr = geom.attributes.position as THREE.BufferAttribute;

  const invQuat = centerQuat.clone().invert();
  const localVertex = new THREE.Vector3();
  const worldVertex = new THREE.Vector3();

  // Compute local surface curvature from nearby WebXR hit-test samples on the car body
  let estimatedCurveX = depthCurvatureEstimate.cx;
  let estimatedCurveY = depthCurvatureEstimate.cy;

  if (surfaceSamples.length >= 4) {
    let sumWeightedDzX = 0;
    let sumWeightX = 0;
    let sumWeightedDzY = 0;
    let sumWeightY = 0;

    for (const sample of surfaceSamples) {
      const delta = sample.position.clone().sub(centerPos);
      const dist = delta.length();
      if (dist < 0.02 || dist > 0.65) continue;

      // Transform delta into the sticker's local tangent frame
      delta.applyQuaternion(invQuat);

      const r2x = delta.x * delta.x;
      const r2y = delta.y * delta.y;
      const weight = 1 / (dist + 0.05);

      if (r2x > 0.0008) {
        // Quadratic surface fit: z = 0.5 * kx * x^2
        const kx = (2 * delta.z) / Math.max(r2x, 0.005);
        sumWeightedDzX += THREE.MathUtils.clamp(kx, -3.5, 3.5) * weight;
        sumWeightX += weight;
      }
      if (r2y > 0.0008) {
        const ky = (2 * delta.z) / Math.max(r2y, 0.005);
        sumWeightedDzY += THREE.MathUtils.clamp(ky, -3.5, 3.5) * weight;
        sumWeightY += weight;
      }
    }

    if (sumWeightX > 0) {
      estimatedCurveX = sumWeightedDzX / sumWeightX;
    }
    if (sumWeightY > 0) {
      estimatedCurveY = sumWeightedDzY / sumWeightY;
    }
  }

  // Combine auto-detected car panel curvature with user contour fine-tuning
  const totalCurvatureX = estimatedCurveX + manualCurvatureX;
  const totalCurvatureY = estimatedCurveY + manualCurvatureY;

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);

    // Normalize coordinates (-1 to 1) across sticker half-extents
    const nx = x / Math.max(width * 0.5, 0.001);
    const ny = y / Math.max(height * 0.5, 0.001);

    // Smoothly wrap vertex Z along the car panel's quadratic/cylindrical contour
    // + a subtle 2mm outward offset to prevent z-fighting with the physical surface occlusion
    let zWrap =
      -0.5 * (totalCurvatureX * (nx * nx) * (width * 0.35) +
      totalCurvatureY * (ny * ny) * (height * 0.35));

    // Also blend towards nearby real-world hit-test samples (RBF surface conform)
    if (surfaceSamples.length > 0) {
      localVertex.set(x, y, 0);
      worldVertex.copy(localVertex).applyQuaternion(centerQuat).add(centerPos);

      let rbfOffset = 0;
      let rbfWeightSum = 0;
      for (const s of surfaceSamples) {
        const d = worldVertex.distanceTo(s.position);
        if (d < 0.35) {
          const w = Math.exp(-(d * d) / 0.018);
          const heightDiff = s.position
            .clone()
            .sub(worldVertex)
            .dot(centerNormal);
          rbfOffset += heightDiff * w;
          rbfWeightSum += w;
        }
      }
      if (rbfWeightSum > 0.1) {
        zWrap += THREE.MathUtils.clamp(rbfOffset / rbfWeightSum, -0.06, 0.06) * 0.5;
      }
    }

    posAttr.setZ(i, zWrap + 0.002);
  }

  posAttr.needsUpdate = true;
  geom.computeVertexNormals();
  return geom;
}

export default function ARStickerStudio({
  isOpen,
  onClose,
  initialStickerUrl,
}: ARStickerStudioProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Stickers gallery (default + user uploaded)
  const [stickersGallery, setStickersGallery] = useState<StickerItem[]>(() => {
    if (typeof window === "undefined") return DEFAULT_STICKERS;
    try {
      const saved = localStorage.getItem("customly_custom_stickers_gallery");
      const custom: StickerItem[] = saved ? JSON.parse(saved) : [];
      return [...DEFAULT_STICKERS, ...custom];
    } catch {
      return DEFAULT_STICKERS;
    }
  });

  const [selectedSticker, setSelectedSticker] = useState<StickerItem>(() => {
    if (initialStickerUrl) {
      const found = DEFAULT_STICKERS.find((s) => s.url === initialStickerUrl);
      if (found) return found;
    }
    return DEFAULT_STICKERS[0];
  });

  // Sticker placement parameters
  const [stickerSizeCm, setStickerSizeCm] = useState<number>(32); // 32cm physical width
  const [stickerRotationDeg, setStickerRotationDeg] = useState<number>(0);
  const [contourWrap, setContourWrap] = useState<number>(0.45); // Car body panel curvature wrap
  const [panelPreset, setPanelPreset] = useState<
    "auto" | "door" | "hood" | "fender"
  >("auto");
  const [placedCount, setPlacedCount] = useState<number>(0);
  const [arMode, setArMode] = useState<"checking" | "webxr" | "camera-ar">(
    "checking"
  );
  const [statusMessage, setStatusMessage] = useState<string>(
    "Point camera at a car body panel and move slowly to scan curvature..."
  );
  const [showControlsDrawer, setShowControlsDrawer] = useState<boolean>(false);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const surfaceLockedRef = useRef<boolean>(false);

  // Three.js & WebXR Mutable Refs
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const reticleGroupRef = useRef<THREE.Group | null>(null);
  const previewMeshRef = useRef<THREE.Mesh | null>(null);
  const placedStickersRef = useRef<PlacedARSticker[]>([]);
  const surfaceSamplesRef = useRef<SurfaceSample[]>([]);
  const textureCacheRef = useRef<Map<string, THREE.Texture>>(new Map());
  const xrSessionRef = useRef<XRSessionExtended | null>(null);
  const lastHitPoseRef = useRef<{
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
    normal: THREE.Vector3;
    depthCurvature: { cx: number; cy: number };
  } | null>(null);

  // Keep reactive state accessible inside WebXR animation loop
  const latestParamsRef = useRef({
    selectedSticker,
    stickerSizeCm,
    stickerRotationDeg,
    contourWrap,
    panelPreset,
  });

  useEffect(() => {
    latestParamsRef.current = {
      selectedSticker,
      stickerSizeCm,
      stickerRotationDeg,
      contourWrap,
      panelPreset,
    };
  }, [
    selectedSticker,
    stickerSizeCm,
    stickerRotationDeg,
    contourWrap,
    panelPreset,
  ]);

  // Load texture helper
  const loadStickerTexture = useCallback((url: string): Promise<THREE.Texture> => {
    const cached = textureCacheRef.current.get(url);
    if (cached) return Promise.resolve(cached);

    return new Promise((resolve) => {
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin("anonymous");
      loader.load(
        url,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 8;
          tex.needsUpdate = true;
          textureCacheRef.current.set(url, tex);
          resolve(tex);
        },
        undefined,
        () => {
          // Fallback canvas texture if SVG fails
          const canvas = document.createElement("canvas");
          canvas.width = 256;
          canvas.height = 256;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#026dfe";
            ctx.beginPath();
            ctx.arc(128, 128, 110, 0, Math.PI * 2);
            ctx.fill();
          }
          const fallback = new THREE.CanvasTexture(canvas);
          resolve(fallback);
        }
      );
    });
  }, []);

  // Update preview mesh texture when selectedSticker changes
  useEffect(() => {
    if (!isOpen) return;
    loadStickerTexture(selectedSticker.url).then((tex) => {
      if (previewMeshRef.current) {
        const mat = previewMeshRef.current.material as THREE.MeshPhysicalMaterial;
        mat.map = tex;
        mat.needsUpdate = true;
      }
    });
  }, [isOpen, selectedSticker, loadStickerTexture]);

  // Compute curvature X/Y based on selected preset + contour slider
  const getCurvatureFactors = useCallback(() => {
    const { contourWrap: wrap, panelPreset: preset } = latestParamsRef.current;
    switch (preset) {
      case "door":
        // Car doors curve primarily vertically (top-to-bottom) with slight horizontal sweep
        return { cx: wrap * 0.25, cy: wrap * 1.15 };
      case "hood":
        // Hood slopes gently along both axes
        return { cx: wrap * 0.65, cy: wrap * 0.45 };
      case "fender":
        // Fender arches have compound double curvature
        return { cx: wrap * 1.25, cy: wrap * 1.1 };
      case "auto":
      default:
        return { cx: wrap * 0.5, cy: wrap * 0.75 };
    }
  }, []);

  // Refresh live preview mesh geometry & active placed sticker if edited
  useEffect(() => {
    if (!isOpen || !previewMeshRef.current) return;
    const sizeMeters = stickerSizeCm / 100;
    const hit = lastHitPoseRef.current;
    const { cx, cy } = getCurvatureFactors();

    const newGeom = createConformingStickerGeometry(
      sizeMeters,
      sizeMeters,
      hit?.position || new THREE.Vector3(0, 0, -1.2),
      hit?.quaternion || new THREE.Quaternion(),
      hit?.normal || new THREE.Vector3(0, 0, 1),
      surfaceSamplesRef.current,
      cx,
      cy,
      hit?.depthCurvature || { cx: 0, cy: 0 }
    );

    previewMeshRef.current.geometry.dispose();
    previewMeshRef.current.geometry = newGeom;
    previewMeshRef.current.rotation.z = THREE.MathUtils.degToRad(stickerRotationDeg);
  }, [isOpen, stickerSizeCm, stickerRotationDeg, contourWrap, panelPreset, getCurvatureFactors]);

  // Stamp / Place sticker onto the car surface at the current hit-test pose
  const handlePlaceSticker = useCallback(async () => {
    const scene = sceneRef.current;
    const hit = lastHitPoseRef.current;
    if (!scene || !hit) return;

    const {
      selectedSticker: sticker,
      stickerSizeCm: sizeCm,
      stickerRotationDeg: rotDeg,
    } = latestParamsRef.current;

    const sizeMeters = sizeCm / 100;
    const { cx, cy } = getCurvatureFactors();
    const tex = await loadStickerTexture(sticker.url);

    // Build final high-resolution conformed decal mesh
    const conformedGeom = createConformingStickerGeometry(
      sizeMeters,
      sizeMeters,
      hit.position,
      hit.quaternion,
      hit.normal,
      surfaceSamplesRef.current,
      cx,
      cy,
      hit.depthCurvature
    );

    const material = new THREE.MeshPhysicalMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.03,
      roughness: 0.18,
      metalness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
    });

    const stickerMesh = new THREE.Mesh(conformedGeom, material);
    stickerMesh.position.copy(hit.position);
    stickerMesh.quaternion.copy(hit.quaternion);

    // Apply user's rotation around the surface normal (local Z axis)
    const twistQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 0, 1),
      THREE.MathUtils.degToRad(rotDeg)
    );
    stickerMesh.quaternion.multiply(twistQuat);

    // Pop-in scale animation
    stickerMesh.scale.set(0.01, 0.01, 0.01);
    scene.add(stickerMesh);

    const startTime = performance.now();
    const animateIn = (now: number) => {
      const t = Math.min(1, (now - startTime) / 220);
      // Elastic ease out
      const s = 1 - Math.pow(1 - t, 3);
      stickerMesh.scale.set(s, s, s);
      if (t < 1) requestAnimationFrame(animateIn);
    };
    requestAnimationFrame(animateIn);

    const record: PlacedARSticker = {
      id: `ar-decal-${Date.now()}`,
      mesh: stickerMesh,
      name: sticker.name,
      textureUrl: sticker.url,
      position: hit.position.clone(),
      quaternion: stickerMesh.quaternion.clone(),
      normal: hit.normal.clone(),
      size: sizeMeters,
      rotationDeg: rotDeg,
      curvatureX: cx,
      curvatureY: cy,
    };

    placedStickersRef.current.push(record);
    setPlacedCount(placedStickersRef.current.length);
    setStatusMessage(`Applied "${sticker.name}" to vehicle body!`);

    trackStudioEvent("DECAL_APPLIED", {
      mode: "WebXR_AR_HitTest",
      location: "AR Real-Car Surface (WebXR)",
      stickerName: sticker.name,
      sizeCm,
      panelPreset: latestParamsRef.current.panelPreset,
    });
  }, [getCurvatureFactors, loadStickerTexture]);

  // Undo last placed sticker
  const handleUndoSticker = useCallback(() => {
    const scene = sceneRef.current;
    const last = placedStickersRef.current.pop();
    if (last && scene) {
      scene.remove(last.mesh);
      last.mesh.geometry.dispose();
      (last.mesh.material as THREE.Material).dispose();
      setPlacedCount(placedStickersRef.current.length);
    }
  }, []);

  // Clear all placed stickers
  const handleClearAll = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    for (const item of placedStickersRef.current) {
      scene.remove(item.mesh);
      item.mesh.geometry.dispose();
      (item.mesh.material as THREE.Material).dispose();
    }
    placedStickersRef.current = [];
    setPlacedCount(0);
  }, []);

  // Custom Sticker Upload directly inside AR
  const handleUploadCustomLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const newSticker: StickerItem = {
        id: `custom-ar-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ""),
        url: dataUrl,
      };
      setStickersGallery((prev) => {
        const updated = [...prev, newSticker];
        try {
          const customOnly = updated.filter(
            (s) => !DEFAULT_STICKERS.some((d) => d.id === s.id)
          );
          localStorage.setItem(
            "customly_custom_stickers_gallery",
            JSON.stringify(customOnly)
          );
        } catch {
          // ignore storage quota
        }
        return updated;
      });
      setSelectedSticker(newSticker);
    };
    reader.readAsDataURL(file);
  };

  // Capture AR Photo Snapshot (merges camera video + Three.js WebGL decals)
  const handleCaptureSnapshot = () => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const reticle = reticleGroupRefRef();

    if (!renderer || !scene || !camera) return;

    // Temporarily hide targeting reticle for a clean photo
    if (reticle) reticle.visible = false;
    renderer.render(scene, camera);

    const outCanvas = document.createElement("canvas");
    outCanvas.width = renderer.domElement.width;
    outCanvas.height = renderer.domElement.height;
    const ctx = outCanvas.getContext("2d");

    if (ctx) {
      // If using fallback camera video stream, draw camera background first
      if (videoRef.current && videoRef.current.readyState >= 2) {
        ctx.drawImage(
          videoRef.current,
          0,
          0,
          outCanvas.width,
          outCanvas.height
        );
      }
      ctx.drawImage(renderer.domElement, 0, 0);
      setSnapshotUrl(outCanvas.toDataURL("image/png"));
      trackStudioEvent("AR_SNAPSHOT_CAPTURED", {
        placedStickersCount: placedStickersRef.current.length,
        arMode,
      });
    }

    if (reticle) reticle.visible = true;
  };

  const reticleGroupRefRef = () => reticleGroupRef.current;

  // ─── Initialize Three.js Scene + WebXR Hit-Test Session ─────────────────────
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    let isCleanedUp = false;
    let animationFrameId: number | null = null;
    let cameraStream: MediaStream | null = null;
    const container = containerRef.current;

    // 1. Setup Scene, Camera & Transparent AR Renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.05,
      25
    );
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 2. Automotive Studio Lighting for realistic decal clearcoat reflections
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.35);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight.position.set(1.5, 3, 2);
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x026dfe, 0.8);
    rimLight.position.set(-2, -1, 1);
    scene.add(rimLight);

    // 3. Build 3D Surface-Conforming Targeting Reticle & Live Decal Preview
    const reticleGroup = new THREE.Group();
    reticleGroup.visible = false;
    scene.add(reticleGroup);
    reticleGroupRef.current = reticleGroup;

    // Outer targeting ring
    const ringGeom = new THREE.RingGeometry(0.11, 0.125, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x026dfe,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.position.z = 0.001;
    reticleGroup.add(ringMesh);

    // Corner brackets / surface normal indicator
    const normalLineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0.06),
    ]);
    const normalLineMat = new THREE.LineBasicMaterial({ color: 0xd16b54 });
    const normalLine = new THREE.Line(normalLineGeom, normalLineMat);
    reticleGroup.add(normalLine);

    // Live conforming sticker hologram inside the reticle
    const initSizeM = latestParamsRef.current.stickerSizeCm / 100;
    const previewGeom = createConformingStickerGeometry(
      initSizeM,
      initSizeM,
      new THREE.Vector3(0, 0, -1.2),
      new THREE.Quaternion(),
      new THREE.Vector3(0, 0, 1),
      [],
      0.2,
      0.3,
      { cx: 0, cy: 0 }
    );
    const previewMat = new THREE.MeshPhysicalMaterial({
      transparent: true,
      opacity: 0.82,
      roughness: 0.2,
      clearcoat: 1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const previewMesh = new THREE.Mesh(previewGeom, previewMat);
    previewMesh.position.z = 0.002;
    reticleGroup.add(previewMesh);
    previewMeshRef.current = previewMesh;

    loadStickerTexture(latestParamsRef.current.selectedSticker.url).then(
      (tex) => {
        previewMat.map = tex;
        previewMat.needsUpdate = true;
      }
    );

    // 4. Attempt Native WebXR `immersive-ar` with `hit-test` and `depth-sensing`
    const startAR = async () => {
      const nav = navigator as Navigator & {
        xr?: {
          isSessionSupported(mode: string): Promise<boolean>;
          requestSession(
            mode: string,
            options?: Record<string, unknown>
          ): Promise<XRSessionExtended>;
        };
      };

      let webxrSupported = false;
      if (nav.xr) {
        try {
          webxrSupported = await nav.xr.isSessionSupported("immersive-ar");
        } catch {
          webxrSupported = false;
        }
      }

      if (webxrSupported && nav.xr) {
        try {
          const sessionInit: Record<string, unknown> = {
            requiredFeatures: ["hit-test"],
            optionalFeatures: [
              "dom-overlay",
              "depth-sensing",
              "light-estimation",
              "local-floor",
            ],
          };
          if (overlayRef.current) {
            sessionInit.domOverlay = { root: overlayRef.current };
          }

          const session = await nav.xr.requestSession(
            "immersive-ar",
            sessionInit
          );
          if (isCleanedUp) {
            await session.end();
            return;
          }

          xrSessionRef.current = session;
          setArMode("webxr");
          setStatusMessage(
            "WebXR Hit-Test Active: Aim at car panel to scan surface curvature"
          );
          trackStudioEvent("AR_SESSION_STARTED", {
            arMode: "WebXR Hit-Test",
            angle: "AR Real-Car Camera (WebXR)",
            device: window.innerWidth < 768 ? "Mobile" : "Desktop",
          });

          await renderer.xr.setSession(session as unknown as never);

          const viewerSpace = await session.requestReferenceSpace("viewer");
          const localSpace = await session.requestReferenceSpace("local");

          let hitTestSource: XRHitTestSource | null = null;
          if (session.requestHitTestSource) {
            hitTestSource = await session.requestHitTestSource({
              space: viewerSpace,
            });
          }

          let transientHitTestSource: XRTransientInputHitTestSource | null =
            null;
          if (session.requestHitTestSourceForTransientInput) {
            try {
              transientHitTestSource =
                await session.requestHitTestSourceForTransientInput({
                  profile: "generic-touchscreen",
                });
            } catch {
              // Optional transient input
            }
          }

          const hitMatrix = new THREE.Matrix4();
          const hitPos = new THREE.Vector3();
          const hitQuat = new THREE.Quaternion();
          const hitScale = new THREE.Vector3();
          const hitNormal = new THREE.Vector3();
          // WebXR hit-test pose has +Y as the surface normal; rotate +90deg around X so +Z faces out from car panel
          const alignYToZ = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(1, 0, 0),
            -Math.PI / 2
          );

          let frameCounter = 0;

          renderer.setAnimationLoop((_timestamp, xrFrame) => {
            const frame = xrFrame as unknown as XRFrameExtended | undefined;
            if (frame && hitTestSource) {
              const hitResults = frame.getHitTestResults(hitTestSource);
              if (hitResults.length > 0) {
                const pose = hitResults[0].getPose(localSpace);
                if (pose) {
                  hitMatrix.fromArray(pose.transform.matrix);
                  hitMatrix.decompose(hitPos, hitQuat, hitScale);

                  // Align local +Z with the car panel's outward surface normal
                  hitQuat.multiply(alignYToZ);
                  hitNormal
                    .set(0, 0, 1)
                    .applyQuaternion(hitQuat)
                    .normalize();

                  reticleGroup.visible = true;
                  reticleGroup.position.copy(hitPos);
                  reticleGroup.quaternion.copy(hitQuat);

                  // Record spatial surface sample for multi-point curvature fitting
                  const now = performance.now();
                  const samples = surfaceSamplesRef.current;
                  const tooClose = samples.some(
                    (s) => s.position.distanceTo(hitPos) < 0.025
                  );
                  if (!tooClose) {
                    samples.push({
                      position: hitPos.clone(),
                      normal: hitNormal.clone(),
                      timestamp: now,
                    });
                    // Keep last 45 surface points on the car body
                    if (samples.length > 45) samples.shift();
                  }

                  // Also sample transient multi-touch rays if available
                  if (transientHitTestSource) {
                    const transientResults =
                      frame.getHitTestResultsForTransientInput(
                        transientHitTestSource
                      );
                    for (const tr of transientResults) {
                      if (tr.results.length > 0) {
                        const tPose = tr.results[0].getPose(localSpace);
                        if (tPose) {
                          const tMat = new THREE.Matrix4().fromArray(
                            tPose.transform.matrix
                          );
                          const tPos = new THREE.Vector3();
                          const tQuat = new THREE.Quaternion();
                          const tScl = new THREE.Vector3();
                          tMat.decompose(tPos, tQuat, tScl);
                          tQuat.multiply(alignYToZ);
                          const tNorm = new THREE.Vector3(0, 0, 1)
                            .applyQuaternion(tQuat)
                            .normalize();
                          samples.push({
                            position: tPos,
                            normal: tNorm,
                            timestamp: now,
                          });
                        }
                      }
                    }
                  }

                  // Optional Depth-Sensing API curvature estimation
                  let depthCurvature = { cx: 0, cy: 0 };
                  const viewerPose = frame.getViewerPose(localSpace);
                  if (
                    frame.getDepthInformation &&
                    viewerPose &&
                    viewerPose.views.length > 0
                  ) {
                    try {
                      const depthInfo = frame.getDepthInformation(
                        viewerPose.views[0]
                      );
                      if (depthInfo) {
                        const dCenter = depthInfo.getDepthInMeters(0.5, 0.5);
                        const dLeft = depthInfo.getDepthInMeters(0.42, 0.5);
                        const dRight = depthInfo.getDepthInMeters(0.58, 0.5);
                        const dTop = depthInfo.getDepthInMeters(0.5, 0.42);
                        const dBottom = depthInfo.getDepthInMeters(0.5, 0.58);

                        if (
                          dCenter > 0 &&
                          dLeft > 0 &&
                          dRight > 0 &&
                          dTop > 0 &&
                          dBottom > 0
                        ) {
                          const secondDiffX = dLeft + dRight - 2 * dCenter;
                          const secondDiffY = dTop + dBottom - 2 * dCenter;
                          depthCurvature = {
                            cx: THREE.MathUtils.clamp(
                              secondDiffX * 25,
                              -2.0,
                              2.0
                            ),
                            cy: THREE.MathUtils.clamp(
                              secondDiffY * 25,
                              -2.0,
                              2.0
                            ),
                          };
                        }
                      }
                    } catch {
                      // Depth buffer unavailable on this frame
                    }
                  }

                  lastHitPoseRef.current = {
                    position: hitPos.clone(),
                    quaternion: hitQuat.clone(),
                    normal: hitNormal.clone(),
                    depthCurvature,
                  };

                  if (!surfaceLockedRef.current) {
                    surfaceLockedRef.current = true;
                    setStatusMessage(
                      "Car panel surface locked! Tap 'Apply Sticker' to conform decal."
                    );
                  }

                  // Periodically rebuild preview mesh curvature as phone scans across car panel
                  frameCounter++;
                  if (frameCounter % 12 === 0 && previewMeshRef.current) {
                    const sizeM =
                      latestParamsRef.current.stickerSizeCm / 100;
                    const { cx, cy } = getCurvatureFactors();
                    const updatedGeom = createConformingStickerGeometry(
                      sizeM,
                      sizeM,
                      hitPos,
                      hitQuat,
                      hitNormal,
                      samples,
                      cx,
                      cy,
                      depthCurvature
                    );
                    previewMeshRef.current.geometry.dispose();
                    previewMeshRef.current.geometry = updatedGeom;
                  }
                }
              } else {
                reticleGroup.visible = false;
              }
            }
            renderer.render(scene, camera);
          });

          return;
        } catch (err) {
          console.warn(
            "WebXR immersive-ar session fallback to Camera AR:",
            err
          );
        }
      }

      // 5. Live Rear-Camera AR Pass-Through Fallback (for iOS Safari & Desktop testing)
      setArMode("camera-ar");
      surfaceLockedRef.current = true;
      setStatusMessage(
        "Live Camera AR Active: Tap or drag on car body to conform & stamp sticker"
      );
      trackStudioEvent("AR_SESSION_STARTED", {
        arMode: "Live Camera AR",
        angle: "AR Real-Car Camera (WebXR)",
        device: window.innerWidth < 768 ? "Mobile" : "Desktop",
      });

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
          if (videoRef.current && !isCleanedUp) {
            videoRef.current.srcObject = cameraStream;
            await videoRef.current.play();
          }
        } catch {
          setStatusMessage(
            "Interactive 3D Surface Preview Mode: Tap anywhere on screen to conform & place sticker"
          );
        }
      }

      // Create an invisible curved virtual car body proxy plane at z = -1.25m for raycast hit-testing in Camera AR fallback
      const proxyCarPanelGeom = new THREE.PlaneGeometry(3.2, 2.2, 32, 32);
      const pAttr = proxyCarPanelGeom.attributes
        .position as THREE.BufferAttribute;
      for (let i = 0; i < pAttr.count; i++) {
        const px = pAttr.getX(i);
        const py = pAttr.getY(i);
        // Subtle automotive body panel crown curvature
        const pz = -0.12 * (px * px * 0.4 + py * py * 0.85);
        pAttr.setZ(i, pz);
      }
      proxyCarPanelGeom.computeVertexNormals();

      const proxyCarPanel = new THREE.Mesh(
        proxyCarPanelGeom,
        new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
      );
      proxyCarPanel.position.set(0, 0, -1.25);
      scene.add(proxyCarPanel);

      // Default initial hit pose at center of car body proxy
      const defaultPos = new THREE.Vector3(0, 0, -1.25);
      const defaultQuat = new THREE.Quaternion();
      const defaultNormal = new THREE.Vector3(0, 0, 1);

      reticleGroup.visible = true;
      reticleGroup.position.copy(defaultPos);
      lastHitPoseRef.current = {
        position: defaultPos.clone(),
        quaternion: defaultQuat.clone(),
        normal: defaultNormal.clone(),
        depthCurvature: { cx: 0.25, cy: 0.55 },
      };

      const raycaster = new THREE.Raycaster();
      const pointerNDC = new THREE.Vector2(0, 0);

      const updateFallbackHitTest = (clientX: number, clientY: number) => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(pointerNDC, camera);
        const hits = raycaster.intersectObject(proxyCarPanel, false);
        if (hits.length > 0) {
          const hit = hits[0];
          const normalMat = new THREE.Matrix3().getNormalMatrix(
            proxyCarPanel.matrixWorld
          );
          const worldNorm = hit
            .face!.normal.clone()
            .applyMatrix3(normalMat)
            .normalize();

          const dummy = new THREE.Object3D();
          dummy.position.copy(hit.point);
          dummy.lookAt(hit.point.clone().add(worldNorm));

          reticleGroup.position.copy(hit.point);
          reticleGroup.quaternion.copy(dummy.quaternion);

          surfaceSamplesRef.current.push({
            position: hit.point.clone(),
            normal: worldNorm.clone(),
            timestamp: performance.now(),
          });
          if (surfaceSamplesRef.current.length > 40) {
            surfaceSamplesRef.current.shift();
          }

          lastHitPoseRef.current = {
            position: hit.point.clone(),
            quaternion: dummy.quaternion.clone(),
            normal: worldNorm.clone(),
            depthCurvature: { cx: 0.3, cy: 0.65 },
          };
        }
      };

      const onPointerMove = (ev: PointerEvent) => {
        updateFallbackHitTest(ev.clientX, ev.clientY);
      };

      renderer.domElement.addEventListener("pointermove", onPointerMove);
      renderer.domElement.addEventListener("pointerdown", onPointerMove);

      const renderLoop = () => {
        if (isCleanedUp) return;
        animationFrameId = requestAnimationFrame(renderLoop);
        renderer.render(scene, camera);
      };
      renderLoop();
    };

    startAR();

    const handleResize = () => {
      if (!rendererRef.current || !cameraRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      isCleanedUp = true;
      window.removeEventListener("resize", handleResize);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (xrSessionRef.current) {
        xrSessionRef.current.end().catch(() => {});
        xrSessionRef.current = null;
      }
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
      if (rendererRef.current) {
        rendererRef.current.setAnimationLoop(null);
        rendererRef.current.dispose();
      }
    };
  }, [isOpen, getCurvatureFactors, loadStickerTexture]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-200 bg-black overflow-hidden select-none">
      {/* Rear Camera Video Pass-Through (Used when in Camera-AR mode on iOS/Desktop) */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 w-full h-full object-cover pointer-events-none ${
          arMode === "camera-ar" ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Subtle Automotive Grid Backdrop if Camera stream is not active */}
      {arMode === "camera-ar" && (
        <div
          className="absolute inset-0 pointer-events-none opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 50%, rgba(2, 109, 254, 0.25) 0%, transparent 70%), linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "100% 100%, 40px 40px, 40px 40px",
          }}
        />
      )}

      {/* Three.js WebGL / WebXR Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* WebXR DOM Overlay HUD */}
      <div
        ref={overlayRef}
        className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 z-10"
      >
        {/* Top Bar: Mode Status & Exit */}
        <div className="flex items-center justify-between gap-2 pointer-events-auto">
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl glass border border-glass-border backdrop-blur-xl bg-[#06090b]/80 shadow-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                  AR Surface Decal Studio
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#026dfe]/20 border border-[#026dfe]/50 text-[#026dfe] font-bold uppercase">
                  {arMode === "webxr" ? "WebXR Hit-Test" : "Live Camera AR"}
                </span>
              </div>
              <p className="text-[10px] text-[#d2e2ea]/70 mt-0.5 max-w-xs sm:max-w-md truncate">
                {statusMessage}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCaptureSnapshot}
              className="p-2.5 rounded-xl glass border border-glass-border bg-[#06090b]/80 text-white/90 hover:text-white transition shadow-lg cursor-pointer"
              title="Take AR Photo Snapshot"
            >
              <Camera className="w-4 h-4 text-[#026dfe]" />
            </button>

            <button
              onClick={onClose}
              className="p-2.5 rounded-xl glass border border-red-500/40 bg-red-950/50 text-red-300 hover:bg-red-600 hover:text-white transition shadow-lg cursor-pointer"
              title="Exit AR Studio"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center Reticle Guidance Pill */}
        <div className="self-center pointer-events-none">
          <div className="px-3.5 py-1.5 rounded-full bg-black/55 backdrop-blur-md border border-white/10 text-[11px] text-white/85 flex items-center gap-2 shadow-lg">
            <Crosshair className="w-3.5 h-3.5 text-[#026dfe]" />
            <span>
              Aim blue ring at car door, hood, or fender · Surface curvature
              auto-conforms
            </span>
          </div>
        </div>

        {/* Bottom HUD Controls */}
        <div className="space-y-2.5 pointer-events-auto max-w-xl w-full mx-auto">
          {/* Collapsible Curvature, Size & Rotation Drawer */}
          {showControlsDrawer && (
            <div className="p-4 rounded-2xl glass border border-glass-border backdrop-blur-2xl bg-[#06090b]/90 shadow-2xl space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-150">
              <div className="flex items-center justify-between border-b border-glass-border pb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#d16b54]" />
                  <span>Body Panel Contour & Transform</span>
                </span>
                <button
                  onClick={() => setShowControlsDrawer(false)}
                  className="text-[10px] text-white/50 hover:text-white"
                >
                  Done
                </button>
              </div>

              {/* Car Panel Contour Presets */}
              <div className="grid grid-cols-4 gap-1.5">
                {(
                  [
                    { id: "auto", label: "Auto Scan" },
                    { id: "door", label: "Car Door" },
                    { id: "hood", label: "Front Hood" },
                    { id: "fender", label: "Fender Arch" },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPanelPreset(p.id)}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition cursor-pointer ${
                      panelPreset === p.id
                        ? "bg-[#026dfe] text-white border-[#026dfe] shadow-md shadow-[#026dfe]/30"
                        : "bg-white/5 text-white/70 border-glass-border hover:text-white"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Sliders: Size, Rotation, Body Curvature Wrap */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/70 w-28 flex items-center gap-1">
                    <Maximize2 className="w-3 h-3 text-[#026dfe]" />
                    Size ({stickerSizeCm}cm)
                  </span>
                  <input
                    type="range"
                    min={12}
                    max={85}
                    value={stickerSizeCm}
                    onChange={(e) => setStickerSizeCm(Number(e.target.value))}
                    className="flex-1 accent-[#026dfe] cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/70 w-28 flex items-center gap-1">
                    <RotateCw className="w-3 h-3 text-[#d16b54]" />
                    Rotate ({stickerRotationDeg}°)
                  </span>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    value={stickerRotationDeg}
                    onChange={(e) =>
                      setStickerRotationDeg(Number(e.target.value))
                    }
                    className="flex-1 accent-[#d16b54] cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/70 w-28 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    Body Wrap ({Math.round(contourWrap * 100)}%)
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1.5}
                    step={0.05}
                    value={contourWrap}
                    onChange={(e) => setContourWrap(Number(e.target.value))}
                    className="flex-1 accent-emerald-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Main Sticker Carousel & Action Bar */}
          <div className="p-3.5 rounded-2xl glass border border-glass-border backdrop-blur-2xl bg-[#06090b]/90 shadow-2xl space-y-3">
            {/* Sticker Selector Strip */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
              {/* Upload Custom Decal Button */}
              <label className="shrink-0 w-14 h-14 rounded-xl border border-dashed border-[#026dfe]/60 bg-[#026dfe]/10 hover:bg-[#026dfe]/20 flex flex-col items-center justify-center gap-1 cursor-pointer transition text-[#026dfe]">
                <Upload className="w-4 h-4" />
                <span className="text-[8px] font-bold uppercase">Upload</span>
                <input
                  type="file"
                  accept="image/png,image/svg+xml,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleUploadCustomLogo}
                />
              </label>

              {stickersGallery.map((st) => {
                const isSelected = selectedSticker.id === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => setSelectedSticker(st)}
                    className={`shrink-0 w-14 h-14 rounded-xl border p-1.5 flex flex-col items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? "border-[#026dfe] bg-[#026dfe]/20 ring-1 ring-[#026dfe] shadow-lg shadow-[#026dfe]/20"
                        : "border-glass-border bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={st.url}
                      alt={st.name}
                      className="w-8 h-8 object-contain"
                    />
                    <span className="text-[8px] text-white/80 font-semibold truncate w-full text-center">
                      {st.name.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Primary Stamp & Utility Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowControlsDrawer((p) => !p)}
                className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  showControlsDrawer
                    ? "bg-[#d16b54] text-white border-[#d16b54]"
                    : "glass border-glass-border text-white/80 hover:text-white"
                }`}
                title="Adjust sticker size, rotation, and car body contour curvature"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Contour</span>
              </button>

              <button
                onClick={handlePlaceSticker}
                className="flex-1 py-2.5 px-4 rounded-xl bg-linear-to-r from-[#026dfe] to-[#0151c2] hover:brightness-110 text-white text-xs font-extrabold uppercase tracking-wider shadow-lg shadow-[#026dfe]/30 flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Apply Sticker to Car Body</span>
              </button>

              {placedCount > 0 && (
                <>
                  <button
                    onClick={handleUndoSticker}
                    className="p-2.5 rounded-xl glass border border-glass-border text-white/80 hover:text-white transition cursor-pointer"
                    title="Undo last sticker"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleClearAll}
                    className="p-2.5 rounded-xl glass border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition cursor-pointer"
                    title="Remove all placed AR stickers"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Snapshot Preview Modal */}
      {snapshotUrl && (
        <div className="fixed inset-0 z-250 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl glass border border-glass-border p-5 space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#026dfe]" />
                <span>AR Vehicle Decal Snapshot</span>
              </h3>
              <button
                onClick={() => setSnapshotUrl(null)}
                className="p-1 rounded-lg text-white/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-glass-border bg-black aspect-video flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={snapshotUrl}
                alt="AR Car Sticker Snapshot"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex items-center gap-2">
              <a
                href={snapshotUrl}
                download="customly-ar-car-decal.png"
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#026dfe] hover:brightness-110 text-white text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <Download className="w-4 h-4" />
                <span>Save Photo</span>
              </a>
              <button
                onClick={() => setSnapshotUrl(null)}
                className="py-2.5 px-4 rounded-xl glass border border-glass-border text-xs font-semibold text-white/80 hover:text-white"
              >
                Continue AR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
