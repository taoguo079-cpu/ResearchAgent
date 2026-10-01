"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Physics,
  useAfterPhysicsStep,
  useBeforePhysicsStep,
  useRapier,
} from "@react-three/rapier";
import {
  Color,
  CurvePath,
  ExtrudeGeometry,
  Group,
  LineCurve3,
  Mesh,
  MeshBasicMaterial,
  Shape,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { NeonPhysics } from "@/features/welcome/neon-physics";
import {
  buildTitleGeometry,
  makeTitleLayout,
} from "@/features/welcome/title-geometry";
import { FIXED_STEP, GRAVITY } from "@/features/welcome/toy-physics";
import styles from "./welcome-scene.module.css";

type Props = {
  connect: (physics: NeonPhysics | null) => void;
  onReady: () => void;
  onFailure: () => void;
};
export function WelcomeScene(props: Props) {
  return (
    <div
      className={styles.scene}
      data-testid="welcome-scene"
      aria-hidden="true"
    >
      <Canvas
        orthographic
        camera={{ position: [0, 0, 2000], zoom: 1, near: 1, far: 5000 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
        fallback={<span>Research Agent</span>}
      >
        <color attach="background" args={["#040a16"]} />
        <ambientLight intensity={1.2} color="#b9d8ff" />
        <directionalLight
          position={[-450, 700, 800]}
          intensity={2.8}
          color="#edf7ff"
        />
        <directionalLight
          position={[600, -100, 400]}
          intensity={1.5}
          color="#2d91ff"
        />
        <Suspense fallback={null}>
          <Physics
            gravity={[0, -GRAVITY, 0]}
            timeStep={FIXED_STEP}
            colliders={false}
          >
            <SceneContents {...props} />
          </Physics>
        </Suspense>
        <Bloom />
      </Canvas>
    </div>
  );
}

function Bloom() {
  const { gl, scene, camera, size } = useThree();
  const composer = useMemo(() => {
    const composer = new EffectComposer(gl);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new Vector2(1, 1), 0.45, 0.4, 0.8));
    composer.addPass(new OutputPass());
    return composer;
  }, [gl, scene, camera]);
  useEffect(() => {
    composer.setSize(size.width, size.height);
  }, [composer, size.width, size.height]);
  useEffect(
    () => () => {
      for (const pass of composer.passes) pass.dispose();
      composer.dispose();
    },
    [composer],
  );
  useFrame((_, delta) => composer.render(delta), 1);
  return null;
}

function SceneContents({ connect, onReady, onFailure }: Props) {
  const { world, rapier } = useRapier();
  const { size, gl } = useThree();
  const physics = useRef<NeonPhysics | null>(null);
  const title = useRef<Group>(null),
    robot = useRef<Group>(null),
    lens = useRef<Group>(null);
  const robotShadow = useRef<Mesh>(null),
    lensShadow = useRef<Mesh>(null);
  const layout = useMemo(
    () => makeTitleLayout(size.width, size.height),
    [size.width, size.height],
  );
  const geometry = useMemo(() => buildTitleGeometry(layout), [layout]);
  useEffect(
    () => () => {
      geometry.front.dispose();
      geometry.back.dispose();
      geometry.sides.dispose();
    },
    [geometry],
  );
  useLayoutEffect(() => {
    const engine = new NeonPhysics(rapier, world);
    physics.current = engine;
    connect(engine);
    onReady();
    return () => {
      connect(null);
      physics.current = null;
      engine.dispose();
    };
  }, [rapier, world, connect, onReady]);
  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault();
      onFailure();
    };
    const canvas = gl.domElement;
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onFailure]);
  useBeforePhysicsStep(() => physics.current?.beforeStep());
  useAfterPhysicsStep(() => physics.current?.sync());
  useFrame(() => {
    const engine = physics.current;
    if (!engine) return;
    if (title.current) {
      const pose = engine.title.translation();
      title.current.position.set(pose.x, pose.y, 0);
      const rotation = engine.title.rotation();
      title.current.quaternion.set(
        rotation.x,
        rotation.y,
        rotation.z,
        rotation.w,
      );
    }
    for (const id of ["robot", "magnifier"] as const) {
      const group = id === "robot" ? robot.current : lens.current;
      const shadow = id === "robot" ? robotShadow.current : lensShadow.current;
      const toy = engine.toys[id];
      if (!group || !shadow) continue;
      group.visible = shadow.visible = !!toy;
      if (!toy) continue;
      const position = toy.body.translation(),
        rotation = toy.body.rotation();
      group.position.set(position.x, position.y, 0);
      group.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
      group.scale.setScalar(engine.scale);
      shadow.position.set(position.x, -size.height / 2 + 7, -50);
      shadow.scale.set(
        (id === "robot" ? 110 : 52) * engine.scale,
        10 * engine.scale,
        1,
      );
      (shadow.material as MeshBasicMaterial).opacity =
        0.18 * Math.max(0.1, 1 - (size.height - toy.y) / size.height);
    }
  });
  return (
    <>
      <group ref={title}>
        <mesh geometry={geometry.front}>
          <meshBasicMaterial
            color={new Color("#3094ff").multiplyScalar(3)}
            toneMapped={false}
          />
        </mesh>
        <mesh geometry={geometry.back}>
          <meshBasicMaterial
            color={new Color("#2581ff").multiplyScalar(1.2)}
            toneMapped={false}
          />
        </mesh>
        <mesh geometry={geometry.sides}>
          <meshStandardMaterial
            color="#146ca8"
            emissive="#1677c7"
            emissiveIntensity={0.65}
            metalness={0.65}
            roughness={0.25}
          />
        </mesh>
      </group>
      <group ref={robot} visible={false}>
        <Robot />
      </group>
      <group ref={lens} visible={false}>
        <Magnifier />
      </group>
      <mesh ref={robotShadow} visible={false}>
        <circleGeometry args={[0.5, 32]} />
        <meshBasicMaterial color="#1695ff" transparent depthWrite={false} />
      </mesh>
      <mesh ref={lensShadow} visible={false}>
        <circleGeometry args={[0.5, 32]} />
        <meshBasicMaterial color="#1695ff" transparent depthWrite={false} />
      </mesh>
    </>
  );
}

