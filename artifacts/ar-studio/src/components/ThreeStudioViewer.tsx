import { Suspense, useRef, useEffect, useState, useMemo, Component } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

// Local Draco decoder — avoids the cold DNS+TLS+download round-trip to gstatic.com
// Files are copied from three/examples/jsm/libs/draco/ into public/draco/ at build time.
const DRACO_PATH = `${import.meta.env.BASE_URL}draco/`;

// ---------------------------------------------------------------------------
// GLTF companion-file URL interceptor
//
// .gltf files (non-binary) reference external companion files (binary buffers,
// textures) via URIs.  When the URI is a root-absolute path like "/UUID" or a
// deeply-relative path like "../../../../UUID", Three.js resolves it to the
// domain root: https://DOMAIN/UUID — which has no handler and returns 404.
//
// We intercept these in Three.js's LoadingManager BEFORE fetch is called,
// normalise the URL (so ".." traversals are resolved), detect the UUID-like
// single-segment pattern, and reroute through the storage API.
// ---------------------------------------------------------------------------
THREE.DefaultLoadingManager.setURLModifier((url) => {
  try {
    const parsed = new URL(url, window.location.href);
    if (parsed.origin !== window.location.origin) return url;
    // After normalisation a companion file ends up as a single path segment
    // containing only hex digits and hyphens (UUID or partial-UUID shape).
    if (/^\/[0-9a-f][0-9a-f-]{18,34}[0-9a-f]$/i.test(parsed.pathname)) {
      return `/api/storage/objects/uploads${parsed.pathname}`;
    }
  } catch {
    // ignore unparseable URLs
  }
  return url;
});

// ---------------------------------------------------------------------------
// Device tier detection
// "low"  = mobile (phone/tablet) or WebGL-limited device → no antialias, no shadows, dpr capped at 1
// "mid"  = mid-range laptop/desktop                     → no antialias, smaller shadows, dpr ≤ 1.5
// "high" = powerful desktop / high-DPI laptop           → full quality
// ---------------------------------------------------------------------------
type DeviceTier = "high" | "mid" | "low";

function getDeviceTier(): DeviceTier {
  // Mobile check — userAgent + touch points
  const isMobile =
    /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || navigator.maxTouchPoints > 1;
  if (isMobile) return "low";

  // Probe WebGL for max texture size as a proxy for GPU capability
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return "low";
    const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    // < 8 192 → older integrated GPU → mid tier
    if (maxTex < 8192) return "mid";
  } catch {
    return "low";
  }
  return "high";
}

// ---------------------------------------------------------------------------
// Error boundary — catches WebGL context-lost / plugin errors and shows a
// friendly fallback instead of a blank or crashed canvas.
// On mobile this is the most common source of the "plugin error" the user sees.
// ---------------------------------------------------------------------------
class WebGLErrorBoundary extends Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    // Log for debugging without crashing the page
    console.warn("[AR Studio] 3D viewer error caught:", error.message);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// ShadowConfig — runs inside the Canvas and downgrades shadow map sizes for
// mid/low tiers after the scene is initialised, without touching individual
// scene components.
// ---------------------------------------------------------------------------
function ShadowConfig({ tier }: { tier: DeviceTier }) {
  const { gl } = useThree();
  useEffect(() => {
    if (tier === "low") {
      gl.shadowMap.enabled = false;
    } else if (tier === "mid") {
      // PCFShadowMap is cheaper than the default PCFSoftShadowMap
      gl.shadowMap.type = THREE.PCFShadowMap;
    }
  }, [gl, tier]);
  return null;
}

type Theme = "warm-minimal" | "studio-grey" | "natural-arch" | "duplex-room" | "room-map-1" | "custom-room";

interface SceneProps {
  modelUrl: string;
  pedestalColor?: string | null;
  pedestalHeight?: number | null;
  modelRotationY?: number | null;
  onLoad?: () => void;
  onPlatformDetected?: (pos: { x: number; y: number; z: number; radius: number }) => void;
}

