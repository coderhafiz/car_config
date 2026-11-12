"use client";

import { useRef, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { easing } from "maath";
import {
  Mesh,
  MeshStandardMaterial,
  MeshPhysicalMaterial,
  MeshBasicMaterial,
  BufferGeometry,
  PlaneGeometry,
  Box3,
  Vector3,
  Matrix4,
  Object3D,
  Group,
  WebGLRenderer,
  BackSide,
  DoubleSide,
  CanvasTexture,
  RepeatWrapping,
  SRGBColorSpace,
  BufferAttribute,
  Color,
  PointLight,
  SpotLight,
  Cache,
} from "three";
import { DRACOLoader, KTX2Loader, GLTFLoader } from "three-stdlib";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { MeshoptDecoder } from "meshoptimizer";

const EMPTY_MATS: MeshPhysicalMaterial[] = [];

// ─── Configuration types ──────────────────────────────────────────────────────

export interface ConfigState {
  mainColor: string;
  accentColor: string;
  interiorColor: string;
  selectedModel: string;
  isAnimated: boolean;
  rotationY: number;
  zoom: number;
  lightIntensity: number;
  partColors: Record<string, string>;
  viewMode: "exterior" | "interior";
  selectedTexture: string;
  /** True when the selected exterior paint is a matte finish */
  mattePaint: boolean;
}

export const TEXTURES = [
  { id: "none", name: "Smooth Solid" },
  { id: "leather", name: "Nappa Leather (KTX2)" },
  { id: "linen", name: "Sport Technical (KTX2)" },
  { id: "velvet", name: "Alcantara / Race-Tex (KTX2)" },
];

export const TEXTURE_PATHS: Record<string, Record<string, string>> = {
  leather: {
    map: "/textures/leather/diffuse.ktx2",
    normalMap: "/textures/leather/normal.ktx2",
    roughnessMap: "/textures/leather/roughness.ktx2",
  },
  linen: {
    map: "/textures/linen/diffuse.ktx2",
    normalMap: "/textures/linen/normal.ktx2",
    aoMap: "/textures/linen/arm.ktx2",
  },
  velvet: {
    map: "/textures/velvet/diffuse.ktx2",
    normalMap: "/textures/velvet/normal.ktx2",
    aoMap: "/textures/velvet/arm.ktx2",
  },
};

export interface CameraPreset {
  position: [number, number, number];
  target: [number, number, number];
  label: string;
}

export interface ModelPart {
  id: string;
  name: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  brand: string;
  year: number;
  description: string;
  price: number;
  url: string;
  type: string;
  scale: number;
  rotationX?: number;
  rotationY?: number;
  parts: ModelPart[];
  materialType: string;
  /** Camera node name from GLTF used for interior view */
  interiorCameraName?: string;
  /** Exterior preset (derived from GLTF camera or fallback) */
  exteriorCamera: CameraPreset;
  /** Interior camera position from GLTF data */
  interiorCamera: CameraPreset;
  accentColor: string;
  /**
   * Several GLTF files were exported from Blender without applying their
   * Mirror modifiers, so only one half of many parts (body panels, glass,
   * lights, wheels…) is present in the file. This describes how to rebuild
   * the missing halves at load time.
   */
  symmetry?: SymmetryConfig;
  /** Extra GLTF material names that are the body paint (beyond "*paint*") */
  paintMaterials?: string[];
}

export interface SymmetryConfig {
  /** Lateral (left/right) axis of the car in GLTF world space */
  axis: "x" | "z";
  /** Which one-sided halves to mirror: "+" = above the plane, "-" = below */
  sides: ("+" | "-")[];
  /** Asymmetric parts that must never be mirrored (steering wheel, gauges…) */
  exclude?: string[];
  /** Optional regex pattern to only mirror parts whose name or geometry matches */
  matchPattern?: RegExp;
  /** Optional explicit list of node names to mirror across the lateral axis */
  includeNodes?: string[];
  /**
   * Front ↔ rear mirroring for wheel parts that only exist on one axle.
   * The plane is the world position of the `planeNode` empty (the original
   * Blender mirror object).
   */
  axle?: { axis: "x" | "z"; planeNode: string; nodes: string[] };
}

// ─── Car definitions (from GLTF mesh node inspection) ────────────────────────
// Camera positions are derived from each GLTF file's camera node translations,
// scaled to Three.js scene units (model bounding box ~250 units).
// GLTF camera translations are in Blender meters; scale factor ~30x for our scene.

export const MODELS: ModelInfo[] = [
  {
    id: "audi-r8",
    name: "Audi R8",
    brand: "Audi",
    year: 2023,
    description:
      "Bespoke customly-U styling program featuring carbon aerodynamic styling, custom caliper detailing, and signature bespoke coachwork finish.",
    price: 158900,
    url: "/cars/Car_config.glb",
    type: "glb",
    scale: 1,
    rotationX: 0,
    accentColor: "#D4D8DD",
    // Parts identified from GLTF node names
    parts: [
      { id: "Caliper", name: "Brake Calipers" },
      { id: "Caliper.001", name: "Brake Calipers (Rear)" },
      { id: "Tire05_low", name: "Front Tire" },
      { id: "Tire05_low.001", name: "Rear Tire" },
    ],
    materialType: "Carbon Fiber / Leather",
    interiorCameraName: "Camera.006",
    // Only the +X (driver) half of the body, glass, lights and rear wheel
    // assembly is present in the file.
    symmetry: {
      axis: "x",
      sides: ["+"],
      // Steering wheel + instrument binnacle (driver side only)
      exclude: [
        "Circle.002",
        "Circle.003",
        "Sphere.001",
        "Sphere.002",
        "Subdiv#5.036",
        "Subdiv#5.038",
        "Subdiv#5.040",
        "Subdiv#5.048",
      ],
    },
    // GLTF Camera.006 translation: [5.64, 4.72, 7.31] → scaled ×30, framed inside Showroom
    exteriorCamera: {
      position: [175, 95, 215],
      target: [0, 30, 0],
      label: "Exterior",
    },
    // GLTF Camera.006 world position/forward transformed to centered 250-unit scene
    interiorCamera: {
      position: [1.6, 61.1, -17],
      target: [1.6, 46.2, 41.1],
      label: "Interior",
    },
  },
  {
    id: "audi-rs6",
    name: "Audi RS6 Avant",
    brand: "Audi",
    year: 2020,
    description:
      "Signature widebody styling package with tailored carbon splitter, custom forged alloys, and bespoke interior appointments.",
    price: 117900,
    url: "/cars/Car_config1.glb",
    type: "glb",
    scale: 1,
    rotationX: 0,
    rotationY: Math.PI / 2,
    accentColor: "#7A8088",
    parts: [
      { id: "WholeBody", name: "Body" },
      { id: "WholeBody.001", name: "Body Panels" },
      { id: "Seating-front", name: "Front Seats" },
      { id: "Seating-rear", name: "Rear Seats" },
      { id: "Seating base", name: "Seat Base" },
      { id: "Rims.001", name: "Wheels" },
      { id: "Rims-Mirror", name: "Mirror Trim" },
      { id: "Dashboard", name: "Dashboard" },
      { id: "Carpet interior", name: "Interior Carpet" },
    ],
    materialType: "Nappa Leather / Alcantara",
    interiorCameraName: "Camera.007",
    symmetry: {
      axis: "z",
      sides: ["+", "-"],
      exclude: ["Wheels"], // steering wheel
      // "Rims-Mirror" is the Blender empty used to mirror the front wheel
      axle: {
        axis: "x",
        planeNode: "Rims-Mirror",
        nodes: ["Rims.001", "Caliper", "Disk"],
      },
    },
    exteriorCamera: {
      position: [185, 100, 225],
      target: [0, 30, 0],
      label: "Exterior",
    },
    interiorCamera: {
      position: [2.4, 59.5, -24.8],
      target: [-1.2, 42.9, 32.7],
      label: "Interior",
    },
  },
  {
    id: "audi-rs8",
    name: "Audi RS8 Sport",
    brand: "Audi",
    year: 2023,
    description:
      "Flagship bespoke grand tourer conversion featuring sculpted aerodynamic package, tailored forged wheels, and handcrafted cabin.",
    price: 189500,
    url: "/cars/Car_config2.glb",
    type: "glb",
    scale: 1,
    rotationX: 0,
    rotationY: Math.PI / 2,
    accentColor: "#D4D8DD",
    parts: [
      { id: "Body", name: "Body" },
      { id: "WholeBody", name: "Body Panels" },
      { id: "Seating base", name: "Seat Base" },
      { id: "Seating base.001", name: "Seat Base Alt" },
      { id: "Seating-rear", name: "Rear Seats" },
      { id: "Rims.001", name: "Wheels" },
      { id: "Dashboard", name: "Dashboard" },
      { id: "Spoiler", name: "Rear Spoiler" },
      { id: "Grill", name: "Front Grille" },
    ],
    materialType: "Carbon Fiber / RS Sport Leather",
    interiorCameraName: "Camera",
    symmetry: {
      axis: "z",
      sides: ["+", "-"],
      // "Wheels" is the Blender empty used to mirror the single wheel
      axle: {
        axis: "x",
        planeNode: "Wheels",
        nodes: ["Rims.001", "Tires", "Brakes"],
      },
    },
    exteriorCamera: {
      position: [175, 95, 215],
      target: [0, 30, 0],
      label: "Exterior",
    },
    interiorCamera: {
      position: [-6.7, 55.6, -12.8],
      target: [5, 39.7, 43.8],
      label: "Interior",
    },
  },
  {
    id: "porsche-911",
    name: "Porsche 911 992",
    brand: "Porsche",
    year: 2023,
    description:
      "Bespoke rear-engine custom program with tailored exterior styling, precision forged rims, and signature race-tex appointments.",
    price: 142700,
    url: "/cars/Car_config3.glb",
    type: "glb",
    scale: 1,
    rotationX: 0,
    accentColor: "#D4AF37",
    parts: [
      { id: "body.002", name: "Body" },
      { id: "body.003", name: "Body Lower" },
      { id: "bseats.002", name: "Seats" },
      { id: "bwheels.002", name: "Wheels" },
      { id: "blights.002", name: "Lights" },
      { id: "bbumper.002", name: "Bumpers" },
      { id: "fbumper.002", name: "Front Bumper" },
      { id: "doors.002", name: "Doors" },
      { id: "mirrors.002", name: "Mirrors" },
    ],
    materialType: "Semi-Aniline Leather / Race-Tex",
    interiorCameraName: "Camera.010",
    // The 911's body panels use a generic "Material.022" paint material
    paintMaterials: ["Material.022"],
    exteriorCamera: {
      position: [175, 95, 215],
      target: [0, 30, 0],
      label: "Exterior",
    },
    interiorCamera: {
      position: [2.6, 52.4, -26.7],
      target: [1.8, 39.9, 32],
      label: "Interior",
    },
  },
  {
    id: "chevrolet-corvette-c8",
    name: "Chevrolet Corvette C8",
    brand: "Chevrolet",
    year: 2025,
    description:
      "Bespoke mid-engine American supercar featuring tailored aerodynamic coachwork, forged performance alloys, and handcrafted cabin appointments.",
    price: 135800,
    url: "/cars/chevrolet.glb",
    type: "glb",
    scale: 1,
    rotationX: 0,
    accentColor: "#D4D8DD",
    parts: [
      { id: "Motor Door", name: "Body & Hood" },
      { id: "Door.001", name: "Doors" },
      { id: "Circle.004", name: "Front Wheels" },
      { id: "Circle.014", name: "Rear Wheels" },
      { id: "Plane.056", name: "Mirrors" },
    ],
    materialType: "Semi-Aniline Leather / Napa Trim",
    interiorCameraName: "Camera.001",
    paintMaterials: ["carpaint"],
    exteriorCamera: {
      position: [180, 95, 215],
      target: [0, 30, 0],
      label: "Exterior",
    },
    interiorCamera: {
      position: [18, 56, -6],
      target: [18, 48, 28],
      label: "Interior",
    },
  },
  {
    id: "lamborghini-revuelto",
    name: "Lamborghini Revuelto",
    brand: "Lamborghini",
    year: 2024,
    description:
      "Flagship V12 HPEV hybrid hypercar featuring an aeronautics-inspired carbon monofuselage, active aerodynamics, and bespoke customly-U coachwork finish.",
    price: 608358,
    url: "/cars/lamboghini_1.glb",
    type: "glb",
    scale: 1,
    rotationX: 0,
    accentColor: "#D4D8DD",
    parts: [
      { id: "AM-Lamborghini Revuelto.164", name: "Monofuselage Carbon Body" },
      { id: "AM-Lamborghini Revuelto.249", name: "Front Forged Y-Spoke Wheels" },
      { id: "AM-Lamborghini Revuelto.253", name: "Rear Forged Y-Spoke Wheels" },
      { id: "AM-Lamborghini Revuelto.248", name: "Dual Hex Sport Exhaust" },
      { id: "AM-Lamborghini Revuelto.239", name: "Performance Tires" },
      { id: "AM-Lamborghini Revuelto.195", name: "Corsatex Bucket Seats" },
      { id: "AM-Lamborghini Revuelto.198", name: "Cockpit Steering Wheel" },
      { id: "AM-Lamborghini Revuelto.141", name: "Wing Mirrors & Aero Stalks" },
    ],
    materialType: "Monofuselage Carbon / Corsatex",
    interiorCameraName: "Camera.002",
    paintMaterials: ["The-Best-CarPiant-amj"],
    exteriorCamera: {
      position: [180, 95, 215],
      target: [0, 30, 0],
      label: "Exterior",
    },
    interiorCamera: {
      position: [18, 56, -8],
      target: [15, 48, 32],
      label: "Interior",
    },
  },
];

// ─── DRACO / KTX2 loader singletons ──────────────────────────────────────────

let dracoLoader: DRACOLoader | null = null;
let ktx2Loader: KTX2Loader | null = null;
let persistentCacheInitialized = false;

const ASSET_CACHE_NAME = "customly-u-3d-assets-v8";
const CACHEABLE_ASSET_PREFIXES = ["/cars/", "/draco/", "/basis/", "/hdri/", "/textures/"];
const inFlightAssetFetches = new Map<string, Promise<Response>>();

/**
 * Ensures 3D models, KTX2 textures, and WASM decoders are persisted across browser
 * sessions using the Origin Cache Storage API (`window.caches`) + Service Worker (`/sw.js`)
 * + `navigator.storage.persist()`, as well as in-memory `THREE.Cache`.
 */
function ensurePersistentAssetCache() {
  Cache.enabled = true;
  if (persistentCacheInitialized || typeof window === "undefined") return;
  persistentCacheInitialized = true;

  // Explicitly purge older cache stores so outdated models are never served
  if ("caches" in window) {
    window.caches.keys().then((keys) => {
      keys.forEach((k) => {
        if (k.startsWith("customly-u-3d-assets-") && k !== ASSET_CACHE_NAME) {
          window.caches.delete(k).catch(() => undefined);
        }
      });
    }).catch(() => undefined);
  }

  // Request persistent storage quota so the browser never auto-evicts cached .glb models
  if (navigator.storage && typeof navigator.storage.persist === "function") {
    navigator.storage.persist().catch(() => undefined);
  }

  // Register Service Worker to intercept both main-thread and Web Worker fetches
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => undefined);
  }

  // Also wrap window.fetch so even the very first visit (before the Service Worker claims the tab)
  // reads from and writes to CacheStorage ("customly-u-3d-assets-v1")
  if ("caches" in window && typeof window.fetch === "function") {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const method = (
        init?.method ||
        (input instanceof Request ? input.method : "GET")
      ).toUpperCase();

      if (method !== "GET") {
        return originalFetch(input, init);
      }

      let urlStr = "";
      if (typeof input === "string") {
        urlStr = input;
      } else if (input instanceof URL) {
        urlStr = input.href;
      } else if (input instanceof Request) {
        urlStr = input.url;
      }

      let parsedUrl: URL | null = null;
      try {
        parsedUrl = new URL(urlStr, window.location.origin);
      } catch {
        return originalFetch(input, init);
      }

      const isSameOrigin = parsedUrl.origin === window.location.origin;
      const isCacheableAsset =
        isSameOrigin &&
        CACHEABLE_ASSET_PREFIXES.some((prefix) =>
          parsedUrl!.pathname.startsWith(prefix)
        );

      if (!isCacheableAsset) {
        return originalFetch(input, init);
      }

      const cacheKey = parsedUrl.href;
      try {
        const cache = await window.caches.open(ASSET_CACHE_NAME);
        const cachedResponse = await cache.match(cacheKey, { ignoreVary: true });
        if (cachedResponse) {
          console.log("[AssetCache] Serving saved 3D asset from cache:", cacheKey);
          return cachedResponse.clone();
        }

        let inFlight = inFlightAssetFetches.get(cacheKey);
        if (!inFlight) {
          inFlight = originalFetch(input, init)
            .then(async (response) => {
              if (response && response.status === 200 && response.ok) {
                try {
                  await cache.put(cacheKey, response.clone());
                } catch {
                  // Ignore quota exceeded errors
                }
              }
              return response;
            })
            .finally(() => {
              inFlightAssetFetches.delete(cacheKey);
            });
          inFlightAssetFetches.set(cacheKey, inFlight);
        }

        const netResponse = await inFlight;
        return netResponse.clone();
      } catch {
        return originalFetch(input, init);
      }
    };
  }
}

