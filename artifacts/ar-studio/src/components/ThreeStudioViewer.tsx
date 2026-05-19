import { Suspense, useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

type Theme = "warm-minimal" | "studio-grey" | "natural-arch";

interface ThreeStudioViewerProps {
  modelUrl: string;
  theme: Theme;
  pedestalColor?: string | null;
  pedestalHeight?: number | null;
  onLoad?: () => void;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function CameraIntro({ onDone }: { onDone: () => void }) {
  const { camera } = useThree();
  const progressRef = useRef(0);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const startAzimuth = (-85 * Math.PI) / 180;
  const endAzimuth = 0;
  const startElevation = (38 * Math.PI) / 180;
  const endElevation = (15 * Math.PI) / 180;
  const radius = 3.2;

  useEffect(() => {
    camera.position.set(
      radius * Math.cos(startElevation) * Math.sin(startAzimuth),
      radius * Math.sin(startElevation),
      radius * Math.cos(startElevation) * Math.cos(startAzimuth)
    );
    camera.lookAt(0, 0.4, 0);
  }, []);

  useFrame((_state, delta) => {
    if (doneRef.current) return;
    progressRef.current = Math.min(progressRef.current + delta / 4.0, 1);
    const t = 1 - Math.pow(1 - progressRef.current, 5);

    const azimuth = lerp(startAzimuth, endAzimuth, t);
    const elevation = lerp(startElevation, endElevation, t);

    camera.position.set(
      radius * Math.cos(elevation) * Math.sin(azimuth),
      radius * Math.sin(elevation),
      radius * Math.cos(elevation) * Math.cos(azimuth)
    );
    camera.lookAt(0, 0.4, 0);

    if (progressRef.current >= 1) {
      doneRef.current = true;
      onDoneRef.current();
    }
  });

  return null;
}

function ModelOnPedestal({
  url,
  pedestalTopY,
  setPedestalRadius,
  onLoad,
}: {
  url: string;
  pedestalTopY: number;
  setPedestalRadius: (r: number) => void;
  onLoad?: () => void;
}) {
  const gltf = useGLTF(url);

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
    <group rotation={[0, Math.PI, 0]}>
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
  onLoad,
}: {
  modelUrl: string;
  pedestalColor?: string | null;
  pedestalHeight?: number | null;
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
  onLoad,
}: {
  modelUrl: string;
  pedestalColor?: string | null;
  pedestalHeight?: number | null;
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
        <ModelOnPedestal url={modelUrl} pedestalTopY={pedestalTopY} setPedestalRadius={setPedestalRadius} onLoad={onLoad} />
      </Suspense>
    </>
  );
}

function NaturalArchScene({
  modelUrl,
  pedestalColor,
  pedestalHeight,
  onLoad,
}: {
  modelUrl: string;
  pedestalColor?: string | null;
  pedestalHeight?: number | null;
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
        <ModelOnPedestal url={modelUrl} pedestalTopY={pedestalTopY} setPedestalRadius={setPedestalRadius} onLoad={onLoad} />
      </Suspense>
    </>
  );
}

export function ThreeStudioViewer({ modelUrl, theme, pedestalColor, pedestalHeight, onLoad }: ThreeStudioViewerProps) {
  const [introDone, setIntroDone] = useState(false);
  const [modelReady, setModelReady] = useState(false);

  useGLTF.preload(modelUrl);

  useEffect(() => {
    setModelReady(false);
    setIntroDone(false);
  }, [modelUrl, theme]);

  const handleModelLoad = () => {
    setModelReady(true);
    onLoad?.();
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      <Canvas
        shadows
        camera={{ fov: 45, near: 0.1, far: 50, position: [-2.51, 1.97, 0.22] }}
        gl={{
          antialias: true,
          outputColorSpace: THREE.SRGBColorSpace,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.35,
        }}
        style={{ background: theme === "warm-minimal" ? "#a8c4d2" : "transparent" }}
      >
        {modelReady && <CameraIntro key={modelUrl} onDone={() => setIntroDone(true)} />}
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

        {theme === "warm-minimal" && (
          <WarmMinimalScene modelUrl={modelUrl} pedestalColor={pedestalColor} pedestalHeight={pedestalHeight} onLoad={handleModelLoad} />
        )}
        {theme === "studio-grey" && (
          <GreyStudioScene modelUrl={modelUrl} pedestalColor={pedestalColor} pedestalHeight={pedestalHeight} onLoad={handleModelLoad} />
        )}
        {theme === "natural-arch" && (
          <NaturalArchScene modelUrl={modelUrl} pedestalColor={pedestalColor} pedestalHeight={pedestalHeight} onLoad={handleModelLoad} />
        )}
      </Canvas>
    </div>
  );
}