interface ThreeStudioViewerProps {
  modelUrl: string;
  theme: Theme;
  pedestalColor?: string | null;
  pedestalHeight?: number | null;
  modelRotationY?: number | null;
  roomGlbUrl?: string | null;
  onLoad?: () => void;
  threeIntroEnabled?: boolean;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function CameraIntro({
  onDone,
  radius = 3.2,
  lookTarget = [0, 0.4, 0] as [number, number, number],
  skip = false,
}: {
  onDone: () => void;
  radius?: number;
  lookTarget?: [number, number, number];
  skip?: boolean;
}) {
  const { camera } = useThree();
  const progressRef = useRef(skip ? 1 : 0);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const startAzimuth = (-85 * Math.PI) / 180;
  const endAzimuth = 0;
  const startElevation = (38 * Math.PI) / 180;
  const endElevation = (15 * Math.PI) / 180;

  useEffect(() => {
    if (skip) {
      camera.position.set(
        radius * Math.cos(endElevation) * Math.sin(endAzimuth),
        radius * Math.sin(endElevation),
        radius * Math.cos(endElevation) * Math.cos(endAzimuth)
      );
      camera.lookAt(...lookTarget);
      onDoneRef.current();
      return;
    }
    camera.position.set(
      radius * Math.cos(startElevation) * Math.sin(startAzimuth),
      radius * Math.sin(startElevation),
      radius * Math.cos(startElevation) * Math.cos(startAzimuth)
    );
    camera.lookAt(...lookTarget);
  }, []);

  useFrame((_state, delta) => {
    if (doneRef.current || skip) return;
    progressRef.current = Math.min(progressRef.current + delta / 4.0, 1);
    const t = 1 - Math.pow(1 - progressRef.current, 5);

    const azimuth = lerp(startAzimuth, endAzimuth, t);
    const elevation = lerp(startElevation, endElevation, t);

    camera.position.set(
      radius * Math.cos(elevation) * Math.sin(azimuth),
      radius * Math.sin(elevation),
      radius * Math.cos(elevation) * Math.cos(azimuth)
    );
    camera.lookAt(...lookTarget);

    if (progressRef.current >= 1) {
      doneRef.current = true;
      onDoneRef.current();
    }
  });

  return null;
}

// Fires onFirstFrame on the very first rendered animation frame — used to
// detect when the Canvas has started drawing so the loading overlay can be removed.
function FirstFrameDetector({ onFirstFrame }: { onFirstFrame: () => void }) {
  const fired = useRef(false);
  useFrame(() => {
    if (!fired.current) {
      fired.current = true;
      onFirstFrame();
    }
  });
  return null;
}

function ModelOnPedestal({
  url,
  pedestalTopY,
  setPedestalRadius,
  rotationY,
  onLoad,
}: {
  url: string;
  pedestalTopY: number;
  setPedestalRadius: (r: number) => void;
  rotationY?: number | null;
  onLoad?: () => void;
}) {
  const gltf = useGLTF(url, DRACO_PATH);

  useEffect(() => {
    if (!gltf.scene) return;

    const box = new THREE.Box3().setFromObject(gltf.scene);
    const size = new THREE.Vector3();
    box.getSize(size);

    const footprint = Math.max(size.x, size.z);
    const newRadius = Math.max(footprint * 0.6, 0.25);
    setPedestalRadius(newRadius);

    const minY = box.min.y;
    gltf.scene.position.set(0, pedestalTopY - minY, 0);

    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    if (onLoad) onLoad();
  }, [gltf.scene, url, pedestalTopY]);

  return (
    <group rotation={[0, ((rotationY ?? 180) * Math.PI) / 180, 0]}>
      <primitive object={gltf.scene} />
    </group>
  );
}

function createArchFrameGeometry(
  outerW: number,
  outerH: number,
  openingW: number,
  openingBaseH: number,
  depth: number
): THREE.ExtrudeGeometry {
  const hw = outerW / 2;
  const archR = openingW / 2;

  const shape = new THREE.Shape();
  shape.moveTo(-hw, 0);
  shape.lineTo(hw, 0);
  shape.lineTo(hw, outerH);
  shape.lineTo(-hw, outerH);
  shape.closePath();

  const hole = new THREE.Path();
  hole.moveTo(-archR, 0);
  hole.lineTo(-archR, openingBaseH);
  hole.absarc(0, openingBaseH, archR, Math.PI, 0, false);
  hole.lineTo(archR, 0);
  hole.closePath();
  shape.holes.push(hole);

  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
}

function makeFloorTileTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#cfc4a8";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "#b4a890";
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= 4; i++) {
    const pos = i * 128;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(size, pos);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
}

function makeStuccoTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ece6d8";
  ctx.fillRect(0, 0, size, size);
  const rng = (min: number, max: number) => min + Math.random() * (max - min);
  for (let i = 0; i < 300; i++) {
    const x = rng(0, size);
    const y = rng(0, size);
    const rx = rng(2, 9);
    const ry = rng(2, 9);
    const alpha = rng(0.04, 0.10);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#3a2e20";
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rng(0, Math.PI), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  for (let i = 0; i < 80; i++) {
    const x = rng(0, size);
    const y = rng(0, size);
    const rx = rng(2, 7);
    const ry = rng(2, 7);
    const alpha = rng(0.05, 0.08);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rng(0, Math.PI), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

function WarmMinimalScene({
  modelUrl,
  pedestalColor,
  pedestalHeight,
  modelRotationY,
  onLoad,
}: {
  modelUrl: string;
  pedestalColor?: string | null;
  pedestalHeight?: number | null;
  modelRotationY?: number | null;
  onLoad?: () => void;
}) {
  const [pedestalRadius, setPedestalRadius] = useState(0.4);
  const h = pedestalHeight ?? 0.05;
  const pedestalTopY = 0.28 + h;

  const floorTex = useMemo(() => makeFloorTileTexture(), []);
  const stuccoTex = useMemo(() => makeStuccoTexture(), []);

  const floorMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#cfc4a8", map: floorTex, roughness: 0.9, metalness: 0 }),
    [floorTex]
  );

  const stuccoBase = useMemo(() => ({
    map: stuccoTex,
    roughness: 0.95,
    metalness: 0,
  }), [stuccoTex]);

  const leftPierMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#e8e2d6", ...stuccoBase }),
    [stuccoBase]
  );
  const rightPierMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#ece6dc", ...stuccoBase }),
    [stuccoBase]
  );
  const farPierMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#e4ddd2", ...stuccoBase }),
    [stuccoBase]
  );

  const backWallStucco = useMemo(() => {
    const t = stuccoTex.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 2);
    t.needsUpdate = true;
    return t;
  }, [stuccoTex]);
  const backWallMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#f0ebdf", map: backWallStucco, roughness: 0.95, metalness: 0 }),
    [backWallStucco]
  );

  const sideWallMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#e6e0d4", ...stuccoBase }),
    [stuccoBase]
  );

  const plinthMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#d8d0bc", roughness: 0.75, metalness: 0 }),
    []
  );

  const pedestalMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: pedestalColor ?? "#ddd6c6", roughness: 0.75, metalness: 0 }),
    [pedestalColor]
  );

  const vaseMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#9a4e1c", roughness: 0.85, metalness: 0 }),
    []
  );

  const branchMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#2c1a0a", roughness: 0.9, metalness: 0 }),
    []
  );

  const vasePoints = useMemo(() => [
    new THREE.Vector2(0.06, 0),
    new THREE.Vector2(0.10, 0.04),
    new THREE.Vector2(0.20, 0.18),
    new THREE.Vector2(0.23, 0.35),
    new THREE.Vector2(0.21, 0.50),
    new THREE.Vector2(0.15, 0.62),
    new THREE.Vector2(0.10, 0.68),
    new THREE.Vector2(0.08, 0.72),
    new THREE.Vector2(0.09, 0.76),
    new THREE.Vector2(0.07, 0.80),
  ], []);

  const vaseGeo = useMemo(() => new THREE.LatheGeometry(vasePoints, 32), [vasePoints]);

  const branches = useMemo(() => [
    { len: 1.3, yRot: 0.2,  xRot: -0.55 },
    { len: 1.0, yRot: 1.1,  xRot: -0.45 },
    { len: 0.85, yRot: 2.3, xRot: -0.38 },
    { len: 0.7, yRot: 4.0,  xRot: -0.50 },
  ], []);

  const subBranches = useMemo(() => [
    { len: 0.4, yRot: 0.2 + 0.6,  xRot: -0.55 - 0.3, baseLen: 1.3, branchIdx: 0 },
    { len: 0.35, yRot: 2.3 - 0.5, xRot: -0.38 - 0.25, baseLen: 0.85, branchIdx: 2 },
  ], []);

  return (
    <>
      <color attach="background" args={["#a8c4d2"]} />

      <directionalLight
        position={[-5, 12, 4]}
        intensity={5.5}
        color="#fff4d0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={0.1}
        shadow-camera-far={30}
      />
      <hemisphereLight args={["#b8d0e4", "#c4b290", 0.75]} />

      {/* Floor — travertine tile */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[14, 14]} />
        <primitive object={floorMat} attach="material" />
      </mesh>

      {/* Left pier */}
      <mesh castShadow receiveShadow position={[-2.7, 4.0, -2.3]}>
        <boxGeometry args={[1.1, 8.0, 0.85]} />
        <primitive object={leftPierMat} attach="material" />
      </mesh>

      {/* Right pier */}
      <mesh castShadow receiveShadow position={[2.3, 3.75, -2.5]}>
        <boxGeometry args={[1.0, 7.5, 0.85]} />
        <primitive object={rightPierMat} attach="material" />
      </mesh>

      {/* Far-back right pier */}
      <mesh castShadow receiveShadow position={[3.9, 3.25, -4.1]}>
        <boxGeometry args={[0.85, 6.5, 0.8]} />
        <primitive object={farPierMat} attach="material" />
      </mesh>

      {/* Back wall */}
      <mesh receiveShadow position={[0, 1.9, -5.2]}>
        <boxGeometry args={[12, 3.8, 0.15]} />
        <primitive object={backWallMat} attach="material" />
      </mesh>

      {/* Left side enclosure wall */}
      <mesh castShadow receiveShadow position={[-4.6, 2.75, -2.0]}>
        <boxGeometry args={[0.18, 5.5, 10]} />
        <primitive object={sideWallMat} attach="material" />
      </mesh>

      {/* Stepped plinth — lower step */}
      <mesh receiveShadow position={[0, 0.07, -1.0]}>
        <boxGeometry args={[3.8, 0.14, 2.4]} />
        <primitive object={plinthMat} attach="material" />
      </mesh>

      {/* Stepped plinth — upper step */}
      <mesh castShadow receiveShadow position={[0, 0.20, -1.1]}>
        <boxGeometry args={[2.6, 0.13, 1.8]} />
        <primitive object={plinthMat} attach="material" />
      </mesh>

      {/* Product pedestal cylinder */}
      <mesh castShadow receiveShadow position={[0, 0.28 + h / 2, -1.1]}>
        <cylinderGeometry args={[pedestalRadius, pedestalRadius, h, 48]} />
        <primitive object={pedestalMat} attach="material" />
      </mesh>

      {/* Terracotta amphora vase */}
      <mesh castShadow position={[-1.8, 0, -0.4]}>
        <primitive object={vaseGeo} attach="geometry" />
        <primitive object={vaseMat} attach="material" />
      </mesh>

      {/* Bare branches from vase top */}
      {branches.map((b, i) => (
        <mesh
          key={i}
          castShadow
          position={[-1.8, 0.82 + b.len * Math.cos(-b.xRot) / 2, -0.4]}
          rotation={[b.xRot, b.yRot, 0]}
        >
          <cylinderGeometry args={[0.012, 0.006, b.len, 6]} />
          <primitive object={branchMat} attach="material" />
        </mesh>
      ))}

      {/* Sub-branches */}
      {subBranches.map((sb, i) => {
        const parent = branches[sb.branchIdx];
        const along = sb.baseLen * 0.55;
        const ox = Math.sin(parent.yRot) * Math.sin(-parent.xRot) * along;
        const oy = Math.cos(-parent.xRot) * along;
        const oz = Math.cos(parent.yRot) * Math.sin(-parent.xRot) * along;
        return (
          <mesh
            key={i}
            castShadow
            position={[-1.8 + ox, 0.82 + oy, -0.4 + oz]}
            rotation={[sb.xRot, sb.yRot, 0]}
          >
            <cylinderGeometry args={[0.005, 0.009, sb.len, 6]} />
            <primitive object={branchMat} attach="material" />
          </mesh>
        );
      })}

      <group position={[0, 0, -1.1]}>
        <Suspense fallback={null}>
          <ModelOnPedestal
            url={modelUrl}
            pedestalTopY={pedestalTopY}
            setPedestalRadius={setPedestalRadius}
            rotationY={modelRotationY}
            onLoad={onLoad}
          />
        </Suspense>
      </group>
    </>
  );
}

const FLUTING_RIB_COUNT = 16;