function getDracoLoader() {
  if (!dracoLoader) {
    dracoLoader = new DRACOLoader();
    // Use the local Draco decoders copied from the reference project
    dracoLoader.setDecoderPath("/draco/");
  }
  return dracoLoader;
}

function getKTX2Loader(gl?: WebGLRenderer) {
  if (!ktx2Loader) {
    ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath("/basis/");
    if (gl && gl.extensions && typeof gl.extensions.has === "function") {
      ktx2Loader.detectSupport(gl);
    } else if (typeof document !== "undefined") {
      const dummyRenderer = new WebGLRenderer();
      ktx2Loader.detectSupport(dummyRenderer);
      dummyRenderer.dispose();
    }
  }
  return ktx2Loader;
}

export function setupLoaders(loader: GLTFLoader, gl?: WebGLRenderer) {
  ensurePersistentAssetCache();
  loader.setDRACOLoader(getDracoLoader());
  loader.setKTX2Loader(getKTX2Loader(gl));
  loader.setMeshoptDecoder(MeshoptDecoder);
}

// ─── Preload helpers ──────────────────────────────────────────────────────────

export function preloadCarModel(url: string) {
  useGLTF.preload(url, "/draco/", true, (loader) => {
    setupLoaders(loader as GLTFLoader);
  });
}

