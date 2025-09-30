import {
  Bounds,
  Environment,
  OrbitControls,
  Stats,
  useBounds,
} from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import React, { useEffect, useRef } from "react";
import { MathUtils, OctahedronGeometry, Vector3, Mesh } from "three";
import { useControls } from "leva";

const SquircleCanvas = () => {
  return (
    <Canvas camera={{ position: [0, 2, -1.5] }}>
      <Environment preset="city" background />
      <Bounds fit margin={1.8} damping={10}>
        <Squircle />
      </Bounds>
      <OrbitControls target={[0, 1, 0]} autoRotate />
      <Stats />
    </Canvas>
  );
};

function Squircle() {
  const ref = useRef<Mesh>(null);
  const bounds = useBounds();
  const data = { n: 2 };
  const { n } = useControls("Squircle", {
    n: { value: 1.3, min: -64, max: 64, step: 0.1 },
  });

  function generateSquircle(n: number) {
    const g = new OctahedronGeometry(1, 16);
    const p = g.attributes.position.array;

    for (let i = 0; i < p.length; i += 3) {
      const v = new Vector3(p[i], p[i + 1], p[i + 2]);
      v.x = Math.tanh(v.x);
      v.y = Math.tanh(v.y);
      v.z = Math.tanh(v.z);
      p[i] = MathUtils.lerp(p[i], v.x, n);
      p[i + 1] = MathUtils.lerp(p[i + 1], v.y, n);
      p[i + 2] = MathUtils.lerp(p[i + 2], v.z, n);
    }
    g.computeBoundingBox();
    return g;
  }

  useEffect(() => {
    if (ref.current) {
      ref.current.geometry.dispose();
      ref.current.geometry = generateSquircle(n);
      bounds.refresh(ref.current).fit();
    }
  }, [n, bounds]);

  return (
    <mesh ref={ref} geometry={generateSquircle(2)} position-y={1}>
      <meshPhysicalMaterial
        metalness={0}
        roughness={0.36}
        clearcoat={1}
        transmission={1}
        ior={1.53}
        thickness={5}
      />
    </mesh>
  );
}

export default SquircleCanvas;