function FlutingRibs({ zPos }: { zPos: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    if (!meshRef.current) return;
    const positions: number[] = [];
    for (let i = 0; i < 22; i++) {
      positions.push(-1.3 + i * (2.6 / 21));
    }
    const filtered = positions.slice(3, 19);
    const matrix = new THREE.Matrix4();
    filtered.forEach((x, idx) => {
      matrix.makeTranslation(x, 1.8, zPos);
      meshRef.current!.setMatrixAt(idx, matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [zPos]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, FLUTING_RIB_COUNT]}>
      <boxGeometry args={[0.07, 3.6, 0.09]} />
      <meshStandardMaterial color="#d0c4a8" roughness={0.85} />
    </instancedMesh>
  );
}

function GreyStudioScene({
  modelUrl,
  pedestalColor,
  pedestalHeight,
  modelRotationY,
  onLoad,
}: {
  modelUrl: string;
  pedestalColor?: string | null;
  pedestalHeight?: number | null;
  modelRotationY?: number | null;
  onLoad?: () => void;
}) {
  const [pedestalRadius, setPedestalRadius] = useState(0.4);
  const pedestalTopY = 0.12;

  const floorMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#8a8480", roughness: 0.9, metalness: 0 }),
    []
  );
  const mainMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#8a8480", roughness: 0.85, metalness: 0 }),
    []
  );
  const darkerMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#7e7a76", roughness: 0.88, metalness: 0 }),
    []
  );
  const pedestalMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: pedestalColor ?? "#8a8480", roughness: 0.7, metalness: 0 }),
    [pedestalColor]
  );
  const shadeMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#e8e0d0", roughness: 0.5, metalness: 0, emissive: "#fff8e0", emissiveIntensity: 0.3, side: THREE.DoubleSide }),
    []
  );
  const potMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#7e7a76", roughness: 0.8, metalness: 0 }),
    []
  );
  const plantMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#4a5040", roughness: 0.9, metalness: 0 }),
    []
  );

  const leftArchGeo = useMemo(
    () => createArchFrameGeometry(2.2, 3.8, 1.1, 1.6, 0.32),
    []
  );
  const rightArchGeo = useMemo(
    () => createArchFrameGeometry(1.6, 2.8, 0.9, 1.1, 0.32),
    []
  );

  return (
    <>
      <ambientLight intensity={0.5} color="#e8e0d8" />
      <directionalLight
        position={[2, 6, 2]}
        intensity={2.2}
        color="#fff8f0"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-camera-near={0.1}
        shadow-camera-far={20}
      />
      <hemisphereLight args={["#ccc8c0", "#a0988e", 0.4]} />
      <pointLight position={[-0.7, 1.5, -1.3]} intensity={1.5} color="#fff8e0" distance={2.5} />

      {/* Floor */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[12, 12]} />
        <primitive object={floorMat} attach="material" />
      </mesh>

      {/* Stage disc platform */}
      <mesh castShadow receiveShadow position={[0, 0.06, 0]}>
        <cylinderGeometry args={[1.6, 1.6, 0.12, 64]} />
        <primitive object={darkerMat} attach="material" />
      </mesh>

      {/* Left arch panel */}
      <mesh castShadow receiveShadow position={[-1.05, 0, -1.9]}>
        <primitive object={leftArchGeo} attach="geometry" />
        <primitive object={mainMat} attach="material" />
      </mesh>

      {/* Right arch panel */}
      <mesh castShadow receiveShadow position={[0.9, 0, -1.9]}>
        <primitive object={rightArchGeo} attach="geometry" />
        <primitive object={darkerMat} attach="material" />
      </mesh>

      {/* Left niche ledge */}
      <mesh castShadow receiveShadow position={[-1.3, 0.09, -1.5]}>
        <boxGeometry args={[0.9, 0.18, 0.7]} />
        <primitive object={darkerMat} attach="material" />
      </mesh>

      {/* Floor lamp — base */}
      <mesh castShadow receiveShadow position={[-0.7, 0.02, -1.3]}>
        <boxGeometry args={[0.14, 0.04, 0.14]} />
        <primitive object={darkerMat} attach="material" />
      </mesh>
      {/* Floor lamp — stem */}
      <mesh castShadow receiveShadow position={[-0.7, 0.77, -1.3]}>
        <cylinderGeometry args={[0.022, 0.022, 1.5, 12]} />
        <primitive object={darkerMat} attach="material" />
      </mesh>
      {/* Floor lamp — shade (cone, wider at bottom) */}
      <mesh castShadow position={[-0.7, 1.68, -1.3]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.22, 0.38, 24, 1, true]} />
        <primitive object={shadeMat} attach="material" />
      </mesh>

      {/* Plant pot */}
      <mesh castShadow receiveShadow position={[-1.3, 0.18 + 0.065, -1.55]}>
        <cylinderGeometry args={[0.1, 0.085, 0.13, 20]} />
        <primitive object={potMat} attach="material" />
      </mesh>
      {/* Plant bush */}
      <mesh castShadow receiveShadow position={[-1.3, 0.18 + 0.2, -1.55]}>
        <sphereGeometry args={[0.12, 12, 10]} />
        <primitive object={plantMat} attach="material" />
      </mesh>

      <Suspense fallback={null}>
        <ModelOnPedestal url={modelUrl} pedestalTopY={pedestalTopY} setPedestalRadius={setPedestalRadius} rotationY={modelRotationY} onLoad={onLoad} />
      </Suspense>
    </>
  );
}