export function PreloadModels() {
  const { gl } = useThree();
  useEffect(() => {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isMobileDevice =
      isSafari ||
      isIOS ||
      window.innerWidth < 768 ||
      /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      navigator.maxTouchPoints > 1;
    const navConn = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    const isDataConstrained = Boolean(
      navConn?.saveData ||
        navConn?.effectiveType === "slow-2g" ||
        navConn?.effectiveType === "2g" ||
        navConn?.effectiveType === "3g"
    );

    if (isMobileDevice || isDataConstrained) return;

    // 1. High-priority preload: Showroom + CustomlyDrasonLogo + saved/default car model
    //    Gets 100% of browser connections without network contention
    useGLTF.preload("/cars/ShowRoom.glb", "/draco/", true, (loader) =>
      setupLoaders(loader as GLTFLoader, gl)
    );
    useGLTF.preload("/cars/CustomlyDrasonLogo.glb", "/draco/", true, (loader) =>
      setupLoaders(loader as GLTFLoader, gl)
    );

    // Check if user previously saved a model preference on a prior visit
    let initialModelUrl = MODELS[0].url;
    try {
      const savedStr = window.localStorage.getItem("customly_saved_car_config");
      if (savedStr) {
        const saved = JSON.parse(savedStr);
        const matched = MODELS.find((m) => m.id === saved.selectedModel);
        if (matched) initialModelUrl = matched.url;
      }
    } catch {
      // Ignore storage errors
    }
    useGLTF.preload(initialModelUrl, "/draco/", true, (loader) =>
      setupLoaders(loader as GLTFLoader, gl)
    );

    // 2. Prioritized background preloading for remaining cars (heaviest models first: Porsche 911 & Lamborghini)
    const priorityOrder = [
      "porsche-911",
      "lamborghini-revuelto",
      "audi-rs6",
      "audi-rs8",
      "chevrolet-corvette-c8",
    ];
    const otherModels = MODELS.slice(1).sort(
      (a, b) => priorityOrder.indexOf(a.id) - priorityOrder.indexOf(b.id)
    );
    const timers = otherModels.map((model, idx) =>
      setTimeout(() => {
        useGLTF.preload(model.url, "/draco/", true, (loader) =>
          setupLoaders(loader as GLTFLoader, gl)
        );
      }, 500 + idx * 600)
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [gl]);
  return null;
}

export function PreloadTextures() {
  return null;
}

// ─── Symmetry restoration ────────────────────────────────────────────────────

const AXIS_INDEX = { x: 0, z: 2 } as const;

/** Three.js GLTFLoader strips "." and spaces from node names */
function sanitizeNodeName(name: string): string {
  return name.replace(/\./g, "").replace(/\s/g, "_");
}

/** Returns the object that directly holds the car's part nodes */
function findPartsContainer(root: Object3D): Object3D {
  let best: Object3D = root;
  root.traverse((o) => {
    if (o.children.length > best.children.length) best = o;
  });
  return best;
}

/**
 * Re-creates the halves of parts that were lost because Blender's Mirror
 * modifiers were not applied on export. Mirrored copies share geometry and
 * materials with the original part, so colour changes apply to both.
 */
function restoreSymmetry(root: Object3D, symmetry: SymmetryConfig) {
  root.updateMatrixWorld(true);
  const container = findPartsContainer(root);
  const containerWorld = container.matrixWorld.clone();
  const containerWorldInv = containerWorld.clone().invert();

  const lateral = AXIS_INDEX[symmetry.axis];
  const plane = new Vector3().setFromMatrixPosition(containerWorld).getComponent(lateral);
  const exclude = new Set((symmetry.exclude ?? []).map(sanitizeNodeName));
  const includeNodesSet = symmetry.includeNodes
    ? new Set(symmetry.includeNodes.map(sanitizeNodeName))
    : null;

  // Reflection across a world-space plane, expressed in container space
  const reflect = (axis: number, value: number) => {
    const s = new Vector3(1, 1, 1).setComponent(axis, -1);
    const t = new Vector3().setComponent(axis, 2 * value);
    const world = new Matrix4().makeScale(s.x, s.y, s.z).setPosition(t);
    return containerWorldInv.clone().multiply(world).multiply(containerWorld);
  };

  const mirrorPart = (part: Object3D, reflection: Matrix4) => {
    const copy = part.clone();
    copy.name = `${part.name}_mirror`;
    copy.matrix.copy(reflection).multiply(part.matrix);
    copy.matrix.decompose(copy.position, copy.quaternion, copy.scale);

    // Negative scaling from mirroring flips triangle winding; ensure DoubleSide
    // so backface culling does not cull mirrored or original geometry
    copy.traverse((c) => {
      if (c instanceof Mesh && c.material) {
        const rawMats = Array.isArray(c.material) ? c.material : [c.material];
        rawMats.forEach((m) => {
          if (m) m.side = DoubleSide;
        });
      }
    });
    part.traverse((c) => {
      if (c instanceof Mesh && c.material) {
        const rawMats = Array.isArray(c.material) ? c.material : [c.material];
        rawMats.forEach((m) => {
          if (m) m.side = DoubleSide;
        });
      }
    });

    container.add(copy);
    return copy;
  };

  const EPS = 0.05;
  const lateralReflection = reflect(lateral, plane);
  const mirrored = new Map<string, Object3D>();
  const box = new Box3();

  [...container.children].forEach((part) => {
    if (exclude.has(part.name)) return;
    if (includeNodesSet) {
      if (!includeNodesSet.has(sanitizeNodeName(part.name))) return;
    } else if (symmetry.matchPattern) {
      let matched = symmetry.matchPattern.test(part.name);
      if (!matched) {
        part.traverse((c) => {
          if (c.name && symmetry.matchPattern!.test(c.name)) matched = true;
          if (
            (c as { geometry?: { name?: string } }).geometry?.name &&
            symmetry.matchPattern!.test((c as { geometry?: { name?: string } }).geometry!.name!)
          ) {
            matched = true;
          }
          if (c instanceof Mesh && c.material) {
            const rawMats = Array.isArray(c.material) ? c.material : [c.material];
            rawMats.forEach((m) => {
              if (m && m.name && symmetry.matchPattern!.test(m.name)) matched = true;
            });
          }
        });
      }
      if (!matched) return;
    }
    box.setFromObject(part);
    if (box.isEmpty()) return; // empties, cameras, lights

    const min = box.min.getComponent(lateral);
    const max = box.max.getComponent(lateral);
    const isCentered = min >= plane - EPS && max <= plane + EPS;
    const side = isCentered
      ? null
      : min >= plane - EPS
        ? "+"
        : max <= plane + EPS
          ? "-"
          : null;
    if (side && symmetry.sides.includes(side)) {
      mirrored.set(part.name, mirrorPart(part, lateralReflection));
    }
  });

  // Front ↔ rear duplication of wheel parts that only exist on one axle
  if (symmetry.axle) {
    const planeNode = root.getObjectByName(sanitizeNodeName(symmetry.axle.planeNode));
    if (planeNode) {
      const axleAxis = AXIS_INDEX[symmetry.axle.axis];
      const axlePlane = new Vector3()
        .setFromMatrixPosition(planeNode.matrixWorld)
        .getComponent(axleAxis);
      const axleReflection = reflect(axleAxis, axlePlane);

      symmetry.axle.nodes.map(sanitizeNodeName).forEach((name) => {
        const part = container.children.find((c) => c.name === name);
        if (!part) return;
        mirrorPart(part, axleReflection);
        const sideCopy = mirrored.get(name);
        if (sideCopy) mirrorPart(sideCopy, axleReflection);
      });
    }
  }
}

// ─── Material helpers ────────────────────────────────────────────────────────

type MaterialCategory = "glass" | "paint" | "accent" | "interior" | "other";

/**
 * Collects the name of `obj` and all of its ancestor nodes up to `root`.
 * Multi-primitive GLTF meshes are loaded as a `Group` (with the GLTF node name)
 * containing child `Mesh` objects named after the mesh primitive (`Circle063_4`,
 * `Mesh008_1`, etc.), so checking ancestor names is required to identify which
 * car part a leaf mesh belongs to.
 */
function getPartPath(obj: Object3D, root: Object3D): string {
  const names: string[] = [];
  let curr: Object3D | null = obj;
  while (curr && curr !== root) {
    if (curr.name) names.push(curr.name);
    curr = curr.parent;
  }
  return names.join(" ").toLowerCase();
}

/**
 * Clones any `MeshStandardMaterial` as a `MeshPhysicalMaterial`, preserving all
 * original textures (`map`, `normalMap`, `roughnessMap`, `metalnessMap`, `aoMap`,
 * `emissiveMap`), UV transforms, colors, and PBR parameters.
 */
function cloneAsPhysicalMaterial(
  m: MeshStandardMaterial
): MeshPhysicalMaterial {
  if (m instanceof MeshPhysicalMaterial || (m as unknown as { isMeshPhysicalMaterial?: boolean }).isMeshPhysicalMaterial) {
    const c = (m as MeshPhysicalMaterial).clone();
    c.vertexColors = false;
    return c;
  }
  const phys = new MeshPhysicalMaterial();
  MeshStandardMaterial.prototype.copy.call(phys, m);
  phys.vertexColors = false;
  return phys;
}

/**
 * Repairs missing or broken PBR material properties in the raw GLTF assets:
 * - Unassigned primitives (`mat.name === ""`) or empty GLTF material definitions
 *   that default to opaque flat white (`#ffffff`, `metalness: 1, roughness: 1`)
 * - Glass/lens materials with `KHR_materials_transmission` + white `baseColorFactor`
 *   that render as milky white sheets
 * - Materials missing `metallicFactor` in GLTF (which default to `metalness = 1.0`
 *   on rubber tires, leather interiors, etc.)
 * - Over-driven `KHR_materials_specular` (>1.0) and zero-roughness black trim
 */
function fixStaticMaterialDefaults(
  mat: MeshStandardMaterial,
  modelId?: string
): void {
  const m = (mat.name || "").toLowerCase();

  const disableTransmissionAndClampSpecular = () => {
    if (mat instanceof MeshPhysicalMaterial) {
      mat.transmission = 0;
      mat.transmissionMap = null;
      mat.thickness = 0;
      mat.ior = 1.5;
      mat.anisotropy = 0;
      mat.anisotropyMap = null;
      mat.sheen = 0;
      if (mat.sheenColor) mat.sheenColor.set("#000000");
      mat.sheenColorMap = null;
      mat.sheenRoughnessMap = null;
      mat.specularIntensity = Math.min(mat.specularIntensity, 0.5);
      mat.specularColor.set("#ffffff");
    }
  };

  // Unconditionally disable real-time screen-space refraction (transmission > 0)
  // so WebGLRenderer never allocates or renders a second full-scene transmission pass
  disableTransmissionAndClampSpecular();

  // Lamborghini Revuelto: preserve authored PBR textures (carbon fiber, tire maps, leathers, screens, metallic trim)
  if (modelId === "lamborghini-revuelto") {
    // 1. Transparent glass, windows, lenses, headlights:
    if (
      m === "headlight" ||
      m === "lens" ||
      m === "windows.001" ||
      m === "taillight_glass" ||
      m.includes("glass") ||
      m.includes("window")
    ) {
      disableTransmissionAndClampSpecular();
      if (m === "taillight_glass") {
        mat.color.set("#ff1818");
        mat.transparent = true;
        mat.opacity = 0.72;
      } else {
        mat.color.set("#1a1a20");
        mat.transparent = true;
        mat.opacity = 0.28;
      }
      mat.roughness = 0.05;
      mat.metalness = 0.1;
      mat.depthWrite = false;
      return;
    }

    // 2. Interior Corsatex velour/velvet: replace hot-pink sheen with luxurious Nero Corsatex
    if (m.includes("velour") || m.includes("velvet")) {
      mat.color.set("#1c1c20");
      mat.roughness = 0.92;
      mat.metalness = 0.0;
      if (mat instanceof MeshPhysicalMaterial) {
        mat.clearcoat = 0.0;
        mat.sheen = 0;
        if (mat.sheenColor) mat.sheenColor.set("#000000");
        mat.sheenColorMap = null;
        mat.sheenRoughnessMap = null;
        mat.anisotropy = 0;
        mat.anisotropyMap = null;
      }
      return;
    }

    // 3. Disable Draco-unsupported anisotropy and sheen on all other materials
    if (mat instanceof MeshPhysicalMaterial) {
      mat.anisotropy = 0;
      mat.anisotropyMap = null;
      mat.sheen = 0;
      if (mat.sheenColor) mat.sheenColor.set("#000000");
      mat.sheenColorMap = null;
      mat.sheenRoughnessMap = null;
      mat.specularIntensity = Math.min(mat.specularIntensity, 0.5);
    }

    // 4. DoubleSide for carbon fiber aero panels, trim, and mirrors
    if (m.includes("carbon") || m === "gloss-black") {
      mat.side = DoubleSide;
    }

    // 5. Keep all original GLTF textures, maps, normal maps, roughness/metalness for tires, carbon fiber, etc.
    return;
  }

  // 1. Unassigned primitives (`material: undefined` in GLTF) & white caliper pins
  if (m === "" || m === "white.002") {
    mat.color.set("#222226");
    mat.metalness = 0.85;
    mat.roughness = 0.25;
    return;
  }

  // 2. Red taillight lenses (including empty "Red car lights glass.001" on Porsche 911)
  if (
    m === "red car lights glass.001" ||
    m === "red-g" ||
    m === "red-g.001" ||
    m === "backlight glass" ||
    m === " tail lights.001" ||
    m.includes("tail lights") ||
    m.includes("taillight")
  ) {
    disableTransmissionAndClampSpecular();
    mat.color.set("#aa0808");
    mat.transparent = true;
    mat.opacity = 0.58;
    mat.roughness = 0.06;
    mat.metalness = 0.1;
    mat.depthWrite = false;
    return;
  }

  // 2b. Porsche 911 rear LED light bar ("tailligt_emired.003") & third brake light ("Material.040")
  //     Exported from Blender with white emissiveFactor [1,1,1] instead of crimson red.
  if (m === "tailligt_emired.003" || m === "material.040") {
    disableTransmissionAndClampSpecular();
    mat.color.set("#cc0000");
    mat.emissive.set("#ff0a0a");
    mat.emissiveIntensity = 2.0;
    mat.roughness = 0.15;
    mat.metalness = 0.1;
    return;
  }

  // 2c. Porsche 911 taillight/headlight internal housing ("tailligt.002", "tailligt_head light.001")
  //     and front bumper marker lights ("tailligt.003")
  if (m === "tailligt.002" || m === "tailligt_head light.001") {
    disableTransmissionAndClampSpecular();
    mat.color.set("#18080a");
    mat.roughness = 0.28;
    mat.metalness = 0.3;
    return;
  }
  if (m === "tailligt.003") {
    disableTransmissionAndClampSpecular();
    mat.color.set("#222226");
    mat.emissive.set("#ff6600");
    mat.emissiveIntensity = 0.35;
    mat.roughness = 0.2;
    mat.metalness = 0.2;
    return;
  }

  // 2d. Porsche 911 rear exhaust pipes ("Material.041") & internal headlight housing ("Car Paint PL.007")
  if (m === "material.041" || m === "car paint pl.007") {
    disableTransmissionAndClampSpecular();
    mat.color.set("#1e1e22");
    mat.metalness = 0.85;
    mat.roughness = 0.28;
    return;
  }

  // 3. Clear headlight lenses & internal light covers
  if (
    m === "headlight fog.001" ||
    m === "car windshield glass.001" ||
    m === "glass.001" ||
    m === "glass.002" ||
    m === "headlight_glass" ||
    m === "headlight" ||
    m === "lens" ||
    m === "matt glass"
  ) {
    disableTransmissionAndClampSpecular();
    mat.color.set("#1a1a20");
    mat.transparent = true;
    mat.opacity = 0.24;
    mat.roughness = 0.05;
    mat.metalness = 0.1;
    mat.depthWrite = false;
    return;
  }

  // 4. Opaque black window frit border on Porsche 911
  if (m === "black window.001") {
    disableTransmissionAndClampSpecular();
    mat.color.set("#0a0a0d");
    mat.transparent = false;
    mat.opacity = 1;
    mat.roughness = 0.2;
    mat.metalness = 0.1;
    return;
  }

  // 5. Cabin windows & windshields
  if (m.includes("glass") || m.includes("window") || m.includes("windshield")) {
    disableTransmissionAndClampSpecular();
    mat.color.set("#0d0f14");
    mat.transparent = true;
    mat.opacity = 0.32;
    mat.roughness = 0.05;
    mat.metalness = 0.2;
    mat.depthWrite = false;
    return;
  }

  // 6. Porsche 911 internal headlight components with missing GLTF PBR blocks
  if (m === "hardened mrtal.001") {
    mat.color.set("#18191c");
    mat.metalness = 0.8;
    mat.roughness = 0.3;
    return;
  }
  if (m === "material.030" || m === "noise illusion mirror.007") {
    mat.color.set("#d0d0d8");
    mat.metalness = 0.95;
    mat.roughness = 0.1;
    return;
  }
  if (m === "emmi.001") {
    mat.color.set("#ffffff");
    mat.emissive.set("#ffffff");
    mat.emissiveIntensity = 1.5;
    mat.metalness = 0;
    mat.roughness = 0.2;
    return;
  }

  // 7. Side-view mirror glass (empty `{}` in Porsche 911 GLTF)
  if (m === "mirrors.001" || m === "mirror") {
    mat.color.set("#d8d8e0");
    mat.metalness = 1.0;
    mat.roughness = 0.02;
    return;
  }

  // 8. Porsche 911 lower bumper & side-skirt black plastic trim
  if (m === "plastic for rim.001" || m === "mesi for rim.001") {
    mat.color.set("#121215");
    mat.metalness = 0.1;
    mat.roughness = 0.4;
    return;
  }

  // 9. Carbon fibre & un-UV'd metal meshes with missing baseColorFactor
  if (m === "carbon fibre.002") {
    mat.color.set("#18181b");
    mat.metalness = 0.25;
    mat.roughness = 0.25;
    return;
  }
  if (m === "metal.006") {
    mat.color.set("#777780");
    mat.metalness = 0.85;
    mat.roughness = 0.25;
    return;
  }

  // 10. Rubber tires across all models (R8 omits metallicFactor -> defaults to 1.0;
  //     Porsche 911 uses baseColorFactor [1,1,1] with a pale grey diffuse map and
  //     a 1-channel grayscale image plugged into normalTexture on TEXCOORD_1/2)
  if (
    m === "tire05_low" ||
    m === "tire" ||
    m === "tire02" ||
    m.includes("tire") ||
    m === "material.031" ||
    m === "material.032"
  ) {
    disableTransmissionAndClampSpecular();
    mat.map = null;
    mat.normalMap = null;
    mat.roughnessMap = null;
    mat.metalnessMap = null;
    mat.bumpMap = null;
    mat.color.set("#141416");
    mat.metalness = 0;
    mat.roughness = 0.85;
    if (mat instanceof MeshPhysicalMaterial) {
      mat.specularIntensity = 0.15;
      mat.specularColor.set("#ffffff");
    }
    mat.side = DoubleSide;
    return;
  }

  // 10b. Porsche 911 front bumper radiator behind louvers (untextured bright grey/white in GLTF)
  if (m === "radiator.001" || m === "radiator2.001" || m.includes("radiator")) {
    disableTransmissionAndClampSpecular();
    mat.map = null;
    mat.normalMap = null;
    mat.color.set("#161618");
    mat.metalness = 0.35;
    mat.roughness = 0.55;
    if (mat instanceof MeshPhysicalMaterial) {
      mat.specularIntensity = 0.2;
    }
    return;
  }

  // 11. Brake discs (avoid glowing white untextured rotors)
  if (m === "disk" || m === "disk.004") {
    mat.color.set("#55555a");
    mat.metalness = 0.8;
    mat.roughness = 0.3;
    return;
  }

  // 12. Chrome trim (roughness 0 in GLTF blows out to flat white under studio lighting)
  if (m === "chrome") {
    mat.color.set("#b0b0b8");
    mat.metalness = 0.9;
    mat.roughness = 0.18;
    return;
  }

  // 13. Audi R8 exterior rubber/satin-black trim (roughness 0 + specular > 1.45 in GLTF)
  if (m === "glossy-rubber" || m === "dark rubber inter") {
    disableTransmissionAndClampSpecular();
    mat.color.set("#141416");
    mat.metalness = 0.15;
    mat.roughness = 0.35;
    return;
  }

  // 14. Audi R8 & RS8 interior materials omit `metallicFactor` in the GLTF JSON
  //     (which causes Three.js GLTFLoader to default `metalness` to 1.0 without a metalnessMap).
  //     Resetting `metalness` to 0 preserves their original GLTF textures and colors.
  if (
    m === "seat-mtl" ||
    m === "dash-mtl.001" ||
    m === "door-mtl" ||
    m === "diff-mtl"
  ) {
    disableTransmissionAndClampSpecular();
    mat.metalness = 0.05;
    return;
  }

  // 15. Audi RS8 / R8 interior leathers, rubbers and plastics
  //     Clearcoat on faceted interior meshes causes harsh polygon glare; clamp to soft matte automotive leather.
  if (
    m.includes("artificial leather") ||
    m.includes("dark_rubber") ||
    m.includes("rubber-rugh") ||
    m === "black rubber glossy.001" ||
    m === "blue-rubber"
  ) {
    disableTransmissionAndClampSpecular();
    if (mat instanceof MeshPhysicalMaterial) {
      mat.clearcoat = 0;
      mat.clearcoatRoughness = 1;
    }
    mat.metalness = 0.05;
    mat.roughness = 0.65;
    return;
  }

  // 16. Porsche 911 interior: steering wheel rim, cockpit dashboard, cabin panels & console trim
  //     In the original GLTF asset (`Car_config3.glb`), the 3D model author mapped these materials
  //     (`mat.014`, `mat.017`, `mat.015`, `mat.010`, `mat_white.002`, `mat_white.003`, `mat_white_grey.001`)
  //     with `MN_chrome_dirt.jpg` as the baseColorTexture and `MN_Dust_3.jpg` as the roughness map.
  //     This caused the steering wheel and dashboard to reflect studio lights like crumpled tin foil / mirror chrome.
  //     Convert them to authentic Porsche 992 soft-touch matte Nappa leather, Race-Tex, and satin cockpit trim.
  if (
    m === "mat.014" ||
    m === "mat.015" ||
    m === "mat.010" ||
    m === "mat.017" ||
    m.startsWith("mat_white")
  ) {
    disableTransmissionAndClampSpecular();
    mat.map = null;
    mat.normalMap = null;
    mat.roughnessMap = null;
    mat.metalnessMap = null;
    mat.metalness = 0.0;
    mat.roughness = m === "mat.014" ? 0.82 : 0.85;
    mat.color.set(m === "mat.014" ? "#18181b" : "#1c1c20");
    if (mat instanceof MeshPhysicalMaterial) {
      mat.clearcoat = 0.0;
      mat.clearcoatRoughness = 1.0;
      mat.specularIntensity = 0.2;
    }
    return;
  }

  // 16b. Porsche 911 steering wheel spokes, hub surround, and interior metal trim
  if (m === "metal.009" || m === "metal.008") {
    disableTransmissionAndClampSpecular();
    mat.map = null;
    mat.normalMap = null;
    mat.roughnessMap = null;
    mat.metalnessMap = null;
    if (m === "metal.009") {
      // Steering wheel spokes & hub bezel: satin dark anodized aluminum (not raw mirror chrome)
      mat.color.set("#24252a");
      mat.metalness = 0.55;
      mat.roughness = 0.55;
    } else {
      // Interior door/pedal metal trim (`metal.008`): dark gunmetal satin finish
      mat.color.set("#2c2d32");
      mat.metalness = 0.65;
      mat.roughness = 0.45;
    }
    if (mat instanceof MeshPhysicalMaterial) {
      mat.clearcoat = 0.0;
      mat.clearcoatRoughness = 1.0;
      mat.specularIntensity = 0.3;
    }
    return;
  }

  // 16c. Porsche 911 paddle shifters & cockpit switchgear
  if (
    m === "glossy black.016" ||
    m === "mat.011" ||
    m === "mat.012" ||
    m === "mat.013"
  ) {
    disableTransmissionAndClampSpecular();
    mat.color.set("#161618");
    mat.metalness = 0.1;
    mat.roughness = 0.55;
    if (mat instanceof MeshPhysicalMaterial) {
      mat.clearcoat = 0.0;
      mat.specularIntensity = 0.25;
    }
    return;
  }

  // 17. Porsche 911 luxury leather seats and trim (`leather_white.006`)
  //     Clamp high specular so light doesn't blow out under studio lighting.
  if (m.startsWith("leather_white")) {
    disableTransmissionAndClampSpecular();
    if (mat instanceof MeshPhysicalMaterial) {
      mat.specularIntensity = 0.25;
    }
    mat.roughness = Math.max(mat.roughness, 0.55);
    return;
  }

  // 18. Chevrolet Corvette C8 interior leather & cockpit trim
  if (m.includes("interior-leather")) {
    disableTransmissionAndClampSpecular();
    if (mat instanceof MeshPhysicalMaterial) {
      mat.clearcoat = 0;
      mat.specularIntensity = 0.25;
    }
    mat.metalness = 0.05;
    mat.roughness = Math.max(mat.roughness, 0.6);
    return;
  }

  // 19. Chevrolet Corvette C8 & Lamborghini Revuelto lighting & screens
  if (m === "daylight") {
    disableTransmissionAndClampSpecular();
    mat.color.set("#ffffff");
    mat.emissive.set("#ffffff");
    mat.emissiveIntensity = 2.0;
    mat.roughness = 0.1;
    mat.metalness = 0.1;
    return;
  }
  if (
    m === "red color" ||
    m === "red emission" ||
    m === "back-light-tex"
  ) {
    disableTransmissionAndClampSpecular();
    mat.color.set("#aa0808");
    mat.emissive.set("#ff1111");
    mat.emissiveIntensity = 1.8;
    mat.roughness = 0.15;
    mat.metalness = 0.1;
    return;
  }
  if (m.includes("screen")) {
    disableTransmissionAndClampSpecular();
    mat.roughness = 0.25;
    mat.metalness = 0.1;
    mat.emissive.set("#1a202c");
    mat.emissiveIntensity = 0.6;
    return;
  }
  if (m === "rough-rubber") {
    disableTransmissionAndClampSpecular();
    mat.color.set("#18181b");
    mat.metalness = 0.05;
    mat.roughness = 0.7;
    return;
  }
  if (m === "smooth metal") {
    disableTransmissionAndClampSpecular();
    mat.color.set("#787882");
    mat.metalness = 0.85;
    mat.roughness = 0.28;
    return;
  }
  if (m === "wheel") {
    disableTransmissionAndClampSpecular();
    mat.color.set("#24252a");
    mat.metalness = 0.9;
    mat.roughness = 0.25;
    return;
  }
  if (m === "anisotropic metal") {
    disableTransmissionAndClampSpecular();
    mat.color.set("#888890");
    mat.metalness = 0.85;
    mat.roughness = 0.25;
    return;
  }
  if (m === "leather" || m === "black leather") {
    disableTransmissionAndClampSpecular();
    if (mat instanceof MeshPhysicalMaterial) {
      mat.clearcoat = 0;
      mat.clearcoatRoughness = 1;
      mat.specularIntensity = 0.25;
    }
    mat.metalness = 0.05;
    mat.roughness = Math.max(mat.roughness, 0.65);
    return;
  }
  if (m.includes("velour_velvet") || m.includes("velvet")) {
    disableTransmissionAndClampSpecular();
    mat.color.set("#18181c");
    mat.metalness = 0.05;
    mat.roughness = 0.85;
    return;
  }
  if (m === "logo 3" || m === "logo front") {
    disableTransmissionAndClampSpecular();
    mat.metalness = 0.8;
    mat.roughness = 0.25;
    return;
  }
}

function classifyMaterial(
  matName: string,
  partPath: string,
  paintMaterials: Set<string>,
): MaterialCategory {
  const m = matName.toLowerCase();
  void partPath;

  // Window frit stays static black
  if (m === "black window.001") return "other";

  if (
    m.includes("glass") ||
    m.includes("window") ||
    m.includes("windshield") ||
    m === "headlight fog.001" ||
    m === "lens"
  ) {
    return "glass";
  }

  // Porsche 911 bumper/skirt black plastic includes the substring "rim"
  // ("plastic for rim.001", "mesi for rim.001") and internal headlight housing
  // ("car paint pl.007") includes "paint" — never classify as wheel accent or body paint!
  if (
    m === "plastic for rim.001" ||
    m === "mesi for rim.001" ||
    m === "car paint pl.007"
  ) {
    return "other";
  }

  if (m.includes("caliper")) return "accent";

  if (paintMaterials.has(m)) {
    return "paint";
  }
  if (
    (m.includes("paint") && !m.includes("black paint")) ||
    m.includes("carpaint")
  ) {
    return "paint";
  }

  // Wheel rims & exterior accents
  if (
    m === "metal-black" ||
    m === "redtrim" ||
    m === "rubber-white"
  ) {
    return "accent";
  }

  return "other";
}

// ─── Draw-Call Optimization: Geometry Batching & Contact Shadow ───────────────

let sharedContactShadowTex: CanvasTexture | null = null;

function getCarContactShadowTexture(): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  if (sharedContactShadowTex) return sharedContactShadowTex;

  const w = 256;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, w, h);

  // Soft outer ambient occlusion penumbra around the vehicle footprint
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(1, h / w);
  const outerGrad = ctx.createRadialGradient(0, 0, w * 0.08, 0, 0, w * 0.48);
  outerGrad.addColorStop(0.0, "rgba(0, 0, 0, 0.92)");
  outerGrad.addColorStop(0.48, "rgba(0, 0, 0, 0.78)");
  outerGrad.addColorStop(0.72, "rgba(0, 0, 0, 0.32)");
  outerGrad.addColorStop(1.0, "rgba(0, 0, 0, 0.0)");
  ctx.fillStyle = outerGrad;
  ctx.beginPath();
  ctx.arc(0, 0, w * 0.48, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Deep core chassis contact occlusion + 4 tire contact patches
  const tirePositions = [
    [w * 0.27, h * 0.26],
    [w * 0.73, h * 0.26],
    [w * 0.27, h * 0.74],
    [w * 0.73, h * 0.74],
  ];
  for (const [tx, ty] of tirePositions) {
    const tGrad = ctx.createRadialGradient(tx, ty, 2, tx, ty, w * 0.14);
    tGrad.addColorStop(0.0, "rgba(0, 0, 0, 0.85)");
    tGrad.addColorStop(0.5, "rgba(0, 0, 0, 0.35)");
    tGrad.addColorStop(1.0, "rgba(0, 0, 0, 0.0)");
    ctx.fillStyle = tGrad;
    ctx.beginPath();
    ctx.arc(tx, ty, w * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }

  sharedContactShadowTex = new CanvasTexture(canvas);
  sharedContactShadowTex.needsUpdate = true;
  return sharedContactShadowTex;
}

/**
 * Merges static car meshes that share the exact same MeshPhysicalMaterial instance
 * and shadow flags into single combined BufferGeometries, reducing per-frame car
 * draw calls from 140–540 down to ~20–35 while keeping all dynamic paint and
 * wheel rim customization working at 100%.
 */
function mergeCarMeshesByMaterial(root: Object3D) {
  const savedPos = root.position.clone();
  const savedRot = root.rotation.clone();
  const savedScale = root.scale.clone();

  root.position.set(0, 0, 0);
  root.rotation.set(0, 0, 0);
  root.scale.set(1, 1, 1);
  root.updateMatrixWorld(true);

  interface BatchGroup {
    mat: MeshPhysicalMaterial;
    castShadow: boolean;
    receiveShadow: boolean;
    usesTextures: boolean;
    usesUv1: boolean;
    meshes: Mesh[];
  }

  const groups = new Map<string, BatchGroup>();

  root.traverse((child) => {
    if (!(child instanceof Mesh) || !child.geometry || !child.material) return;
    if (Array.isArray(child.material)) return;
    if (!(child.material instanceof MeshPhysicalMaterial)) return;

    const geom = child.geometry as BufferGeometry;
    if (!geom.index || !geom.attributes.position) return;

    const mat = child.material;
    const usesTextures = Boolean(
      mat.map ||
        mat.normalMap ||
        mat.roughnessMap ||
        mat.metalnessMap ||
        mat.aoMap ||
        mat.emissiveMap ||
        mat.bumpMap ||
        mat.alphaMap
    );
    const usesUv1 = Boolean(mat.aoMap || mat.lightMap);

    // If the material uses textures, ensure the mesh actually has a uv attribute
    if (usesTextures && !geom.attributes.uv) return;
    // Skip merging meshes that have secondary UV channels or extra vertex color channels
    if (geom.attributes.uv1 || geom.attributes.uv2 || geom.attributes.color_1) return;

    const posAttr = geom.attributes.position;
    // Keep large high-poly body/wheel meshes zero-copy in their Draco-decoded GPU buffers;
    // only CPU-merge small multi-part detail primitives (screws, vents, needles, trim <= 4,000 verts)
    if (posAttr.count > 4000) return;
    const uvAttr = usesTextures ? geom.attributes.uv : null;

    const attrSig = [
      `pos:${posAttr.itemSize}:${posAttr.normalized ? 1 : 0}:${posAttr.array.constructor.name}`,
      uvAttr
        ? `uv:${uvAttr.itemSize}:${uvAttr.normalized ? 1 : 0}:${uvAttr.array.constructor.name}`
        : "nouv",
    ].join("|");

    const key = `${mat.uuid}|${child.castShadow ? 1 : 0}|${child.receiveShadow ? 1 : 0}|${attrSig}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        mat,
        castShadow: child.castShadow,
        receiveShadow: child.receiveShadow,
        usesTextures,
        usesUv1,
        meshes: [],
      };
      groups.set(key, group);
    }
    group.meshes.push(child);
  });

  const mergedContainer = new Group();
  mergedContainer.name = "MergedCarBatches";

  groups.forEach((group) => {
    if (group.meshes.length < 2) return;

    const transformedGeoms: BufferGeometry[] = [];
    for (let i = 0; i < group.meshes.length; i++) {
      const mesh = group.meshes[i];
      const g = mesh.geometry.clone();

      if (!g.attributes.normal) {
        g.computeVertexNormals();
      }

      // Strip any extra/mismatched attributes so all geometries in the batch have identical layout
      const keepAttrs = new Set(["position", "normal"]);
      if (group.usesTextures && g.attributes.uv) keepAttrs.add("uv");
      if (group.usesUv1 && g.attributes.uv1) keepAttrs.add("uv1");

      for (const attrName of Object.keys(g.attributes)) {
        if (!keepAttrs.has(attrName)) {
          g.deleteAttribute(attrName);
        }
      }

      // Ensure normal is Float32Array (3 components, non-normalized)
      const normAttr = g.attributes.normal;
      if (
        normAttr.itemSize !== 3 ||
        normAttr.normalized ||
        !(normAttr.array instanceof Float32Array)
      ) {
        g.deleteAttribute("normal");
        g.computeVertexNormals();
      }

      g.applyMatrix4(mesh.matrixWorld);

      // If the mesh had negative scale (mirrored half), flip triangle winding order
      // so front-face orientation matches standard CCW winding in the merged mesh
      if (mesh.matrixWorld.determinant() < 0 && g.index) {
        const idxClone = g.index.clone();
        const arr = idxClone.array;
        for (let j = 0; j + 2 < arr.length; j += 3) {
          const tmp = arr[j + 1];
          arr[j + 1] = arr[j + 2];
          arr[j + 2] = tmp;
        }
        g.setIndex(idxClone);
      }

      g.clearGroups();
      g.morphAttributes = {};
      transformedGeoms.push(g);
    }

    try {
      const mergedGeom = mergeGeometries(transformedGeoms, false);
      if (mergedGeom) {
        const mergedMesh = new Mesh(mergedGeom, group.mat);
        mergedMesh.name = `Merged_${group.mat.name || "Batch"}`;
        mergedMesh.castShadow = group.castShadow;
        mergedMesh.receiveShadow = group.receiveShadow;
        mergedContainer.add(mergedMesh);

        for (let i = 0; i < group.meshes.length; i++) {
          const m = group.meshes[i];
          if (m.parent) m.parent.remove(m);
        }
      }
    } catch {
      // Fallback: keep original unmerged meshes if mergeGeometries fails for any group
    } finally {
      for (let i = 0; i < transformedGeoms.length; i++) {
        transformedGeoms[i].dispose();
      }
    }
  });

  if (mergedContainer.children.length > 0) {
    root.add(mergedContainer);
  }

  root.position.copy(savedPos);
  root.rotation.copy(savedRot);
  root.scale.copy(savedScale);
  root.updateMatrixWorld(true);
}

// ─── Module-level cache of processed car scenes for instant (0ms) model switching ─

interface ProcessedCarScene {
  scene: Object3D;
  targetScale: number;
  contactShadowMesh: Mesh | null;
}

const processedCarSceneCache = new Map<string, ProcessedCarScene>();

// ─── Model component ──────────────────────────────────────────────────────────

export function Model({
  config,
  onFirstPaint,
  carRotationRef,
  isDraggingCarRef,
}: {
  config: ConfigState;
  onFirstPaint?: () => void;
  carRotationRef?: React.MutableRefObject<number>;
  isDraggingCarRef?: React.MutableRefObject<boolean>;
}) {
  "use no memo";
  const { gl } = useThree();
  const wrapperRef = useRef<Group>(null!);
  const modelInfo =
    MODELS.find((m) => m.id === config.selectedModel) || MODELS[0];

  const gltfResult = useGLTF(modelInfo.url, "/draco/", true, (loader) =>
    setupLoaders(loader as GLTFLoader, gl)
  );

  const { scene, targetScale, contactShadowMesh } = useMemo(() => {
    const cached = processedCarSceneCache.get(modelInfo.id);
    if (cached) return cached;

    const root = gltfResult.scene.clone(true);

    const paintSet = new Set<MeshPhysicalMaterial>();
    const accentSet = new Set<MeshPhysicalMaterial>();
    const clonedByOrig = new Map<MeshStandardMaterial, MeshPhysicalMaterial>();
    const specialClones = new Map<string, MeshPhysicalMaterial>();
    const dedupedStaticMats = new Map<string, MeshPhysicalMaterial>();
    const extraPaintNames = new Set(
      (modelInfo.paintMaterials ?? []).map((n) => n.toLowerCase())
    );

    const getSpecialClone = (
      key: string,
      baseMat: MeshPhysicalMaterial,
      setup: (clone: MeshPhysicalMaterial) => void
    ): MeshPhysicalMaterial => {
      let c = specialClones.get(key);
      if (!c) {
        c = baseMat.clone();
        setup(c);
        specialClones.set(key, c);
      }
      return c;
    };

    const applyMetallicWheelFinish = (mat: MeshPhysicalMaterial) => {
      mat.metalness = 0.95;
      mat.roughness = 0.16;
      mat.clearcoat = 0.6;
      mat.clearcoatRoughness = 0.1;
      mat.envMapIntensity = 1.5;
      mat.specularIntensity = 1.0;
      mat.specularColor.set("#ffffff");
      mat.side = DoubleSide;
      accentSet.add(mat);
    };

    root.traverse((child) => {
      if (child instanceof Mesh && child.material) {
        child.castShadow = true;
        child.receiveShadow = true;

        const partPath = getPartPath(child, root);

        // Strip Blender vertex color ID masks (COLOR_0 / COLOR_1) so they never tint KTX2 textures or materials
        if (child.geometry) {
          if (child.geometry.attributes.color) child.geometry.deleteAttribute("color");
          if (child.geometry.attributes.color_1) child.geometry.deleteAttribute("color_1");
        }

        // Only compute vertex normals if the GLB primitive is missing a NORMAL attribute
        if (child.geometry && !child.geometry.attributes.normal) {
          child.geometry.computeVertexNormals();
        }
        // Special Case: Lamborghini Revuelto rear air intake grille under the taillight
        // (`Subdiv#45_symmetric`) has unassigned material in GLTF.
        // Assign authentic dark satin honeycomb/grille material.
        if (
          modelInfo.id === "lamborghini-revuelto" &&
          (child.name.includes("010") ||
            child.name.includes("247") ||
            partPath.includes("010") ||
            partPath.includes("247") ||
            partPath.includes("45"))
        ) {
          const grilleMat = getSpecialClone("lamborghini-rear-grille", new MeshPhysicalMaterial(), (clone) => {
            clone.name = "Lamborghini-Rear-Grille";
            clone.color.set("#161619");
            clone.roughness = 0.85;
            clone.metalness = 0.15;
            clone.clearcoat = 0.0;
            clone.side = DoubleSide;
          });
          child.material = grilleMat;
          return;
        }

        const rawMats = Array.isArray(child.material) ? child.material : [child.material];
        const clonedMats = rawMats.map((m) => {
          if (m instanceof MeshStandardMaterial) {
            let mat = clonedByOrig.get(m);
            if (!mat) {
              mat = cloneAsPhysicalMaterial(m);
              fixStaticMaterialDefaults(mat, modelInfo.id);
              clonedByOrig.set(m, mat);
            }

            const matNameLower = (mat.name || "").toLowerCase();

            // Special Case A: Porsche 911 wheel rims use "glossy black.013" on wheel
            // nodes (`flwheel002`, `frwheel002`, `bwheels002`), while body trim also
            // uses "glossy black.013". Clone it on wheel nodes so "Wheel Finish"
            // colors all 4 rims without affecting body window/bumper trim.
            if (
              matNameLower === "glossy black.013" &&
              (partPath.includes("wheel") || partPath.includes("bwheels"))
            ) {
              return getSpecialClone("porsche-wheel-rim", mat, (clone) => {
                applyMetallicWheelFinish(clone);
              });
            }

            // Special Case B: Audi RS6 `WholeBody` lower splitter/side skirts share
            // "Rubber-white" with `Rims.001`. Keep `WholeBody` dark satin trim so
            // wheel finish does not bleed onto the lower body panels.
            if (
              matNameLower === "rubber-white" &&
              partPath.includes("wholebody")
            ) {
              return getSpecialClone("rs6-lower-trim", mat, (clone) => {
                clone.color.set("#141416");
                clone.metalness = 0.2;
                clone.roughness = 0.35;
              });
            }

            // Special Case C: Audi RS6 `Dashboard` uses "Chrome" on 49k interior
            // vertices; keep dashboard trim dark brushed aluminum instead of bright chrome.
            if (
              matNameLower === "chrome" &&
              partPath.includes("dashboard")
            ) {
              return getSpecialClone("dashboard-dark-chrome", mat, (clone) => {
                clone.color.set("#28282e");
                clone.metalness = 0.7;
                clone.roughness = 0.35;
              });
            }

            // Special Case D: Porsche 911 rear emblems (`blogo002` "911 Carrera 4S",
            // `text001` & `text011` "PORSCHE") use "glossy black.013". Give them a
            // satin chrome/silver finish so the rear badging is legible.
            if (
              matNameLower === "glossy black.013" &&
              (partPath.includes("blogo") ||
                partPath.includes("text001") ||
                partPath.includes("text011"))
            ) {
              return getSpecialClone("porsche-rear-emblem", mat, (clone) => {
                clone.color.set("#d4d8dd");
                clone.metalness = 0.9;
                clone.roughness = 0.18;
              });
            }

            // Special Case E: Chevrolet Corvette C8 wheel rims use "Black-METAL" on wheel
            // nodes (`Circle.004`, `Circle.014`). Clone it on wheel nodes so "Wheel Finish"
            // colors all 4 rims without affecting other trim.
            if (
              matNameLower === "black-metal" &&
              (partPath.includes("circle.004") ||
                partPath.includes("circle.014") ||
                partPath.includes("wheel"))
            ) {
              return getSpecialClone("corvette-wheel-rim", mat, (clone) => {
                applyMetallicWheelFinish(clone);
              });
            }

            // Special Case F: Lamborghini Revuelto wheel rims use "Smooth Metal" on wheel rim
            // nodes (`Subdiv#85_symmetric` front, `Subdiv#110_symmetric` rear).
            // Clone it on wheel nodes so "Wheel Finish" colors all 4 rims without affecting
            // brake calipers (`Subdiv#94`, `Subdiv#99`) or discs (`Subdiv#86`, `Subdiv#106`).
            if (
              modelInfo.id === "lamborghini-revuelto" &&
              matNameLower === "smooth metal" &&
              (partPath.includes("004") ||
                partPath.includes("008") ||
                partPath.includes("110") ||
                partPath.includes("85") ||
                partPath.includes("249") ||
                partPath.includes("253"))
            ) {
              return getSpecialClone("lamborghini-wheel-rim", mat, (clone) => {
                applyMetallicWheelFinish(clone);
              });
            }

            const cat = classifyMaterial(
              mat.name || "",
              partPath,
              extraPaintNames
            );

            if (cat === "paint") {
              // If the model shares its body paint material with brake calipers
              // (e.g. Porsche 911 `Material.022` on `caliper front` and `bwheels`),
              // give calipers their own clone in `accentSet`.
              if (
                partPath.includes("caliper") ||
                partPath.includes("bwheels")
              ) {
                return getSpecialClone(`caliper-${matNameLower}`, mat, (clone) => {
                  applyMetallicWheelFinish(clone);
                });
              }
              // Realistic automotive metallic paint: metallic flake basecoat + glossy clearcoat lacquer
              mat.metalness = 0.68;
              mat.roughness = 0.22;
              mat.clearcoat = 1.0;
              mat.clearcoatRoughness = 0.04;
              mat.envMapIntensity = 1.25;
              paintSet.add(mat);
            } else if (cat === "accent") {
              applyMetallicWheelFinish(mat);
            } else {
              // Deduplicate untextured static materials with identical PBR parameters
              // (e.g. Porsche 911 has 120 Blender materials where many are identical matte/metal/plastic)
              const hasAnyTexture = Boolean(
                mat.map ||
                  mat.normalMap ||
                  mat.roughnessMap ||
                  mat.metalnessMap ||
                  mat.aoMap ||
                  mat.emissiveMap ||
                  mat.bumpMap ||
                  mat.alphaMap
              );
              if (!hasAnyTexture) {
                const matSig = [
                  cat,
                  mat.color.getHexString(),
                  mat.emissive.getHexString(),
                  mat.emissiveIntensity.toFixed(2),
                  mat.roughness.toFixed(2),
                  mat.metalness.toFixed(2),
                  mat.clearcoat.toFixed(2),
                  mat.clearcoatRoughness.toFixed(2),
                  mat.transmission.toFixed(2),
                  mat.ior.toFixed(2),
                  mat.opacity.toFixed(2),
                  mat.transparent ? 1 : 0,
                  mat.depthWrite ? 1 : 0,
                  mat.side,
                  mat.envMapIntensity.toFixed(2),
                  mat.specularIntensity.toFixed(2),
                ].join("|");
                let sharedMat = dedupedStaticMats.get(matSig);
                if (!sharedMat) {
                  dedupedStaticMats.set(matSig, mat);
                  sharedMat = mat;
                } else {
                  clonedByOrig.set(m, sharedMat);
                  return sharedMat;
                }
              }
            }

            return mat;
          }
          return m;
        });

        // Selective shadow casting: skip shadow map rendering for transparent glass,
        // interior cabin gauges/trim, and small badges/bolts inside wheels
        const isGlassMesh = clonedMats.some(
          (cm) =>
            cm instanceof MeshPhysicalMaterial &&
            (cm.transparent || cm.transmission > 0.05 || cm.opacity < 0.95)
        );
        const isNonShadowDetail =
          partPath.includes("dash") ||
          partPath.includes("steer") ||
          partPath.includes("carpet") ||
          partPath.includes("inter") ||
          partPath.includes("speedometer") ||
          partPath.includes("display") ||
          partPath.includes("logo") ||
          partPath.includes("text") ||
          partPath.includes("caliper") ||
          partPath.includes("disk") ||
          partPath.includes("brake") ||
          partPath.includes("bolt") ||
          partPath.includes("spring");

        child.castShadow = !isGlassMesh && !isNonShadowDetail;
        child.receiveShadow = !isGlassMesh;

        child.material = Array.isArray(child.material) ? clonedMats : clonedMats[0];
      }
    });

    // Rebuild missing halves before computing bounding box and centering
    if (modelInfo.symmetry) {
      restoreSymmetry(root, modelInfo.symmetry);
    }

    // Porsche 911 has multi-primitive groups (`lowerbody002`, `front_glass002`, `doors002`)
    // where specific child primitives (right side skirt, right headlight DRL/reflector,
    // right door handle/carbon trim) were exported on +X only. Mirror those leaf meshes across X=0.
    if (modelInfo.id === "porsche-911") {
      root.updateMatrixWorld(true);
      const multiPrimGroups = ["lowerbody002", "front_glass002", "doors002"];
      const primBox = new Box3();
      multiPrimGroups.forEach((groupName) => {
        const grp = root.getObjectByName(groupName);
        if (!grp) return;
        [...grp.children].forEach((child) => {
          if (!(child instanceof Mesh)) return;
          primBox.setFromObject(child);
          // In local mesh space of Porsche 911, X=0 is the vehicle centerline
          child.geometry.computeBoundingBox();
          const gBox = child.geometry.boundingBox;
          if (gBox && gBox.min.x >= -0.01 && gBox.max.x > 0.2) {
            const mirroredMesh = child.clone();
            mirroredMesh.name = `${child.name}_mirror`;
            mirroredMesh.scale.x *= -1;
            grp.add(mirroredMesh);
          }
        });
      });
    }

    // Batch static car meshes sharing the same material to reduce draw calls by 80-90%
    mergeCarMeshesByMaterial(root);

    root.rotation.x = modelInfo.rotationX || 0;
    root.rotation.y = modelInfo.rotationY || 0;

    const box = new Box3().setFromObject(root);
    const center = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = (250 / maxDim) * modelInfo.scale;

    // Center model on ground plane
    root.position.set(-center.x, -box.min.y, -center.z);

    // Create a 1-draw-call baked under-chassis contact shadow plane in wrapper space
    const shadowTex = getCarContactShadowTexture();
    let shadowMesh: Mesh | null = null;
    if (shadowTex) {
      const isXLonger = size.x > size.z;
      const minorSpan = Math.min(size.x, size.z) * 1.38;
      const majorSpan = Math.max(size.x, size.z) * 1.28;
      shadowMesh = new Mesh(
        new PlaneGeometry(minorSpan, majorSpan),
        new MeshBasicMaterial({
          map: shadowTex,
          transparent: true,
          opacity: 0.92,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
        })
      );
      shadowMesh.name = "CarContactShadowPlane";
      shadowMesh.rotation.set(-Math.PI / 2, 0, isXLonger ? Math.PI / 2 : 0);
      shadowMesh.position.set(0, 0.04 / scale, 0);
      shadowMesh.castShadow = false;
      shadowMesh.receiveShadow = false;
    }

    root.userData.paintMaterials = Array.from(paintSet);
    root.userData.accentMaterials = Array.from(accentSet);

    const processed: ProcessedCarScene = {
      scene: root,
      targetScale: scale,
      contactShadowMesh: shadowMesh,
    };
    processedCarSceneCache.set(modelInfo.id, processed);
    return processed;
  }, [gltfResult, modelInfo]);

  // Target colors for smooth Three.js frame-by-frame lerping
  const targetPaintColor = useRef(new Color(config.mainColor));
  const targetAccentColor = useRef(new Color(config.accentColor));
  const activeModelIdRef = useRef<string | null>(null);
  const needsImmediateColorSyncRef = useRef(true);
  const lastAppliedMatteRef = useRef<boolean | null>(null);
  const lastShadowRotYRef = useRef<number>(NaN);
  const lastShadowScaleRef = useRef<number>(NaN);

  // Update target colors when user picks swatches
  useEffect(() => {
    targetPaintColor.current.set(config.mainColor);
  }, [config.mainColor]);

  useEffect(() => {
    targetAccentColor.current.set(config.accentColor);
  }, [config.accentColor]);

  // Immediately apply matte vs metallic PBR finish whenever mattePaint, mainColor, or scene changes
  useEffect(() => {
    const isMatte = Boolean(config.mattePaint);
    lastAppliedMatteRef.current = isMatte;
    targetPaintColor.current.set(config.mainColor);
    const paintMats = (scene?.userData?.paintMaterials as MeshPhysicalMaterial[]) || EMPTY_MATS;
    for (let i = 0; i < paintMats.length; i++) {
      const mat = paintMats[i];
      if (isMatte) {
        mat.metalness = 0.0;
        mat.roughness = 0.9;
        mat.clearcoat = 0.0;
        mat.clearcoatRoughness = 0.0;
        mat.specularIntensity = 0.12;
        mat.envMapIntensity = 0.3;
        mat.metalnessMap = null;
        mat.roughnessMap = null;
      } else {
        mat.metalness = 0.68;
        mat.roughness = 0.22;
        mat.clearcoat = 1.0;
        mat.clearcoatRoughness = 0.04;
        mat.specularIntensity = 1.0;
        mat.envMapIntensity = 1.25;
      }
      mat.needsUpdate = true;
    }
  }, [scene, config.mattePaint, config.mainColor, config.selectedModel]);

  // When switching models, flag immediate sync without mutating local variables in effect
  useEffect(() => {
    if (activeModelIdRef.current !== modelInfo.id) {
      activeModelIdRef.current = modelInfo.id;
      needsImmediateColorSyncRef.current = true;
      lastAppliedMatteRef.current = null;
      targetPaintColor.current.set(config.mainColor);
      targetAccentColor.current.set(config.accentColor);
    }

    if (onFirstPaint) onFirstPaint();
  }, [modelInfo.id, config.mainColor, config.accentColor, onFirstPaint]);

  // Reset scale and manual rotation on model switch for grow animation
  useEffect(() => {
    if (wrapperRef.current) {
      wrapperRef.current.scale.set(0, 0, 0);
    }
    if (carRotationRef) {
      carRotationRef.current = 0;
    }
  }, [config.selectedModel, carRotationRef]);

  useFrame((state, delta) => {
    if (!wrapperRef.current) return;

    // Smooth rotation (shortest-path alignment to 0 in interior mode so cockpit camera aligns cleanly)
    if (config.viewMode === "interior") {
      let curY = wrapperRef.current.rotation.y % (Math.PI * 2);
      if (curY > Math.PI) curY -= Math.PI * 2;
      if (curY < -Math.PI) curY += Math.PI * 2;
      wrapperRef.current.rotation.y = curY;
      easing.damp(wrapperRef.current.rotation, "y", 0, 0.2, delta);
      if (carRotationRef) carRotationRef.current = 0;
    } else {
      if (config.isAnimated && !isDraggingCarRef?.current) {
        wrapperRef.current.rotation.y += delta * 0.15;
        if (carRotationRef) carRotationRef.current = wrapperRef.current.rotation.y;
      } else {
        const targetRotationY = carRotationRef
          ? carRotationRef.current
          : config.rotationY;
        easing.damp(
          wrapperRef.current.rotation,
          "y",
          targetRotationY,
          0.12,
          delta,
        );
      }
    }

    // Smooth scale entrance (gated so it skips once targetScale is reached)
    if (Math.abs(wrapperRef.current.scale.x - targetScale) > 0.001) {
      easing.damp(wrapperRef.current.scale, "x", targetScale, 0.2, delta);
      easing.damp(wrapperRef.current.scale, "y", targetScale, 0.2, delta);
      easing.damp(wrapperRef.current.scale, "z", targetScale, 0.2, delta);
    }

    // Only re-render the spotlight shadow map when the car's rotation or scale changes
    const curRotY = wrapperRef.current.rotation.y;
    const curScale = wrapperRef.current.scale.x;
    if (
      Math.abs(curRotY - lastShadowRotYRef.current) > 0.0008 ||
      Math.abs(curScale - lastShadowScaleRef.current) > 0.002
    ) {
      lastShadowRotYRef.current = curRotY;
      lastShadowScaleRef.current = curScale;
      state.gl.shadowMap.needsUpdate = true;
    }

    const carRoot = wrapperRef.current.children[0];
    const paintMats = (carRoot?.userData?.paintMaterials as MeshPhysicalMaterial[]) || EMPTY_MATS;
    const accentMats = (carRoot?.userData?.accentMaterials as MeshPhysicalMaterial[]) || EMPTY_MATS;

    // Immediate initial color sync on model load / switch
    if (needsImmediateColorSyncRef.current) {
      needsImmediateColorSyncRef.current = false;
      for (let i = 0; i < paintMats.length; i++) {
        paintMats[i].color.copy(targetPaintColor.current);
      }
      for (let i = 0; i < accentMats.length; i++) {
        accentMats[i].color.copy(targetAccentColor.current);
      }
    }

    // Reactively update matte vs metallic PBR material finish
    if (lastAppliedMatteRef.current !== config.mattePaint) {
      lastAppliedMatteRef.current = config.mattePaint ?? false;
      const isMatte = Boolean(config.mattePaint);
      for (let i = 0; i < paintMats.length; i++) {
        const mat = paintMats[i];
        if (isMatte) {
          mat.metalness = 0.0;
          mat.roughness = 0.9;
          mat.clearcoat = 0.0;
          mat.clearcoatRoughness = 0.0;
          mat.specularIntensity = 0.12;
          mat.envMapIntensity = 0.3;
          mat.metalnessMap = null;
          mat.roughnessMap = null;
        } else {
          mat.metalness = 0.68;
          mat.roughness = 0.22;
          mat.clearcoat = 1.0;
          mat.clearcoatRoughness = 0.04;
          mat.specularIntensity = 1.0;
          mat.envMapIntensity = 1.25;
        }
        mat.needsUpdate = true;
      }
    }

    // Smooth color lerping transitions using Three.js dampC (uses 1e-8 threshold so dark linear-sRGB swatches never stall)
    if (paintMats.length > 0) {
      const pColor = paintMats[0].color;
      const tColor = targetPaintColor.current;
      const diffSq =
        (pColor.r - tColor.r) ** 2 +
        (pColor.g - tColor.g) ** 2 +
        (pColor.b - tColor.b) ** 2;
      if (diffSq > 1e-8) {
        const colorSmoothTime = 0.2;
        for (let i = 0; i < paintMats.length; i++) {
          easing.dampC(
            paintMats[i].color,
            tColor,
            colorSmoothTime,
            delta,
          );
        }
      } else if (diffSq > 0) {
        for (let i = 0; i < paintMats.length; i++) {
          paintMats[i].color.copy(tColor);
        }
      }
    }
    if (accentMats.length > 0) {
      const aColor = accentMats[0].color;
      const tColor = targetAccentColor.current;
      const diffSq =
        (aColor.r - tColor.r) ** 2 +
        (aColor.g - tColor.g) ** 2 +
        (aColor.b - tColor.b) ** 2;
      if (diffSq > 1e-8) {
        const colorSmoothTime = 0.2;
        for (let i = 0; i < accentMats.length; i++) {
          easing.dampC(
            accentMats[i].color,
            tColor,
            colorSmoothTime,
            delta,
          );
        }
      } else if (diffSq > 0) {
        for (let i = 0; i < accentMats.length; i++) {
          accentMats[i].color.copy(tColor);
        }
      }
    }
  });

  return (
    <group ref={wrapperRef} scale={0}>
      <primitive object={scene} dispose={null} />
      {contactShadowMesh && <primitive object={contactShadowMesh} dispose={null} />}
    </group>
  );
}

