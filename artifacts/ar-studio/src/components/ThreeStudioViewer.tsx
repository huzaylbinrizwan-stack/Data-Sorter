import { Suspense, useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment } from "@react-three/drei";
import * as THREE from "three";

type Theme = "dark-alcove" | "warm-minimal" | "studio-grey" | "natural-arch" | "mirrored-hall";

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

function DarkAlcoveScene({
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
  const h = pedestalHeight ?? 0.08;

  const floorMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#6e6a66", roughness: 0.9, metalness: 0.05 }),
    []
  );
  const wallMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#787470", roughness: 0.85, metalness: 0.05 }),
    []
  );
  const pedestalMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: pedestalColor ?? "#252527", roughness: 0.7, metalness: 0.1 }),
    [pedestalColor]
  );
  const archMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#5a5653", roughness: 0.95, metalness: 0.0, side: THREE.DoubleSide }),
    []
  );

  const archGeo = useMemo(
    () => createArchFrameGeometry(6, 4.5, 2.6, 1.8, 0.18),
    []
  );

  return (
    <>
      <ambientLight intensity={0.55} color="#c8d8f0" />
      <directionalLight
        position={[-2, 6, 3]}
        intensity={5.0}
        color="#eef4ff"
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
      <spotLight
        position={[1.5, 4, 2]}
        angle={0.35}
        penumbra={0.6}
        intensity={20}
        color="#fff5e0"
        castShadow={false}
      />

      {/* Floor — widened to 14×14 */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[14, 14]} />
        <primitive object={floorMat} attach="material" />
      </mesh>

      {/* Back wall — pushed to z=-6, 14 wide */}
      <mesh receiveShadow position={[0, 2.5, -6]}>
        <boxGeometry args={[14, 5, 0.1]} />
        <primitive object={wallMat} attach="material" />
      </mesh>

      {/* Left side wall — pushed to x=-7 */}
      <mesh receiveShadow position={[-7, 2.5, -3]}>
        <boxGeometry args={[0.1, 5, 12]} />
        <primitive object={wallMat} attach="material" />
      </mesh>

      {/* Right side wall — pushed to x=+7 */}
      <mesh receiveShadow position={[7, 2.5, -3]}>
        <boxGeometry args={[0.1, 5, 12]} />
        <primitive object={wallMat} attach="material" />
      </mesh>

      <mesh castShadow position={[0, 0, 1.5]}>
        <primitive object={archGeo} attach="geometry" />
        <primitive object={archMat} attach="material" />
      </mesh>

      <mesh castShadow receiveShadow position={[0, h / 2, 0]}>
        <cylinderGeometry args={[pedestalRadius, pedestalRadius * 1.02, h, 48]} />
        <primitive object={pedestalMat} attach="material" />
      </mesh>

      <Suspense fallback={null}>
        <ModelOnPedestal url={modelUrl} pedestalTopY={h} setPedestalRadius={setPedestalRadius} onLoad={onLoad} />
      </Suspense>
    </>
  );
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
  const [pedestalSize, setPedestalSize] = useState({ w: 0.8, d: 0.8 });
  const h = pedestalHeight ?? 0.05;

  const setPedestalRadius = (r: number) => {
    setPedestalSize({ w: r * 1.6, d: r * 1.6 });
  };

  const floorMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#e8ddd0", roughness: 0.85, metalness: 0 }),
    []
  );
  const wallMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#ddd3c5", roughness: 0.9, metalness: 0 }),
    []
  );
  const panelMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#ccc2b4", roughness: 0.8, metalness: 0 }),
    []
  );
  const pedestalMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: pedestalColor ?? "#f0ebe3", roughness: 0.6, metalness: 0 }),
    [pedestalColor]
  );

  return (
    <>
      <ambientLight intensity={0.4} color="#fff8ef" />
      <directionalLight
        position={[-3, 5, 2]}
        intensity={2.5}
        color="#ffe8c0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-camera-near={0.1}
        shadow-camera-far={20}
      />

      {/* Floor */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <primitive object={floorMat} attach="material" />
      </mesh>

      {/* Back wall */}
      <mesh receiveShadow position={[0, 2.5, -3.5]}>
        <boxGeometry args={[10, 5, 0.1]} />
        <primitive object={wallMat} attach="material" />
      </mesh>

      {/* Ceiling — raised to y=5.5 */}
      <mesh receiveShadow position={[0, 5.5, 0]}>
        <boxGeometry args={[12, 0.08, 12]} />
        <primitive object={wallMat} attach="material" />
      </mesh>

      {/* Horizontal wall rail / panel band on back wall */}
      <mesh castShadow receiveShadow position={[0, 1.8, -3.44]}>
        <boxGeometry args={[9, 0.06, 0.08]} />
        <primitive object={panelMat} attach="material" />
      </mesh>

      {/* Left column — base plinth */}
      <mesh castShadow receiveShadow position={[-2.2, 0.35, -1.5]}>
        <boxGeometry args={[0.55, 0.7, 2.0]} />
        <primitive object={panelMat} attach="material" />
      </mesh>
      {/* Left column — tall pilaster */}
      <mesh castShadow receiveShadow position={[-2.2, 2.0, -1.5]}>
        <boxGeometry args={[0.38, 2.6, 1.6]} />
        <primitive object={panelMat} attach="material" />
      </mesh>

      {/* Right column — base plinth */}
      <mesh castShadow receiveShadow position={[2.2, 0.35, -1.5]}>
        <boxGeometry args={[0.55, 0.7, 2.0]} />
        <primitive object={panelMat} attach="material" />
      </mesh>
      {/* Right column — tall pilaster */}
      <mesh castShadow receiveShadow position={[2.2, 2.0, -1.5]}>
        <boxGeometry args={[0.38, 2.6, 1.6]} />
        <primitive object={panelMat} attach="material" />
      </mesh>

      <mesh castShadow receiveShadow position={[0, h / 2, 0]}>
        <boxGeometry args={[pedestalSize.w, h, pedestalSize.d]} />
        <primitive object={pedestalMat} attach="material" />
      </mesh>

      <Suspense fallback={null}>
        <ModelOnPedestal url={modelUrl} pedestalTopY={h} setPedestalRadius={setPedestalRadius} onLoad={onLoad} />
      </Suspense>
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

function MirroredHallScene({
  modelUrl,
  onLoad,
}: {
  modelUrl: string;
  onLoad?: () => void;
}) {
  const [pedestalRadius, setPedestalRadius] = useState(0.7);
  const pedestalTopY = 0.12;

  const floorMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.05, metalness: 0.8, opacity: 0.35, transparent: true }),
    []
  );
  const pedestalMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#f5f2ee", roughness: 0.15, metalness: 0.6 }),
    []
  );

  const clampedRadius = Math.max(pedestalRadius * 1.3, 0.7);

  return (
    <>
      <color attach="background" args={["#1c1c1e"]} />
      <Environment preset="studio" background />
      <ambientLight intensity={0.2} />
      <directionalLight
        position={[2, 5, 3]}
        intensity={1.2}
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

      {/* Large semi-transparent reflective floor plane */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <primitive object={floorMat} attach="material" />
      </mesh>

      {/* Circular marble platform */}
      <mesh castShadow receiveShadow position={[0, 0.06, 0]}>
        <cylinderGeometry args={[clampedRadius, clampedRadius * 1.01, 0.12, 64]} />
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

  const isMirroredHall = theme === "mirrored-hall";

  return (
    <div style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      <Canvas
        shadows
        camera={{ fov: 45, near: 0.1, far: 50, position: [-2.51, 1.97, 0.22] }}
        gl={{
          antialias: true,
          outputColorSpace: THREE.SRGBColorSpace,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        style={{ background: "transparent" }}
      >
        {modelReady && <CameraIntro key={modelUrl} onDone={() => setIntroDone(true)} />}
        <OrbitControls
          enabled={introDone}
          enableDamping
          dampingFactor={0.08}
          minDistance={1}
          maxDistance={7}
          minPolarAngle={Math.PI * 0.1}
          maxPolarAngle={Math.PI / 2 - 0.05}
          {...(!isMirroredHall ? { minAzimuthAngle: -Math.PI * 0.55, maxAzimuthAngle: Math.PI * 0.55 } : {})}
          target={[0, 0.4, 0]}
        />

        {theme === "dark-alcove" && (
          <DarkAlcoveScene modelUrl={modelUrl} pedestalColor={pedestalColor} pedestalHeight={pedestalHeight} onLoad={handleModelLoad} />
        )}
        {theme === "warm-minimal" && (
          <WarmMinimalScene modelUrl={modelUrl} pedestalColor={pedestalColor} pedestalHeight={pedestalHeight} onLoad={handleModelLoad} />
        )}
        {theme === "studio-grey" && (
          <GreyStudioScene modelUrl={modelUrl} pedestalColor={pedestalColor} pedestalHeight={pedestalHeight} onLoad={handleModelLoad} />
        )}
        {theme === "natural-arch" && (
          <NaturalArchScene modelUrl={modelUrl} pedestalColor={pedestalColor} pedestalHeight={pedestalHeight} onLoad={handleModelLoad} />
        )}
        {theme === "mirrored-hall" && (
          <MirroredHallScene modelUrl={modelUrl} onLoad={handleModelLoad} />
        )}
      </Canvas>
    </div>
  );
}