function NaturalArchScene({
  modelUrl,
  pedestalColor,
  pedestalHeight,
  modelRotationY,
  onLoad,
}: {
  modelUrl: string;
  pedestalColor?: string | null;
  pedestalHeight?: number | null;
  modelRotationY?: number | null;
  onLoad?: () => void;
}) {
  const [pedestalRadius, setPedestalRadius] = useState(0.35);
  const pedestalTopY = 0.24;

  const floorMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#d4c8b0", roughness: 0.9, metalness: 0 }),
    []
  );
  const wallMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#c8b898", roughness: 0.9, metalness: 0, side: THREE.FrontSide }),
    []
  );
  const flutedArchMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#d0c4a8", roughness: 0.88, metalness: 0 }),
    []
  );
  const stoneArchMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#b0aaa0", roughness: 0.95, metalness: 0 }),
    []
  );
  const blockMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#cfc3a5", roughness: 0.9, metalness: 0 }),
    []
  );
  const boulderMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#cec9c0", roughness: 0.95, metalness: 0 }),
    []
  );
  const pedestalMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: pedestalColor ?? "#d0c4a8", roughness: 0.85, metalness: 0 }),
    [pedestalColor]
  );

  const flutedArchGeo = useMemo(
    () => createArchFrameGeometry(2.8, 3.6, 1.6, 1.8, 0.18),
    []
  );
  const stoneArchGeo = useMemo(
    () => createArchFrameGeometry(2.2, 2.9, 1.3, 1.4, 0.12),
    []
  );

  const r1 = pedestalRadius * 1.8;
  const r2 = pedestalRadius * 1.1;
  const r3 = pedestalRadius * 0.7;

  return (
    <>
      <ambientLight intensity={0.55} color="#fff0e0" />
      <directionalLight
        position={[3, 6, 2]}
        intensity={2.8}
        color="#ffe8b0"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-camera-near={0.1}
        shadow-camera-far={20}
      />
      <hemisphereLight args={["#f8ead8", "#c8b890", 0.35]} />

      {/* Floor */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[12, 12]} />
        <primitive object={floorMat} attach="material" />
      </mesh>

      {/* Back wall */}
      <mesh receiveShadow position={[0, 2.0, -4.5]} rotation={[0, 0, 0]}>
        <planeGeometry args={[12, 5]} />
        <primitive object={wallMat} attach="material" />
      </mesh>

      {/* Large fluted arch panel — back centre */}
      <mesh castShadow receiveShadow position={[0, 0, -3.8]}>
        <primitive object={flutedArchGeo} attach="geometry" />
        <primitive object={flutedArchMat} attach="material" />
      </mesh>

      {/* Fluting ribs on the fluted arch panel */}
      <FlutingRibs zPos={-3.575} />

      {/* Stone arch panel — in front of fluted arch */}
      <mesh castShadow receiveShadow position={[0, 0, -2.8]}>
        <primitive object={stoneArchGeo} attach="geometry" />
        <primitive object={stoneArchMat} attach="material" />
      </mesh>

      {/* Tall rectangular block — left */}
      <mesh castShadow receiveShadow position={[-1.3, 0.925, -1.2]}>
        <boxGeometry args={[0.46, 1.85, 0.46]} />
        <primitive object={blockMat} attach="material" />
      </mesh>

      {/* Large boulder — right */}
      <mesh castShadow receiveShadow position={[1.5, 0.28, -0.9]} scale={[0.75, 0.55, 0.65]}>
        <icosahedronGeometry args={[0.5, 1]} />
        <primitive object={boulderMat} attach="material" />
      </mesh>

      {/* Smaller boulder — right */}
      <mesh castShadow receiveShadow position={[1.85, 0.19, -0.3]} scale={[0.5, 0.38, 0.48]}>
        <icosahedronGeometry args={[0.5, 1]} />
        <primitive object={boulderMat} attach="material" />
      </mesh>

      {/* Stacked pedestal — layer 1 (base) */}
      <mesh castShadow receiveShadow position={[0, 0.04, 0]}>
        <cylinderGeometry args={[r1, r1 * 1.02, 0.08, 48]} />
        <primitive object={pedestalMat} attach="material" />
      </mesh>

      {/* Stacked pedestal — layer 2 (middle) */}
      <mesh castShadow receiveShadow position={[0, 0.13, 0]}>
        <cylinderGeometry args={[r2, r2 * 1.02, 0.10, 48]} />
        <primitive object={pedestalMat} attach="material" />
      </mesh>

      {/* Stacked pedestal — layer 3 (top) */}
      <mesh castShadow receiveShadow position={[0, 0.21, 0]}>
        <cylinderGeometry args={[r3, r3 * 1.02, 0.06, 48]} />
        <primitive object={pedestalMat} attach="material" />
      </mesh>

      <Suspense fallback={null}>
        <ModelOnPedestal url={modelUrl} pedestalTopY={pedestalTopY} setPedestalRadius={setPedestalRadius} rotationY={modelRotationY} onLoad={onLoad} />
      </Suspense>
    </>
  );
}


function DuplexRoomScene({
  modelUrl,
  pedestalColor,
  pedestalHeight,
  modelRotationY,
  onLoad,
}: {
  modelUrl: string;
  pedestalColor?: string | null;
  pedestalHeight?: number | null;
  modelRotationY?: number | null;
  onLoad?: () => void;
}) {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/duplex.glb`, DRACO_PATH);
  const [pedestalRadius, setPedestalRadius] = useState(0.35);

  // Auto-centre using the floor mesh as anchor, not the overall Box3.
  // The Backdrop / exterior elements extend below the real floor, so using the
  // overall Box3.min.y would push the scene too high and leave the pedestal
  // stranded beneath the room. We find the "Floor" mesh and use its bounds.
  const roomPosition = useMemo<[number, number, number]>(() => {
    scene.updateWorldMatrix(true, true);

    // Prefer the floor mesh for the most accurate ground-level Y.
    let floorBox: THREE.Box3 | null = null;
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && child.name.toLowerCase().includes("floor")) {
        const b = new THREE.Box3().setFromObject(child);
        if (!floorBox || b.min.y < floorBox.min.y) floorBox = b;
      }
    });

    if (floorBox) {
      const fb = floorBox as THREE.Box3;
      const cx = fb.getCenter(new THREE.Vector3());
      return [-cx.x, -fb.min.y, -cx.z];
    }

    // Fallback: use the overall box (original behaviour for other models).
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    return [-center.x, -box.min.y, -center.z];
  }, [scene]);

  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  const pColor = pedestalColor ?? "#d4cfc8";
  const pHeight = pedestalHeight ?? 0;
  // When pHeight is 0 the user wants the model placed directly on the floor
  // with no visible platform at all.
  const showPedestal = pHeight > 0.001;
  const pedestalTopY = showPedestal ? 0.28 + pHeight : 0;

  // XZ offset that places the pedestal on the grey carpet in the centre of the room.
  const CARPET_X = 0;
  const CARPET_Z = -2.5;

  const pedestalMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: pColor, roughness: 0.6, metalness: 0.05 }),
    [pColor]
  );

  return (
    <>
      {/* Position derived at runtime via Box3 to handle the model's combined root rotations */}
      <primitive object={scene} position={roomPosition} scale={[1.15, 1.15, 1.15]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[2, 4, 2]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
      {/* base cylinder */}
      <mesh position={[CARPET_X, 0.14, CARPET_Z]} castShadow receiveShadow visible={showPedestal}>
        <cylinderGeometry args={[pedestalRadius, pedestalRadius * 1.05, 0.28, 48]} />
        <primitive object={pedestalMat} attach="material" />
      </mesh>
      {/* top cylinder */}
      <mesh position={[CARPET_X, 0.28 + pHeight / 2, CARPET_Z]} castShadow receiveShadow visible={showPedestal}>
        <cylinderGeometry args={[pedestalRadius * 0.9, pedestalRadius, Math.max(pHeight, 0.001), 48]} />
        <primitive object={pedestalMat} attach="material" />
      </mesh>
      <Suspense fallback={null}>
        <group position={[CARPET_X, 0, CARPET_Z]}>
          <ModelOnPedestal
            url={modelUrl}
            pedestalTopY={pedestalTopY}
            setPedestalRadius={setPedestalRadius}
            rotationY={modelRotationY}
            onLoad={onLoad}
          />
        </group>
      </Suspense>
    </>
  );
}

function RoomMap1Scene({ modelUrl, pedestalColor, pedestalHeight, modelRotationY, onLoad, onPlatformDetected }: SceneProps) {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/room-map-1.glb`, DRACO_PATH);
  const [pedestalRadius, setPedestalRadius] = useState(0.5);
  const [platPos, setPlatPos] = useState<{ x: number; y: number; z: number } | null>(null);

  useEffect(() => {
    if (!scene) return;

    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    const platform = scene.getObjectByName("ar-platform") ?? scene.getObjectByName("ar-platfc");
    if (platform) {
      platform.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(platform);
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      box.getCenter(center);
      box.getSize(size);

      const topY = center.y + size.y / 2;
      const radius = Math.max(size.x, size.z) / 2 * 0.85;

      setPlatPos({ x: center.x, y: topY, z: center.z });
      setPedestalRadius(Math.max(radius, 0.25));
      onPlatformDetected?.({ x: center.x, y: topY, z: center.z, radius: Math.max(radius, 0.25) });
    }
  }, [scene]);

  const pColor = pedestalColor ?? "#d4cfc8";
  const pHeight = pedestalHeight ?? 0.05;
  const baseY = platPos ? platPos.y : 0;
  const pedestalTopY = baseY + 0.28 + pHeight;

  const pedestalMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: pColor, roughness: 0.6, metalness: 0.05 }),
    [pColor]
  );

  const platX = platPos?.x ?? 0;
  const platZ = platPos?.z ?? 0;

  return (
    <>
      <primitive object={scene} />

      {/* Sky / bounce fill */}
      <hemisphereLight args={["#c8dff0", "#d4c8a8", 0.9]} />

      {/* Soft ambient so shadows aren't pitch black */}
      <ambientLight intensity={0.55} color="#fff8f0" />

      {/* Primary window: bright daylight shaft from upper-left */}
      <directionalLight
        position={[platX - 6, 8, platZ - 2]}
        intensity={3.5}
        color="#fff5e0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-near={0.1}
        shadow-camera-far={30}
      />

      {/* Secondary window: softer fill from opposite side */}
      <directionalLight
        position={[platX + 5, 6, platZ + 3]}
        intensity={1.2}
        color="#e8f4ff"
      />

      <mesh position={[platX, baseY + 0.14, platZ]} castShadow receiveShadow>
        <cylinderGeometry args={[pedestalRadius, pedestalRadius * 1.05, 0.28, 48]} />
        <primitive object={pedestalMat} attach="material" />
      </mesh>
      <mesh position={[platX, baseY + 0.28 + pHeight / 2, platZ]} castShadow receiveShadow>
        <cylinderGeometry args={[pedestalRadius * 0.9, pedestalRadius, Math.max(pHeight, 0.001), 48]} />
        <primitive object={pedestalMat} attach="material" />
      </mesh>

      <Suspense fallback={null}>
        <group position={[platX, 0, platZ]}>
          <ModelOnPedestal
            url={modelUrl}
            pedestalTopY={pedestalTopY}
            setPedestalRadius={setPedestalRadius}
            rotationY={modelRotationY}
            onLoad={onLoad}
          />
        </group>
      </Suspense>
    </>
  );
}