// ─── Showroom Environment (Cube interior from ShowRoom.gltf) ──────────────────

// Car_config3 (Porsche 911, 4.52m long) is scaled to 250 scene units (250 / 4.52 ≈ 55.31).
// In the original Blender scene, the car sits inside the "Cube" showroom directly beneath
// "Superloop Light 200" at [3.458809, 5.9796085, 13.259531], where Y = 5.9796085 is the
// exact floor height of the "Cube" mesh.
const SHOWROOM_SCALE = 55.31;
const SHOWROOM_OFFSET: [number, number, number] = [
  -3.458809,
  -5.9796085,
  -13.259531,
];

/**
 * Generates a tileable matte white architectural plaster/micro-cement diffuse
 * and bump texture for the "Cube" showroom interior.
 */
function createMatteWhiteShowroomTextures(): {
  diffuseMap: CanvasTexture | null;
  bumpMap: CanvasTexture | null;
} {
  if (typeof document === "undefined") {
    return { diffuseMap: null, bumpMap: null };
  }

  const size = 512;
  const diffCanvas = document.createElement("canvas");
  diffCanvas.width = size;
  diffCanvas.height = size;
  const diffCtx = diffCanvas.getContext("2d");

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bumpCtx = bumpCanvas.getContext("2d");

  if (!diffCtx || !bumpCtx) {
    return { diffuseMap: null, bumpMap: null };
  }

  const diffImg = diffCtx.createImageData(size, size);
  const bumpImg = bumpCtx.createImageData(size, size);
  const dData = diffImg.data;
  const bData = bumpImg.data;

  // Deterministic pseudo-random generator for clean, seamless-feeling matte grain
  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Uniform fine-grain matte architectural finish around mid gray (#80848a) with zero tiling wave
      const micro = (rand() - 0.5) * 4;
      const val = Math.max(124, Math.min(136, Math.round(130 + micro)));

      dData[idx] = val;
      dData[idx + 1] = val + 2;
      dData[idx + 2] = val + 5;
      dData[idx + 3] = 255;

      const bVal = Math.max(0, Math.min(255, Math.round(128 + micro * 4)));
      bData[idx] = bVal;
      bData[idx + 1] = bVal;
      bData[idx + 2] = bVal;
      bData[idx + 3] = 255;
    }
  }

  diffCtx.putImageData(diffImg, 0, 0);
  bumpCtx.putImageData(bumpImg, 0, 0);

  const diffuseMap = new CanvasTexture(diffCanvas);
  diffuseMap.colorSpace = SRGBColorSpace;
  diffuseMap.wrapS = RepeatWrapping;
  diffuseMap.wrapT = RepeatWrapping;
  diffuseMap.needsUpdate = true;

  const bumpMap = new CanvasTexture(bumpCanvas);
  bumpMap.wrapS = RepeatWrapping;
  bumpMap.wrapT = RepeatWrapping;
  bumpMap.needsUpdate = true;

  return { diffuseMap, bumpMap };
}

