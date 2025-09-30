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

  // Squircle SDF using superquadric formula
  float squircleSDF(vec3 p, vec3 center, float radius, float n) {
    vec3 d = abs(p - center) / radius;
    float val = pow(pow(d.x, n) + pow(d.y, n), 1.0 / n) + pow(d.z, n) - 1.0;
    return val * radius * 0.5;
  }



  float smoothUnion(float d1, float d2, float k) {
    float h = clamp(0.5 + 0.5*(d2 - d1)/k, 0.0, 1.0);
    return mix(d2, d1, h) - k*h*(1.0 - h);
  }

  float sceneSDF(vec3 p, float t) {
    vec3 center1 = vec3(-0.3, 0, 0);
    vec3 center2 = vec3(0.5, 0, 0);
    float radius = 0.2;
    float roundness = 4.0; // higher n makes shape closer to square in xy plane

    float d1 = squircleSDF(p, center1, radius, roundness);
    float d2 = squircleSDF(p, center2, radius, roundness);

    return smoothUnion(d1, d2, 0.5);
  }

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    float t = uTime;
  
    vec3 p = vec3(uv, 0.0);
    float d = sceneSDF(p, t);

    float edgeThickness = fwidth(d);
    float alpha = 1.0 - smoothstep(0.0, edgeThickness, d);

    vec3 color = mix(vec3(1.0), vec3(0.0), alpha);

    gl_FragColor = vec4(color, 1.0);
  }
`;

function SDF() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  return (
    <mesh>
      <planeGeometry args={[500, 500]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime: { value: 0 },
        }}
      />
    </mesh>
  );
}

export default function MorphHeader2() {
  return (
    <div className="w-screen h-screen border-2 border-blue-300">
      {/* R3F Canvas */}
      <Canvas>
        <OrthographicCamera
          makeDefault
          zoom={1}
          near={1}
          far={2000}
          position={[0, 0, 10]}
        />
        <SDF />
      </Canvas>
    </div>
  );
}