function RoomBoundsGuard({ bounds }: {
  bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
}) {
  const { camera } = useThree();
  useFrame(() => {
    camera.position.x = Math.max(bounds.minX, Math.min(bounds.maxX, camera.position.x));
    camera.position.y = Math.max(bounds.minY, Math.min(bounds.maxY, camera.position.y));
    camera.position.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, camera.position.z));
  });
  return null;
}

function CustomRoomModel({
  roomGlbUrl,
  modelUrl,
  pedestalColor,
  pedestalHeight,
  modelRotationY,
  onLoad,
  onRoomLoaded,
}: {
  roomGlbUrl: string;
  modelUrl: string;
  pedestalColor?: string | null;
  pedestalHeight?: number | null;
  modelRotationY?: number | null;
  onLoad?: () => void;
  onRoomLoaded?: (info: { platformTarget: [number, number, number]; maxDist: number }) => void;
}) {
  const { scene } = useGLTF(roomGlbUrl, DRACO_PATH);
  const [pedestalRadius, setPedestalRadius] = useState(0.5);
  const [platPos, setPlatPos] = useState<{ x: number; y: number; z: number } | null>(null);
  const [roomBoundsInfo, setRoomBoundsInfo] = useState<{
    minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number;
  } | null>(null);

  useEffect(() => {
    if (!scene) return;
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    scene.updateWorldMatrix(true, true);
    const roomBox = new THREE.Box3().setFromObject(scene);
    const roomSize = roomBox.getSize(new THREE.Vector3());
    const roomCenter = roomBox.getCenter(new THREE.Vector3());
    const maxDist = Math.max(Math.min(roomSize.x, roomSize.z) / 2 - 0.8, 1.5);

    setRoomBoundsInfo({
      minX: roomBox.min.x + 0.3,
      maxX: roomBox.max.x - 0.3,
      minY: roomBox.min.y + 0.05,
      maxY: roomBox.max.y - 0.3,
      minZ: roomBox.min.z + 0.3,
      maxZ: roomBox.max.z - 0.3,
    });

    const platform = scene.getObjectByName("ar-platform") ?? scene.getObjectByName("ar-platfc");
    let platX = roomCenter.x;
    let platY = roomBox.min.y;
    let platZ = roomCenter.z;

    if (platform) {
      platform.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(platform);
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      box.getCenter(center);
      box.getSize(size);
      platX = center.x;
      platY = center.y + size.y / 2;
      platZ = center.z;
      setPedestalRadius(Math.max(Math.max(size.x, size.z) / 2 * 0.85, 0.25));
    }

    setPlatPos({ x: platX, y: platY, z: platZ });
    onRoomLoaded?.({ platformTarget: [platX, platY + 0.4, platZ], maxDist });
  }, [scene]);

  const pColor = pedestalColor ?? "#d4cfc8";
  // For custom-room: null means "no pedestal" — default is OFF.
  // Using ?? 0 (not 0.05) ensures null/undefined → showPedestal=false,
  // matching the editor toggle which also uses (pedestalHeight ?? 0) > 0.001.
  const pHeight = pedestalHeight ?? 0;
  const showPedestal = pHeight > 0.001;
  const baseY = platPos ? platPos.y : 0;
  const pedestalTopY = showPedestal ? baseY + 0.28 + pHeight : baseY;
  const platX = platPos?.x ?? 0;
  const platZ = platPos?.z ?? 0;

  const pedestalMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: pColor, roughness: 0.6, metalness: 0.05 }),
    [pColor]
  );

  return (
    <>
      <primitive object={scene} />
      {roomBoundsInfo && <RoomBoundsGuard bounds={roomBoundsInfo} />}
      <hemisphereLight args={["#c8dff0", "#d4c8a8", 0.9]} />
      <ambientLight intensity={0.55} color="#fff8f0" />
      <directionalLight
        position={[platX - 6, 8, platZ - 2]}
        intensity={3.5}
        color="#fff5e0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-near={0.1}
        shadow-camera-far={30}
      />
      <directionalLight position={[platX + 5, 6, platZ + 3]} intensity={1.2} color="#e8f4ff" />
      {showPedestal && (
        <>
          <mesh position={[platX, baseY + 0.14, platZ]} castShadow receiveShadow>
            <cylinderGeometry args={[pedestalRadius, pedestalRadius * 1.05, 0.28, 48]} />
            <primitive object={pedestalMat} attach="material" />
          </mesh>
          <mesh position={[platX, baseY + 0.28 + pHeight / 2, platZ]} castShadow receiveShadow>
            <cylinderGeometry args={[pedestalRadius * 0.9, pedestalRadius, Math.max(pHeight, 0.001), 48]} />
            <primitive object={pedestalMat} attach="material" />
          </mesh>
        </>
      )}
      <Suspense fallback={null}>
        <group position={[platX, 0, platZ]}>
          <ModelOnPedestal
            url={modelUrl}
            pedestalTopY={pedestalTopY}
            setPedestalRadius={setPedestalRadius}
            rotationY={modelRotationY}
            onLoad={onLoad}
          />
        </group>
      </Suspense>
    </>
  );
}

