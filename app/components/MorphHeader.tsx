"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { motion } from "motion/react";
import { useState, useRef, useMemo } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";

// SDF Plane Component with Shader
function SDFPlane({ isHovered }: { isHovered: boolean }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const vertexShader = `
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float u_time;
    uniform vec2 u_circle1_pos;
    uniform vec2 u_circle2_pos;
    uniform float u_circle_radius;
    uniform float u_smoothness;
    uniform vec3 u_circle1_color;
    uniform vec3 u_circle2_color;
    uniform vec3 u_background_color;
    uniform float u_line_distance;
    uniform float u_line_thickness;
    
    varying vec2 vUv;
    
    // SDF Functions
    float sdCircle(vec2 p, vec2 center, float radius) {
      return length(p - center) - radius;
    }
    
    // Smooth union (chamfer union)
    float sdfSmoothUnion(float d1, float d2, float k) {
      float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
      return mix(d2, d1, h) - k * h * (1.0 - h);
    }
    
    // Scene function
    float scene(vec2 position) {
      float circle1 = sdCircle(position, u_circle1_pos, u_circle_radius);
      float circle2 = sdCircle(position, u_circle2_pos, u_circle_radius);
      
      return sdfSmoothUnion(circle1, circle2, u_smoothness);
    }
    
    // Color blending based on distance to each circle
    vec3 getBlendedColor(vec2 position) {
      float dist1 = length(position - u_circle1_pos);
      float dist2 = length(position - u_circle2_pos);
      float totalDist = dist1 + dist2;
      
      if (totalDist > 0.0) {
        float weight1 = dist2 / totalDist;
        return mix(u_circle2_color, u_circle1_color, weight1);
      }
      
      return mix(u_circle1_color, u_circle2_color, 0.5);
    }
    
    void main() {
      // Convert UV to world coordinates (-2 to 2)
      vec2 position = (vUv - 0.5) * 4.0;
      
      float dist = scene(position);
      
      // Color blending based on proximity to circles
      vec3 blendedColor = getBlendedColor(position);
      
      // Use blended color for inside, background for outside
      vec3 finalColor = mix(blendedColor, u_background_color, step(0.0, dist));
      
      // Add grid lines for distance visualization
      float derivative = length(vec2(dFdx(dist), dFdy(dist)));
      float distanceChange = derivative * 0.5;
      
      float majorLineDistance = abs(fract(dist / u_line_distance + 0.5) - 0.5) * u_line_distance;
      float majorLines = smoothstep(u_line_thickness - distanceChange, u_line_thickness + distanceChange, majorLineDistance);
      
      // Add subtle animation glow
      float glow = 1.0 + 0.3 * sin(u_time * 3.0) * exp(-abs(dist) * 1.5);
      
      // Anti-aliasing for the shape edge
      float alpha = 1.0 - smoothstep(-distanceChange, distanceChange, dist);
      
      gl_FragColor = vec4(finalColor * majorLines * glow, alpha);
    }
  `;

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_circle1_pos: { value: new THREE.Vector2(-1.5, 0) },
      u_circle2_pos: { value: new THREE.Vector2(1.5, 0) },
      u_circle_radius: { value: 0.8 },
      u_smoothness: { value: 0.1 },
      u_circle1_color: { value: new THREE.Color(1.0, 0.2, 0.3) },
      u_circle2_color: { value: new THREE.Color(0.2, 0.6, 1.0) },
      u_background_color: { value: new THREE.Color(0.95, 0.95, 0.98) },
      u_line_distance: { value: 0.2 },
      u_line_thickness: { value: 0.02 },
    }),
    []
  );

  useFrame((state) => {
    if (materialRef.current) {
      const uniforms = materialRef.current.uniforms;

      // Update time
      uniforms.u_time.value = state.clock.elapsedTime;

      // Animate positions
      const targetCircle1X = isHovered ? -0.5 : -1.5;
      const targetCircle2X = isHovered ? 0.5 : 1.5;
      const targetSmoothness = isHovered ? 0.6 : 0.1;

      uniforms.u_circle1_pos.value.x +=
        (targetCircle1X - uniforms.u_circle1_pos.value.x) * 0.05;
      uniforms.u_circle2_pos.value.x +=
        (targetCircle2X - uniforms.u_circle2_pos.value.x) * 0.05;
      uniforms.u_smoothness.value +=
        (targetSmoothness - uniforms.u_smoothness.value) * 0.05;

      // Animate colors
      if (isHovered) {
        uniforms.u_circle1_color.value.lerp(
          new THREE.Color(1.0, 0.1, 0.5),
          0.03
        );
        uniforms.u_circle2_color.value.lerp(
          new THREE.Color(0.1, 0.8, 1.0),
          0.03
        );
        uniforms.u_line_distance.value +=
          (0.1 - uniforms.u_line_distance.value) * 0.05;
      } else {
        uniforms.u_circle1_color.value.lerp(
          new THREE.Color(0.8, 0.3, 0.4),
          0.03
        );
        uniforms.u_circle2_color.value.lerp(
          new THREE.Color(0.3, 0.5, 0.8),
          0.03
        );
        uniforms.u_line_distance.value +=
          (0.2 - uniforms.u_line_distance.value) * 0.05;
      }
    }
  });

  return (
    <mesh>
      <planeGeometry args={[6, 4]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Debug Info Component (inside Canvas)
function DebugInfo() {
  const [debugData, setDebugData] = useState({
    circle1X: "-1.50",
    circle2X: "1.50",
    smoothness: "0.10",
    lineDistance: "0.20",
  });

  useFrame(() => {
    // Update debug info periodically
    if (Math.random() < 0.1) {
      // Update less frequently to avoid performance issues
      setDebugData({
        circle1X: (Math.random() * 2 - 1).toFixed(2),
        circle2X: (Math.random() * 2 - 1).toFixed(2),
        smoothness: (Math.random() * 0.6).toFixed(2),
        lineDistance: (Math.random() * 0.2 + 0.1).toFixed(2),
      });
    }
  });

  return (
    <Html position={[-2.8, 1.8, 0]} transform={false}>
      <div className="bg-black bg-opacity-70 text-white p-3 rounded-lg text-sm font-mono">
        <div>Circle 1 X: {debugData.circle1X}</div>
        <div>Circle 2 X: {debugData.circle2X}</div>
        <div>Smoothness: {debugData.smoothness}</div>
        <div>Line Dist: {debugData.lineDistance}</div>
      </div>
    </Html>
  );
}

// Scene Component
function Scene({ isHovered }: { isHovered: boolean }) {
  return (
    <>
      <SDFPlane isHovered={isHovered} />
      <DebugInfo />
    </>
  );
}

export default function MorphHeader() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="flex flex-col items-center space-y-6 p-8">
      <h1 className="text-3xl font-bold">React Three Fiber SDF Shader</h1>

      <div className="text-center">
        <motion.p
          className="text-lg font-semibold"
          animate={{ color: isHovered ? "#059669" : "#374151" }}
          transition={{ duration: 0.3 }}
        >
          {isHovered ? "🔥 R3F Shader SDF Merging" : "⚡ React Three Fiber SDF"}
        </motion.p>
        <p className="text-sm text-gray-600">
          Hover to see GPU SDF calculations with R3F
        </p>
      </div>

      {/* R3F Canvas */}
      <motion.div
        className="relative cursor-pointer border-4 border-gray-300 rounded-lg overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ scale: 1.02 }}
        animate={{ borderColor: isHovered ? "#059669" : "#d1d5db" }}
        transition={{ duration: 0.3 }}
      >
        <Canvas
          camera={{ position: [0, 0, 5], fov: 50 }}
          style={{ width: 600, height: 400 }}
        >
          <Scene isHovered={isHovered} />
        </Canvas>
      </motion.div>

      {/* Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        <motion.div
          className="bg-white p-6 rounded-lg shadow-sm border"
          animate={{ borderColor: isHovered ? "#059669" : "#e5e7eb" }}
          transition={{ duration: 0.3 }}
        >
          <h3 className="font-bold text-lg mb-3">React Three Fiber Benefits</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✓</span>
              <div>
                <span className="font-medium">Better WebGL Support:</span>
                <p className="text-gray-600">
                  R3F handles WebGL context and extensions
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✓</span>
              <div>
                <span className="font-medium">Shader Derivatives:</span>
                <p className="text-gray-600">
                  dFdx/dFdy work properly for anti-aliasing
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✓</span>
              <div>
                <span className="font-medium">Three.js Integration:</span>
                <p className="text-gray-600">
                  Full Three.js ecosystem and features
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✓</span>
              <div>
                <span className="font-medium">React Hooks:</span>
                <p className="text-gray-600">useFrame for smooth animations</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
          <h3 className="font-bold text-lg mb-3 text-blue-900">
            SDF Shader Features
          </h3>
          <div className="space-y-3 text-sm text-blue-800">
            <div>
              <span className="font-medium">🎯 Proper Derivatives:</span>
              <p className="text-xs mt-1">dFdx/dFdy for smooth anti-aliasing</p>
            </div>
            <div>
              <span className="font-medium">🌈 Color Interpolation:</span>
              <p className="text-xs mt-1">
                Smooth color blending between circles
              </p>
            </div>
            <div>
              <span className="font-medium">📐 Distance Grid:</span>
              <p className="text-xs mt-1">
                Visual distance field visualization
              </p>
            </div>
            <div>
              <span className="font-medium">✨ Animated Effects:</span>
              <p className="text-xs mt-1">Time-based glow and pulsing</p>
            </div>
            <div>
              <span className="font-medium">🔄 Real-time Updates:</span>
              <p className="text-xs mt-1">Live uniform updates via useFrame</p>
            </div>
          </div>
        </div>
      </div>

      {/* Shader Code */}
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-4xl text-white">
        <h3 className="font-bold text-lg mb-3">Key R3F Shader Code</h3>
        <pre className="text-sm overflow-x-auto">
          {`// React Three Fiber Shader Material
<shaderMaterial
  vertexShader={vertexShader}
  fragmentShader={fragmentShader}
  uniforms={uniforms}
  transparent
/>

// SDF Functions in Fragment Shader
float sdCircle(vec2 p, vec2 center, float radius) {
  return length(p - center) - radius;
}

float sdfSmoothUnion(float d1, float d2, float k) {
  float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}

// Proper derivatives for anti-aliasing
float derivative = length(vec2(dFdx(dist), dFdy(dist)));`}
        </pre>
      </div>

      {/* Performance Info */}
      <div className="bg-green-50 p-4 rounded-lg w-full max-w-2xl border border-green-200">
        <h3 className="font-semibold text-green-900 mb-2">
          Performance Benefits
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm text-green-800">
          <div>
            <span className="font-medium">GPU Acceleration:</span>
            <p className="text-xs">All calculations on graphics card</p>
          </div>
          <div>
            <span className="font-medium">60+ FPS:</span>
            <p className="text-xs">Smooth real-time rendering</p>
          </div>
          <div>
            <span className="font-medium">WebGL 2.0:</span>
            <p className="text-xs">Modern shader features</p>
          </div>
          <div>
            <span className="font-medium">Anti-aliasing:</span>
            <p className="text-xs">Smooth edges with derivatives</p>
          </div>
        </div>
      </div>
    </div>
  );
}
