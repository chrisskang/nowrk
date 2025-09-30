"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import {
  Environment,
  OrbitControls,
  OrthographicCamera,
} from "@react-three/drei";

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uOrigin1;
  uniform vec3 uOrigin2;
  uniform float uRadius;
  uniform float uRoundness;
  uniform vec2 uMouse;
  uniform vec3 uSize;
  uniform vec2 uResolution;
  uniform bool uDebug;

  vec4 opElongate(in vec3 p, in vec3 h) {
      vec3 q = abs(p) - h;
      return vec4(max(q, 0.0), min(max(q.x, max(q.y, q.z)), 0.0));
  }

  float sphereSDF(vec3 p, vec3 center, float radius) {
      vec3 d = p - center;
      return length(d) - radius;
  }

  float squircleSDF(vec3 p, vec3 center, float radius, float n, vec3 size) {
      vec3 q = p - center;
      vec4 w = opElongate(q, size);
      return w.w + (pow(pow(abs(w.x) / radius, n) + pow(abs(w.y) / radius, n), 1.0 / n) + pow(abs(w.z) / radius, n) - 1.0) * radius * 0.5;
  }

  float smoothUnion(float d1, float d2, float k) {
    float h = clamp(0.5 + 0.5*(d2 - d1)/k, 0.0, 1.0);
    return mix(d2, d1, h) - k*h*(1.0 - h);
  }

  float sceneSDF(vec3 p, float t) {
    vec3 center1 = uOrigin1;
    vec3 center2 = uOrigin2;
    vec2 mouse = uMouse;
    mouse.x *= uResolution.x / uResolution.y;

    vec3 center3 = vec3(mouse, 0.0);
    float radius = uRadius;
    float roundness = uRoundness; // higher n makes shape closer to square in xy plane
    vec3 size = uSize;

    float d1 = squircleSDF(p, center1, radius, roundness, vec3(0.6,0.0,0.0));
    float d2 = squircleSDF(p, center2, radius, roundness, vec3(0.0));
    float d3 = squircleSDF(p, center3, radius, roundness, vec3(0.0));
    float d4 = sphereSDF(p, center3, 0.1);
    float d5 = sphereSDF(p, center1, 0.1);
    return smoothUnion(d1,d4,0.1);
  }
    

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    uv.x *= uResolution.x / uResolution.y;
    

    if (uDebug) {
      // Crosshair at (0,0)
      float lineX = 1.0 - smoothstep(0.0, 0.002, abs(uv.x));
      float lineY = 1.0 - smoothstep(0.0, 0.002, abs(uv.y));
      float cross = max(lineX, lineY);
      if (cross > 0.0) {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        return;
      }

      // Blue dot at uOrigin1
      float dotSize = 0.02;
      float distToOrigin = length(uv - uOrigin1.xy);
      if (distToOrigin < dotSize) {
        gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0);
        return;
      }

      // Gradient background for orientation
      vec3 debugColor = vec3(
        (uv.x + 1.0) * 0.5,
        (uv.y + 1.0) * 0.5,
        0.0
      );
      gl_FragColor = vec4(debugColor, 1.0);
      return;
    }
    
    float t = uTime;
    
  
    vec3 p = vec3(uv, 0.0);
    float d = sceneSDF(p, t);


    float edgeThickness = fwidth(d);

    float alpha = 1.0 - smoothstep(0.0, edgeThickness, d);
    

    vec3 color = mix(vec3(1.0), vec3(0.0), alpha);
    gl_FragColor = vec4(color, 1.0);
  }
`;

//vec3 color = vec3(0.0);
//gl_FragColor = vec4(color, alpha);

//vec3 color = mix(vec3(1.0), vec3(0.0), alpha);
//gl_FragColor = vec4(color, 1.0);

function SDF({
  uOrigin1,
  uOrigin2,
  uRadius,
  uRoundness,
  uSize,
}: {
  uOrigin1: [number, number, number];
  uOrigin2: [number, number, number];
  uRadius: number;
  uRoundness: number;
  uSize: [number, number, number];
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useEffect(() => {
    function onMouseMove(event: MouseEvent) {
      if (!materialRef.current) return;
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -((event.clientY / window.innerHeight) * 2 - 1);
      materialRef.current.uniforms.uMouse.value.set(x, y);
    }
    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  useEffect(() => {
    function handleResize() {
      if (materialRef.current) {
        materialRef.current.uniforms.uResolution.value.set(
          window.innerWidth,
          window.innerHeight
        );
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uOrigin1.value.set(...uOrigin1);
    }
  }, [uOrigin1]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uOrigin2.value.set(...uOrigin2);
    }
  }, [uOrigin2]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uRadius.value = uRadius;
    }
  }, [uRadius]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uRoundness.value = uRoundness;
    }
  }, [uRoundness]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uSize.value.set(...uSize);
    }
  }, [uSize]);

  return (
    <mesh>
      <planeGeometry args={[window.innerWidth, window.innerHeight]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uOrigin1: { value: new THREE.Vector3(...uOrigin1) },
          uOrigin2: { value: new THREE.Vector3(...uOrigin2) },
          uRadius: { value: uRadius },
          uRoundness: { value: uRoundness },
          uMouse: { value: new THREE.Vector2(0, 0) },
          uSize: { value: new THREE.Vector3(...uSize) },
          uResolution: {
            value: new THREE.Vector2(window.innerWidth, window.innerHeight),
          },
          uDebug: { value: false },
        }}
      />
    </mesh>
  );
}

export default function GooeyHeader() {
  const [uOrigin1, setUOrigin1] = useState<[number, number, number]>([0, 0, 0]);
  const [uOrigin2, setUOrigin2] = useState<[number, number, number]>([
    0.0, 0, 0,
  ]);
  const [uRadius, setURadius] = useState<number>(0.1);
  const [uRoundness, setURoundness] = useState<number>(2.5);
  const [uSize, setUSize] = useState<[number, number, number]>([0.6, 0.0, 0.0]);

  return (
    <div className="w-screen h-screen border-2 border-blue-300">
      {/* R3F Canvas */}
      <Canvas>
        <OrthographicCamera
          makeDefault
          zoom={1}
          near={1}
          far={2000}
          position={[0, 0, 1]}
        />
        <SDF
          uOrigin1={uOrigin1}
          uOrigin2={uOrigin2}
          uRadius={uRadius}
          uRoundness={uRoundness}
          uSize={uSize}
        />
      </Canvas>
    </div>
  );
}