function CustomRoomScene({
  modelUrl,
  roomGlbUrl,
  pedestalColor,
  pedestalHeight,
  modelRotationY,
  onLoad,
  onRoomLoaded,
}: {
  modelUrl: string;
  roomGlbUrl?: string | null;
  pedestalColor?: string | null;
  pedestalHeight?: number | null;
  modelRotationY?: number | null;
  onLoad?: () => void;
  onRoomLoaded?: (info: { platformTarget: [number, number, number]; maxDist: number }) => void;
}) {
  if (!roomGlbUrl) {
    return (
      <>
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 5, 2]} intensity={1.5} castShadow />
        <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#c8c0b4" roughness={0.9} />
        </mesh>
        <Suspense fallback={null}>
          <ModelOnPedestal
            url={modelUrl}
            pedestalTopY={0.33}
            setPedestalRadius={() => {}}
            rotationY={modelRotationY}
            onLoad={onLoad}
          />
        </Suspense>
      </>
    );
  }

  return (
    <Suspense fallback={null}>
      <CustomRoomModel
        roomGlbUrl={roomGlbUrl}
        modelUrl={modelUrl}
        pedestalColor={pedestalColor}
        pedestalHeight={pedestalHeight}
        modelRotationY={modelRotationY}
        onLoad={onLoad}
        onRoomLoaded={onRoomLoaded}
      />
    </Suspense>
  );
}

