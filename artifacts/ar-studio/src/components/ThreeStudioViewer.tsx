import { Suspense, useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

type Theme = "dark-alcove" | "warm-minimal";

interface ThreeStudioViewerProps {
  modelUrl: string;
  theme: Theme;
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

  const startAzimuth = (-65 * Math.PI) / 180;
  const endAzimuth = 0;
  const startElevation = (25 * Math.PI) / 180;
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
    progressRef.current = Math.min(progressRef.current + delta / 2.5, 1);
    const t = 1 - Math.pow(1 - progressRef.current, 3);

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
    <group>
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
  onLoad,
}: {
  modelUrl: string;
  onLoad?: () => void;
}) {
  const [pedestalRadius, setPedestalRadius] = useState(0.4);

  const floorMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#1c1c1e", roughness: 0.9, metalness: 0.05 }),
    []
  );
  const wallMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#1a1a1c", roughness: 0.85, metalness: 0.05 }),
    []
  );
  const pedestalMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#252527", roughness: 0.7, metalness: 0.1 }),
    []
  );
  const archMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#141416", roughness: 0.95, metalness: 0.0, side: THREE.DoubleSide }),
    []
  );

  const archGeo = useMemo(
    () => createArchFrameGeometry(6, 4.5, 2.6, 1.8, 0.18),
    []
  );

  return (
    <>
      <ambientLight intensity={0.15} />
      <spotLight
        position={[1.5, 4, 2]}
        angle={0.35}
        penumbra={0.6}
        intensity={60}
        color="#fff5e0"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
      />
      <rectAreaLight
        position={[-2, 1.5, -1.5]}
        width={1.5}
        height={2}
        intensity={1.2}
        color="#ffb347"
        rotation={[0, Math.PI / 4, 0]}
      />

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[8, 8]} />
        <primitive object={floorMat} attach="material" />
      </mesh>

      <mesh receiveShadow position={[0, 2.5, -2.5]}>
        <boxGeometry args={[8, 5, 0.1]} />
        <primitive object={wallMat} attach="material" />
      </mesh>

      <mesh receiveShadow position={[-3, 2.5, 0]}>
        <boxGeometry args={[0.1, 5, 5]} />
        <primitive object={wallMat} attach="material" />
      </mesh>

      <mesh receiveShadow position={[3, 2.5, 0]}>
        <boxGeometry args={[0.1, 5, 5]} />
        <primitive object={wallMat} attach="material" />
      </mesh>

      <mesh castShadow position={[0, 0, 1.5]}>
        <primitive object={archGeo} attach="geometry" />
        <primitive object={archMat} attach="material" />
      </mesh>

      <mesh castShadow receiveShadow position={[0, 0.04, 0]}>
        <cylinderGeometry args={[pedestalRadius, pedestalRadius * 1.02, 0.08, 48]} />
        <primitive object={pedestalMat} attach="material" />
      </mesh>

      <Suspense fallback={null}>
        <ModelOnPedestal url={modelUrl} pedestalTopY={0.08} setPedestalRadius={setPedestalRadius} onLoad={onLoad} />
      </Suspense>
    </>
  );
}

function WarmMinimalScene({
  modelUrl,
  onLoad,
}: {
  modelUrl: string;
  onLoad?: () => void;
}) {
  const [pedestalSize, setPedestalSize] = useState({ w: 0.8, d: 0.8 });

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
    () => new THREE.MeshStandardMaterial({ color: "#f0ebe3", roughness: 0.6, metalness: 0 }),
    []
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

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <primitive object={floorMat} attach="material" />
      </mesh>

      <mesh receiveShadow position={[0, 2.5, -2.5]}>
        <boxGeometry args={[10, 5, 0.1]} />
        <primitive object={wallMat} attach="material" />
      </mesh>

      <mesh castShadow receiveShadow position={[-2.2, 1.5, -1]}>
        <boxGeometry args={[0.25, 3, 1.2]} />
        <primitive object={panelMat} attach="material" />
      </mesh>

      <mesh castShadow receiveShadow position={[2.2, 1.5, -1]}>
        <boxGeometry args={[0.25, 3, 1.2]} />
        <primitive object={panelMat} attach="material" />
      </mesh>

      <mesh castShadow receiveShadow position={[0, 0.025, 0]}>
        <boxGeometry args={[pedestalSize.w, 0.05, pedestalSize.d]} />
        <primitive object={pedestalMat} attach="material" />
      </mesh>

      <Suspense fallback={null}>
        <ModelOnPedestal url={modelUrl} pedestalTopY={0.05} setPedestalRadius={setPedestalRadius} onLoad={onLoad} />
      </Suspense>
    </>
  );
}

export function ThreeStudioViewer({ modelUrl, theme, onLoad }: ThreeStudioViewerProps) {
  const [introDone, setIntroDone] = useState(false);

  return (
    <div style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      <Canvas
        shadows
        camera={{ fov: 45, near: 0.1, far: 50, position: [0, 1.2, 3.2] }}
        gl={{
          antialias: true,
          outputColorSpace: THREE.SRGBColorSpace,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        style={{ background: "transparent" }}
      >
        <CameraIntro onDone={() => setIntroDone(true)} />
        <OrbitControls
          enabled={introDone}
          enableDamping
          dampingFactor={0.08}
          minDistance={1}
          maxDistance={7}
          maxPolarAngle={Math.PI / 2 - 0.05}
          target={[0, 0.4, 0]}
        />

        {theme === "dark-alcove" && (
          <DarkAlcoveScene modelUrl={modelUrl} onLoad={onLoad} />
        )}
        {theme === "warm-minimal" && (
          <WarmMinimalScene modelUrl={modelUrl} onLoad={onLoad} />
        )}
      </Canvas>
    </div>
  );
}