function roundedGeometry(
  width: number,
  height: number,
  depth: number,
  radius: number,
) {
  const x = -width / 2,
    y = -height / 2,
    r = Math.min(radius, width / 2, height / 2);
  const shape = new Shape();
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  const geometry = new ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelSize: 2,
    bevelThickness: 2,
    bevelSegments: 3,
    curveSegments: 8,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}
function Shell({
  dimensions,
  position,
  color = "#dceeff",
  emissive = "#000000",
  metalness = 0.3,
}: {
  dimensions: [number, number, number, number];
  position: [number, number, number];
  color?: string;
  emissive?: string;
  metalness?: number;
}) {
  const [w, h, d, r] = dimensions;
  const geometry = useMemo(() => roundedGeometry(w, h, d, r), [w, h, d, r]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={position}>
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        metalness={metalness}
        roughness={0.3}
      />
    </mesh>
  );
}
function Rod({
  from,
  to,
  radius,
  color = "#254966",
}: {
  from: [number, number, number];
  to: [number, number, number];
  radius: number;
  color?: string;
}) {
  const [ax, ay, az] = from,
    [bx, by, bz] = to;
  const geometry = useMemo(() => {
    const path = new CurvePath<Vector3>();
    path.add(new LineCurve3(new Vector3(ax, ay, az), new Vector3(bx, by, bz)));
    return new TubeGeometry(path, 1, radius, 10, false);
  }, [ax, ay, az, bx, by, bz, radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} metalness={0.6} roughness={0.28} />
    </mesh>
  );
}
function Robot() {
  return (
    <group>
      <Shell dimensions={[122, 74, 42, 22]} position={[0, 48, 0]} />
      <Shell dimensions={[98, 86, 40, 28]} position={[0, -27, 0]} />
      <Shell
        dimensions={[96, 43, 3, 13]}
        position={[0, 49, 25]}
        color="#072039"
        emissive="#041626"
        metalness={0.2}
      />
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 20, 52, 29]}>
            <sphereGeometry args={[5, 12, 8]} />
            <meshBasicMaterial
              color={new Color("#66eaff").multiplyScalar(1.7)}
              toneMapped={false}
            />
          </mesh>
          <Rod from={[side * 42, -5, 0]} to={[side * 72, -20, 0]} radius={7} />
          <mesh position={[side * 72, -20, 0]}>
            <sphereGeometry args={[12, 16, 12]} />
            <meshStandardMaterial
              color="#dceeff"
              metalness={0.25}
              roughness={0.3}
            />
          </mesh>
          <Rod from={[side * 30, -62, 0]} to={[side * 30, -88, 0]} radius={8} />
          <Shell
            dimensions={[30, 23, 28, 8]}
            position={[side * 30, -91, 5]}
            color="#244a6b"
          />
        </group>
      ))}
      <Rod from={[0, 82, 0]} to={[0, 99, 0]} radius={4} />
      <mesh position={[0, 100, 0]}>
        <sphereGeometry args={[5, 16, 12]} />
        <meshBasicMaterial
          color={new Color("#63dfff").multiplyScalar(1.6)}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, -18, 23]}>
        <torusGeometry args={[9, 2, 8, 24]} />
        <meshBasicMaterial color="#4faeff" />
      </mesh>
      <mesh position={[0, -18, 23]}>
        <circleGeometry args={[5, 20]} />
        <meshBasicMaterial
          color={new Color("#4b9eff").multiplyScalar(1.4)}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 35, 29]}>
        <torusGeometry args={[6, 1, 6, 16, Math.PI]} />
        <meshBasicMaterial color="#5091b2" />
      </mesh>
    </group>
  );
}
function Magnifier() {
  return (
    <group>
      <Rod from={[8, -6, 0]} to={[28, -38, 0]} radius={6.5} color="#2c527a" />
      <Rod from={[19, -23, 6]} to={[27, -35, 6]} radius={2} color="#3fafff" />
      <mesh position={[-8, 12, 0]}>
        <torusGeometry args={[25, 4, 10, 48]} />
        <meshStandardMaterial
          color="#9dcced"
          metalness={0.85}
          roughness={0.22}
        />
      </mesh>
      <mesh position={[-8, 12, 2]}>
        <torusGeometry args={[29, 1.2, 6, 48]} />
        <meshBasicMaterial
          color={new Color("#399dff").multiplyScalar(1.5)}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[-8, 12, 0.5]}>
        <circleGeometry args={[22, 48]} />
        <meshPhysicalMaterial
          color="#78d7ff"
          transparent
          opacity={0.18}
          roughness={0.06}
          metalness={0}
          clearcoat={1}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[-8, 12, 5]} rotation={[0, 0, 0.8]}>
        <torusGeometry args={[17, 1.6, 6, 20, 1.1]} />
        <meshBasicMaterial color="#bcefff" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}
