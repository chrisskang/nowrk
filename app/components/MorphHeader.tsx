"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { motion } from "motion/react";
import { useState, useRef, useMemo } from "react";
import * as THREE from "three";
import { Html, OrbitControls } from "@react-three/drei";

// SDF Plane Component with Shader
function SDF({ isHovered }: { isHovered: boolean }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const vertexShader = `
    varying vec3 vPos;
    
    void main() {
      vPos = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float u_time;
    uniform vec3 u_circle1_pos;
    uniform vec3 u_circle2_pos;
    uniform float u_circle_radius;
    uniform float u_smoothness;
    uniform vec3 u_circle1_color;
    uniform vec3 u_circle2_color;
    uniform vec3 u_background_color;
    uniform float u_line_distance;
    uniform float u_line_thickness;
    
    varying vec3 vPos;
    
    // SDF Functions
    float sdSphere(vec3 p, vec3 center, float radius) {
      return length(p - center) - radius;
    }

    // Combination Operations
    float interpolate(float d1, float d2, float t) {
      return mix(d1, d2, t);
    }
    
    // Smooth union (chamfer union)
    float sdfSmoothUnion(float d1, float d2, float k) {
      float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
      return mix(d2, d1, h) - k * h * (1.0 - h);
    }
    
    // Scene function
    float scene(vec3 position) {
      float s1 = sdSphere(position, u_circle1_pos, u_circle_radius);
      float s2 = sdSphere(position, u_circle2_pos, u_circle_radius);
      return sdfSmoothUnion(s1, s2, u_smoothness);
    }
    
    // Color blending based on distance to each circle
    vec3 getBlendedColor(vec3 position) {
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
      vec3 position = vPos;
      
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
      u_circle1_pos: { value: new THREE.Vector3(-1.5, 0, 0) },
      u_circle2_pos: { value: new THREE.Vector3(1.5, 0, 0) },
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

export default function MorphHeader() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="flex flex-col items-center space-y-6 p-8">
      <h1 className="text-3xl font-bold">React Three Fiber SDF Shader</h1>

      {/* R3F Canvas */}
      <motion.div
        className="relative cursor-pointer border-4 border-gray-300 rounded-lg overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ scale: 1.02 }}
        animate={{ borderColor: isHovered ? "#059669" : "#d1d5db" }}
        transition={{ duration: 0.2 }}
      >
        <Canvas
          camera={{ position: [0, 0, 5], fov: 50 }}
          style={{ width: 600, height: 400 }}
        >
          <SDF isHovered={isHovered} />
          <OrbitControls />
        </Canvas>
      </motion.div>
    </div>
  );
}