/**
 * Computes the reactive showroom interior wall and atmosphere color based on the
 * current vehicle body paint.
 * - Dark / Stealth paints (e.g. Obsidian Black): deep dramatic studio charcoal/black
 * - High-key / White paints: clean, bright architectural gallery white
 * - Chromatic paints (Java Green, Misano Red, Navarra Blue, Sambarot Orange):
 *   sophisticated architectural studio tint harmonizing with the car's body color.
 */
function getShowroomColorForCar(carHex: string): Color {
  const c = new Color(carHex);
  const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  const result = new Color();

  if (lum < 0.12) {
    // Dark / stealth paint: dark studio charcoal with subtle tint of car hue
    const baseDark = 0.13 + lum * 0.4;
    result.setRGB(
      baseDark * 0.82 + c.r * 0.18,
      baseDark * 0.82 + c.g * 0.18,
      baseDark * 0.82 + c.b * 0.18
    );
  } else if (lum > 0.75) {
    // Bright / white paint: clean, crisp gallery off-white
    const baseLight = 0.78 + (lum - 0.75) * 0.45;
    result.setRGB(
      baseLight * 0.88 + c.r * 0.12,
      baseLight * 0.88 + c.g * 0.12,
      baseLight * 0.88 + c.b * 0.12
    );
  } else {
    // Chromatic / mid-tone paint: luxury architectural studio tint
    // Neutral mid-gray base (~0.44) blended with 38% car color
    const baseGray = 0.44;
    result.setRGB(
      baseGray * 0.62 + c.r * 0.38,
      baseGray * 0.62 + c.g * 0.38,
      baseGray * 0.62 + c.b * 0.38
    );
  }

  return result;
}