export function ThreeStudioViewer({ modelUrl, theme, pedestalColor, pedestalHeight, modelRotationY, roomGlbUrl, onLoad, threeIntroEnabled = true }: ThreeStudioViewerProps) {
  const [introDone, setIntroDone] = useState(false);
  // roomReady = Canvas has painted its first frame → hide the blocking overlay
  // modelReady = product model has fully loaded → start camera intro
  const [roomReady, setRoomReady] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [platformTarget, setPlatformTarget] = useState<[number, number, number]>([0, 0.4, 0]);
  const [roomMaxDist, setRoomMaxDist] = useState(3.0);

  // Computed once per mount — stays stable across re-renders
  const tier = useMemo(() => getDeviceTier(), []);
  const dpr = tier === "high" ? Math.min(window.devicePixelRatio, 2)
    : tier === "mid" ? Math.min(window.devicePixelRatio, 1.5)
    : 1;

  // Kick off parallel preloads for static room assets before the Canvas mounts.
  // NOTE: modelUrl (API storage) is intentionally NOT preloaded here.
  // Preloading dynamic API URLs can produce unhandled promise rejections when
  // the model has external companion files (e.g. .gltf + .bin) whose URIs
  // need the URL interceptor above — which isn't guaranteed to run before the
  // preload fires.  The component-level useGLTF inside the Canvas handles the
  // model load, and any failure is caught by the WebGLErrorBoundary there.
  useGLTF.preload(`${import.meta.env.BASE_URL}models/duplex.glb`, DRACO_PATH);
  useGLTF.preload(`${import.meta.env.BASE_URL}models/room-map-1.glb`, DRACO_PATH);

  useEffect(() => {
    setRoomReady(false);
    setModelReady(false);
    setIntroDone(false);
    setPlatformTarget([0, 0.4, 0]);
    setRoomMaxDist(3.0);
  }, [modelUrl, theme, roomGlbUrl]);

  const handleModelLoad = () => {
    setModelReady(true);
    onLoad?.();
  };

  const handlePlatformDetected = (pos: { x: number; y: number; z: number; radius: number }) => {
    setPlatformTarget([pos.x, pos.y, pos.z]);
  };

  const handleRoomLoaded = (info: { platformTarget: [number, number, number]; maxDist: number }) => {
    setPlatformTarget(info.platformTarget);
    setRoomMaxDist(info.maxDist);
  };

  const bgColor = theme === "warm-minimal" ? "#a8c4d2"
    : theme === "duplex-room" ? "#b0a898"
    : theme === "room-map-1" ? "#c8c0b4"
    : theme === "custom-room" ? "#c0b8b0"
    : "transparent";

  const glErrorFallback = (
    <div style={{
      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", background: bgColor || "#1a1a1a",
      color: "#888", fontSize: 13, gap: 8, padding: 24, textAlign: "center",
    }}>
      <span style={{ fontSize: 28 }}>⚠️</span>
      <span>3D preview isn't supported on this device.</span>
      <span style={{ fontSize: 11, opacity: 0.6 }}>You can still use AR mode to view the product.</span>
    </div>
  );

  return (
    <div style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      {/* Phase 1 overlay: covers the Canvas until the first frame is drawn.
          Hides as soon as the WebGL canvas starts painting — the room appears.
          Phase 2: once room is visible but model is still loading, a subtle
          bottom hint replaces the full-screen block. */}
      {!roomReady && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 1,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: bgColor || "rgba(20,20,20,0.85)",
          pointerEvents: "none",
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            border: "2.5px solid rgba(255,255,255,0.15)",
            borderTopColor: "rgba(255,255,255,0.7)",
            animation: "spin 0.8s linear infinite",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      {/* Phase 2: room is visible, product model still loading */}
      {roomReady && !modelReady && (
        <div style={{
          position: "absolute", bottom: 16, left: 0, right: 0, zIndex: 1,
          display: "flex", justifyContent: "center", pointerEvents: "none",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            background: "rgba(0,0,0,0.45)", borderRadius: 20,
            padding: "5px 14px",
          }}>
            <div style={{
              width: 12, height: 12, borderRadius: "50%",
              border: "1.5px solid rgba(255,255,255,0.2)",
              borderTopColor: "rgba(255,255,255,0.7)",
              animation: "spin 0.8s linear infinite",
            }} />
            <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, letterSpacing: "0.02em" }}>
              Loading model…
            </span>
          </div>
        </div>
      )}

      <WebGLErrorBoundary fallback={glErrorFallback}>
        <Canvas
          shadows={tier !== "low"}
          dpr={dpr}
          camera={{ fov: tier === "low" ? 60 : 45, near: 0.1, far: 50, position: [-2.51, 1.97, 0.22] }}
          gl={{
            antialias: tier === "high",
            outputColorSpace: THREE.SRGBColorSpace,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: tier === "low" ? 1.2 : 1.35,
            // These two flags are critical on mobile:
            // failIfMajorPerformanceCaveat:false prevents the "plugin error" crash
            // when the browser would otherwise refuse to create a full WebGL context.
            // powerPreference:"default" avoids forcing high-performance GPU mode which
            // can cause context loss on integrated-GPU mobile devices.
            failIfMajorPerformanceCaveat: false,
            powerPreference: "default",
          }}
          style={{ background: bgColor }}
        >
          <ShadowConfig tier={tier} />
          <FirstFrameDetector onFirstFrame={() => setRoomReady(true)} />

          {modelReady && (
            <CameraIntro
              key={modelUrl}
              onDone={() => setIntroDone(true)}
              skip={!threeIntroEnabled}
              radius={
                theme === "duplex-room" ? (tier === "low" ? 6.5 : 5.0)
                : theme === "room-map-1" ? (tier === "low" ? 4.8 : 3.5)
                : theme === "custom-room" ? roomMaxDist * (tier === "low" ? 0.9 : 0.75)
                : (tier === "low" ? 4.5 : 3.2)
              }
              lookTarget={
                theme === "duplex-room" ? [0, 0.4, -2.5]
                : (theme === "room-map-1" || theme === "custom-room") ? platformTarget
                : [0, 0.4, 0]
              }
            />
          )}
          {(theme === "duplex-room" || theme === "room-map-1") ? (
            <OrbitControls
              enabled={introDone}
              enableDamping
              dampingFactor={0.08}
              minDistance={0.6}
              maxDistance={theme === "duplex-room" ? (tier === "low" ? 6.5 : 5.0) : (tier === "low" ? 4.8 : 3.5)}
              minPolarAngle={Math.PI * 0.08}
              maxPolarAngle={Math.PI * 0.48}
              target={theme === "duplex-room" ? [0, 0.4, -2.5] : platformTarget}
            />
          ) : theme === "custom-room" ? (
            <OrbitControls
              enabled={introDone}
              enableDamping
              dampingFactor={0.08}
              minDistance={0.6}
              maxDistance={roomMaxDist}
              minPolarAngle={Math.PI * 0.04}
              maxPolarAngle={Math.PI * 0.45}
              target={platformTarget}
            />
          ) : (
            <OrbitControls
              enabled={introDone}
              enableDamping
              dampingFactor={0.08}
              minDistance={1}
              maxDistance={8}
              minPolarAngle={Math.PI * 0.08}
              maxPolarAngle={Math.PI / 2 - 0.05}
              minAzimuthAngle={-Math.PI * 0.65}
              maxAzimuthAngle={Math.PI * 0.65}
              target={[0, 0.4, 0]}
            />
          )}

          {theme === "warm-minimal" && (
            <WarmMinimalScene modelUrl={modelUrl} pedestalColor={pedestalColor} pedestalHeight={pedestalHeight} modelRotationY={modelRotationY} onLoad={handleModelLoad} />
          )}
          {theme === "studio-grey" && (
            <GreyStudioScene modelUrl={modelUrl} pedestalColor={pedestalColor} pedestalHeight={pedestalHeight} modelRotationY={modelRotationY} onLoad={handleModelLoad} />
          )}
          {theme === "natural-arch" && (
            <NaturalArchScene modelUrl={modelUrl} pedestalColor={pedestalColor} pedestalHeight={pedestalHeight} modelRotationY={modelRotationY} onLoad={handleModelLoad} />
          )}
          {theme === "duplex-room" && (
            <DuplexRoomScene modelUrl={modelUrl} pedestalColor={pedestalColor} pedestalHeight={pedestalHeight} modelRotationY={modelRotationY} onLoad={handleModelLoad} />
          )}
          {theme === "room-map-1" && (
            <RoomMap1Scene
              modelUrl={modelUrl}
              pedestalColor={pedestalColor}
              pedestalHeight={pedestalHeight}
              modelRotationY={modelRotationY}
              onLoad={handleModelLoad}
              onPlatformDetected={handlePlatformDetected}
            />
          )}
          {theme === "custom-room" && (
            <CustomRoomScene
              modelUrl={modelUrl}
              roomGlbUrl={roomGlbUrl}
              pedestalColor={pedestalColor}
              pedestalHeight={pedestalHeight}
              modelRotationY={modelRotationY}
              onLoad={handleModelLoad}
              onRoomLoaded={handleRoomLoaded}
            />
          )}
        </Canvas>
      </WebGLErrorBoundary>
    </div>
  );
}