export function Showroom({
  lightIntensity,
  mainColor = "#0a0a0a",
}: {
  lightIntensity: number;
  mainColor?: string;
}) {
  const { gl } = useThree();

  const gltfResult = useGLTF(
    "/cars/ShowRoom.glb",
    "/draco/",
    true,
    (loader) => setupLoaders(loader as GLTFLoader, gl)
  );
  const logoResult = useGLTF(
    "/cars/CustomlyDrasonLogo.glb",
    "/draco/",
    true,
    (loader) => setupLoaders(loader as GLTFLoader, gl)
  );

  const { scene } = useMemo(() => {
    const root = gltfResult.scene.clone(true);
    const logoRoot = logoResult.scene.clone(true);
    const textNode = logoRoot.getObjectByName("Text") || logoRoot.children[0];
    if (textNode && (textNode as Mesh).geometry) {
      // Center the 3D Drason text geometry at origin so positioning is exact
      (textNode as Mesh).geometry.center();

      // Mount flush on the left showroom wall at eye level, scaled cleanly
      logoRoot.rotation.set(0, Math.PI / 2, 0);
      logoRoot.scale.setScalar(0.48);
      logoRoot.position.set(-6.94, 7.55, 11.2);
    }
    root.add(logoRoot);

    const clonedByOrig = new Map<MeshStandardMaterial, MeshPhysicalMaterial>();
    const emissiveSet = new Set<MeshPhysicalMaterial>();
    const logoMats: MeshPhysicalMaterial[] = [];

    const { diffuseMap, bumpMap } = createMatteWhiteShowroomTextures();

    // Mid-gray matte textured interior material for the "Cube" showroom mesh.
    // Rendering `BackSide` flips normals inward for proper interior lighting and
    // automatically culls exterior walls if the camera orbits outside the room.
    const cubeInteriorMat = new MeshPhysicalMaterial({
      name: "ShowroomCubeInterior",
      color: "#80848a",
      map: diffuseMap,
      bumpMap: bumpMap,
      bumpScale: 0.015,
      roughness: 0.96,
      metalness: 0.0,
      clearcoat: 0.0,
      specularIntensity: 0.04,
      envMapIntensity: 0.12,
      side: BackSide,
    });

    root.traverse((child) => {
      const isMeshObj =
        child instanceof Mesh ||
        Boolean((child as unknown as { isMesh?: boolean }).isMesh);
      if (!isMeshObj) return;
      const mesh = child as Mesh;

      const partPath = getPartPath(mesh, root);
      const isCubeRoom = mesh.name === "Cube" || partPath.includes("cube");
      const isLogo =
        mesh.name.toLowerCase().includes("text") ||
        partPath.toLowerCase().includes("text") ||
        (mesh.parent && mesh.parent.name.toLowerCase().includes("text"));

      if (isCubeRoom) {
        // Compute uniform world-scale box-projected UVs on Cube so the matte white
        // texture tiles evenly across the floor, walls, and ceiling without stretching.
        const geom = mesh.geometry.clone();
        const posAttr = geom.getAttribute("position");
        const normAttr = geom.getAttribute("normal");
        if (posAttr && normAttr) {
          const uvs = new Float32Array(posAttr.count * 2);
          const tileScale = 0.65; // ~1.5m per texture tile in Blender space
          for (let i = 0; i < posAttr.count; i++) {
            const px = posAttr.getX(i);
            const py = posAttr.getY(i);
            const pz = posAttr.getZ(i);
            const nx = Math.abs(normAttr.getX(i));
            const ny = Math.abs(normAttr.getY(i));
            const nz = Math.abs(normAttr.getZ(i));

            if (ny >= nx && ny >= nz) {
              uvs[i * 2] = px * tileScale;
              uvs[i * 2 + 1] = pz * tileScale;
            } else if (nx >= ny && nx >= nz) {
              uvs[i * 2] = pz * tileScale;
              uvs[i * 2 + 1] = py * tileScale;
            } else {
              uvs[i * 2] = px * tileScale;
              uvs[i * 2 + 1] = py * tileScale;
            }
          }
          geom.setAttribute("uv", new BufferAttribute(uvs, 2));
        }
        mesh.geometry = geom;
        mesh.material = cubeInteriorMat;
        mesh.castShadow = false;
        mesh.receiveShadow = true;
        return;
      }

      mesh.castShadow = false;
      mesh.receiveShadow = false;

      const rawMats = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      const fixedMats = rawMats.map((m: unknown) => {
        const isStdMat =
          m instanceof MeshStandardMaterial ||
          Boolean((m as unknown as { isMeshStandardMaterial?: boolean })?.isMeshStandardMaterial);
        if (!isStdMat) return m as MeshStandardMaterial;
        let mat = clonedByOrig.get(m as MeshStandardMaterial);
        if (!mat) {
          mat = cloneAsPhysicalMaterial(m as MeshStandardMaterial);
          const mName = (mat.name || "").toLowerCase();

          if (isLogo) {
            // Front illuminated letters of CUSTOMLY LOGO.glb - pure brilliant white illumination
            const isFrontLetters =
              mName === "material.001" ||
              mName === "material" ||
              mesh.name.toLowerCase().includes("text_1") ||
              mName.includes("material.000") ||
              rawMats.length === 1;

            if (isFrontLetters) {
              mat.color.set("#ffffff");
              mat.emissive.set("#ffffff");
              mat.emissiveIntensity = 3.2;
              mat.roughness = 0.2;
              mat.metalness = 0.0;
              logoMats.push(mat);
            } else {
              // Sleek matte architectural backing / return of sign
              mat.color.set("#0a0a0e");
              mat.roughness = 0.85;
              mat.metalness = 0.1;
            }
          } else if (mName === "wheel brake disk.001") {
            mat.color.set("#70747a");
            mat.metalness = 0.85;
            mat.roughness = 0.28;
          } else if (mName === "logo") {
            mat.metalness = 0.15;
            mat.roughness = 0.25;
          } else if (mName === "rim") {
            mat.color.set("#282c32");
            mat.metalness = 0.9;
            mat.roughness = 0.22;
          } else if (mName === "tyre.001" || mName === "side wall.001") {
            mat.color.set("#18181b");
            mat.metalness = 0;
            mat.roughness = 0.72;
          } else if (mName === "loop_plastic_black_shiny") {
            mat.color.set("#141416");
            mat.metalness = 0.15;
            mat.roughness = 0.2;
            mat.specularIntensity = 0.5;
            mat.specularColor.set("#ffffff");
          } else if (mName === "loop_chrome_brushed") {
            mat.color.set("#c8ccd0");
            mat.metalness = 0.9;
            mat.roughness = 0.2;
          } else if (mName === "loop_emissive") {
            mat.color.set("#ffffff");
            mat.emissive.set("#fff8ee");
            mat.emissiveIntensity = 3.0;
            mat.roughness = 0.15;
            emissiveSet.add(mat);
          }

          clonedByOrig.set(m as MeshStandardMaterial, mat);
        }
        return mat;
      });

      mesh.material = Array.isArray(mesh.material)
        ? fixedMats
        : fixedMats[0];
    });

    root.scale.setScalar(1);
    root.position.set(...SHOWROOM_OFFSET);
    root.userData.cubeInteriorMat = cubeInteriorMat;
    root.userData.logoMaterials = logoMats;
    root.userData.emissiveMaterials = Array.from(emissiveSet);
    return {
      scene: root,
    };
  }, [gltfResult, logoResult]);

  const showroomGroupRef = useRef<Group>(null);
  const logoLightRef = useRef<PointLight>(null);
  const logoSpotRef = useRef<SpotLight>(null);
  const logoWashRef = useRef<PointLight>(null);
  const studioBounceRef = useRef<PointLight>(null);

  const targetWallColor = useMemo(
    () => getShowroomColorForCar(mainColor),
    [mainColor]
  );

  useEffect(() => {
    if (logoSpotRef.current) {
      // Direct spotlight cast from wall sign across the room onto the car
      logoSpotRef.current.target.position.set(0, 30, 0);
      logoSpotRef.current.target.updateMatrixWorld();
    }
  }, []);

  useFrame((state, delta) => {
    const targetEmissive = lightIntensity * 2.5;
    const showroomRoot = showroomGroupRef.current?.children[0];

    const emissiveMats = (showroomRoot?.userData?.emissiveMaterials as MeshPhysicalMaterial[]) || EMPTY_MATS;
    if (emissiveMats.length > 0 && Math.abs(emissiveMats[0].emissiveIntensity - targetEmissive) > 0.01) {
      for (let i = 0; i < emissiveMats.length; i++) {
        easing.damp(emissiveMats[i], "emissiveIntensity", targetEmissive, 0.2, delta);
      }
    }

    // Steady, pure white illumination for the logo (no pulsing)
    const logoMats = (showroomRoot?.userData?.logoMaterials as MeshPhysicalMaterial[]) || EMPTY_MATS;
    const targetLogoEmissive = lightIntensity * 3.2;
    for (let i = 0; i < logoMats.length; i++) {
      const mat = logoMats[i];
      mat.color.set("#ffffff");
      mat.emissive.set("#ffffff");
      easing.damp(mat, "emissiveIntensity", targetLogoEmissive, 0.2, delta);
    }

    // Steady white light shining from the wall logo onto the car
    if (logoLightRef.current) {
      logoLightRef.current.color.set("#ffffff");
      easing.damp(logoLightRef.current, "intensity", lightIntensity * 12.0, 0.2, delta);
    }
    if (logoSpotRef.current) {
      logoSpotRef.current.color.set("#ffffff");
      easing.damp(logoSpotRef.current, "intensity", lightIntensity * 14.0, 0.2, delta);
    }
    if (logoWashRef.current) {
      logoWashRef.current.color.set("#ffffff");
      easing.damp(logoWashRef.current, "intensity", lightIntensity * 5.5, 0.2, delta);
    }

    // Dynamically damp the showroom walls to match the vehicle's body color
    const cubeMat = showroomRoot?.userData?.cubeInteriorMat as MeshPhysicalMaterial | undefined;
    if (cubeMat) {
      easing.dampC(cubeMat.color, targetWallColor, 0.25, delta);
    }

    // Soft car-colored ambient bounce in the studio
    if (studioBounceRef.current) {
      easing.dampC(studioBounceRef.current.color, targetWallColor, 0.25, delta);
      easing.damp(studioBounceRef.current, "intensity", lightIntensity * 2.8, 0.2, delta);
    }
  });

  return (
    <>
      <group ref={showroomGroupRef} scale={SHOWROOM_SCALE}>
        <primitive object={scene} dispose={null} />
      </group>

      {/* Pure white wall bloom around the sign letters */}
      <pointLight
        ref={logoLightRef}
        position={[-545, 90, -100]}
        distance={350}
        decay={1.2}
        intensity={lightIntensity * 12.0}
        color="#ffffff"
      />

      {/* Direct white studio light shining from the wall logo across the showroom onto the car */}
      <spotLight
        ref={logoSpotRef}
        position={[-545, 100, -100]}
        angle={0.5}
        penumbra={0.7}
        decay={0.4}
        intensity={lightIntensity * 14.0}
        color="#ffffff"
      />

      {/* Soft white studio fill from the wall onto the driver's side of the car */}
      <pointLight
        ref={logoWashRef}
        position={[-160, 55, -20]}
        distance={340}
        decay={1.0}
        intensity={lightIntensity * 5.5}
        color="#ffffff"
      />

      {/* Soft indirect studio floor and wall bounce matching vehicle color theme */}
      <pointLight
        ref={studioBounceRef}
        position={[0, 18, 0]}
        distance={380}
        decay={1.2}
        intensity={lightIntensity * 2.8}
        color={targetWallColor}
      />
    </>
  );
}
