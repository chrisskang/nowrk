"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { motion } from "framer-motion";
import { useState, useRef, useMemo } from "react";
import * as THREE from "three";

// Base SDF Plane Component
function SDFPlane({
  operation,
  isHovered,
  animationOffset = 0,
  colorScheme = "default",
  leftButtonHover,
  rightButtonHover,
  leftButtonClick,
  rightButtonClick,
  onCirclePositionUpdate,
}: {
  operation: string;
  isHovered: boolean;
  animationOffset?: number;
  colorScheme?: string;
  leftButtonHover: boolean;
  rightButtonHover: boolean;
  leftButtonClick: boolean;
  rightButtonClick: boolean;
  onCirclePositionUpdate?: (leftX: number, rightX: number) => void;
}) {
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
    uniform float u_connection_radius;
    uniform float u_line_distance;
    uniform float u_line_thickness;
    uniform float u_interpolation;
    uniform int u_operation;
    uniform float u_left_button_hover;
    uniform float u_right_button_hover;
    uniform float u_left_button_click;
    uniform float u_right_button_click;
    
    varying vec2 vUv;
    
    // SDF Functions
    float circle(vec2 p, float r) {
      return length(p) - r;
    }
    
    float rectangle(vec2 p, vec2 b) {
      vec2 d = abs(p) - b;
      return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
    }
    
    float capsule(vec2 p, vec2 a, vec2 b, float r) {
      vec2 pa = p - a, ba = b - a;
      float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
      return length(pa - ba * h) - r;
    }
    
    // Combination Operations
    float interpolate(float d1, float d2, float t) {
      return mix(d1, d2, t);
    }
    
    float round_merge(float d1, float d2, float k) {
      vec2 u = max(vec2(k - d1, k - d2), vec2(0.0));
      return max(k, min(d1, d2)) - length(u);
    }
    
    // Scene function
    float scene(vec2 position) {
      float c1 = circle(position - u_circle1_pos, u_circle_radius);
      float c2 = circle(position - u_circle2_pos, u_circle_radius);
      float conn = capsule(position, u_circle1_pos, u_circle2_pos, u_connection_radius);
      
      if (u_operation == 1) { // round_merge
        float result = round_merge(c1, c2, u_smoothness);
        return round_merge(result, conn, u_smoothness * 0.5);
      } else if (u_operation == 7) { // interpolate
        return interpolate(c1, c2, u_interpolation);
      }
      
      return 0.0;
    }
    
    vec3 getColor(vec2 position) {
      float dist1 = length(position - u_circle1_pos);
      float dist2 = length(position - u_circle2_pos);
      float weight = dist2 / (dist1 + dist2 + 0.001);
      
      vec3 baseColor = mix(u_circle1_color, u_circle2_color, weight);
      
      // Button hover effects
      if (dist1 < u_circle_radius + 0.2) {
        baseColor = mix(baseColor, vec3(1.0, 1.0, 1.0), u_left_button_hover * 0.3);
        baseColor = mix(baseColor, vec3(0.8, 1.0, 0.8), u_left_button_click * 0.5);
      }
      if (dist2 < u_circle_radius + 0.2) {
        baseColor = mix(baseColor, vec3(1.0, 1.0, 1.0), u_right_button_hover * 0.3);
        baseColor = mix(baseColor, vec3(0.8, 1.0, 0.8), u_right_button_click * 0.5);
      }
      
      return baseColor;
    }
    
    void main() {
      vec2 position = (vUv - 0.5) * 6.0;
      float dist = scene(position);
      
      vec3 color = getColor(position);
      vec3 finalColor = mix(color, u_background_color, step(0.0, dist));
      
      // Isolines
      float derivative = length(vec2(dFdx(dist), dFdy(dist)));
      float lineDistance = abs(fract(dist / u_line_distance + 0.5) - 0.5) * u_line_distance;
      float lines = smoothstep(u_line_thickness - derivative, u_line_thickness + derivative, lineDistance);
      
      gl_FragColor = vec4(finalColor * lines, 1.0);
    }
  `;

  const getColorScheme = (scheme: string) => {
    switch (scheme) {
      case "blue":
        return [new THREE.Color(0.1, 0.5, 1.0), new THREE.Color(0.0, 0.8, 1.0)];
      case "green":
        return [new THREE.Color(0.2, 0.8, 0.3), new THREE.Color(0.6, 1.0, 0.2)];
      case "purple":
        return [new THREE.Color(0.6, 0.2, 1.0), new THREE.Color(1.0, 0.3, 0.8)];
      default:
        return [new THREE.Color(0.3, 0.7, 1.0), new THREE.Color(1.0, 0.4, 0.3)];
    }
  };

  const [color1, color2] = getColorScheme(colorScheme);

  const getOperationIndex = (op: string) => {
    const ops = [
      "merge",
      "round_merge",
      "chamfer_merge",
      "intersect",
      "round_intersect",
      "subtract",
      "round_subtract",
      "interpolate",
    ];
    return ops.indexOf(op);
  };

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_circle1_pos: { value: new THREE.Vector2(-0.6, 0) }, // Start merged (close together)
      u_circle2_pos: { value: new THREE.Vector2(0.6, 0) }, // Start merged (close together)
      u_circle_radius: { value: 0.5 },
      u_smoothness: { value: 0.6 }, // Start with high smoothness (merged)
      u_circle1_color: { value: color1.clone() },
      u_circle2_color: { value: color2.clone() },
      u_background_color: { value: new THREE.Color(0.98, 0.98, 1.0) },
      u_connection_radius: { value: 0.4 }, // Start with connection visible
      u_line_distance: { value: 0.12 },
      u_line_thickness: { value: 0.012 },
      u_interpolation: { value: 0.5 },
      u_operation: { value: getOperationIndex(operation) },
      u_left_button_hover: { value: 0 },
      u_right_button_hover: { value: 0 },
      u_left_button_click: { value: 0 },
      u_right_button_click: { value: 0 },
    }),
    [operation]
  );

  useFrame((state) => {
    if (materialRef.current) {
      const u = materialRef.current.uniforms;
      const time = state.clock.elapsedTime + animationOffset;

      u.u_time.value = time;

      const speed = 0.15;

      // REVERSED: Start merged, split on hover
      const targetX1 = isHovered ? -1.8 : -0.6; // Split apart when hovered
      const targetX2 = isHovered ? 1.8 : 0.6; // Split apart when hovered
      const targetSmooth = isHovered ? 0.3 : 0.6; // Less smoothness when hovered (more separated)

      u.u_circle1_pos.value.x += (targetX1 - u.u_circle1_pos.value.x) * speed;
      u.u_circle2_pos.value.x += (targetX2 - u.u_circle2_pos.value.x) * speed;
      u.u_smoothness.value += (targetSmooth - u.u_smoothness.value) * speed;

      // Send current circle positions to parent component for button positioning
      if (onCirclePositionUpdate) {
        onCirclePositionUpdate(
          u.u_circle1_pos.value.x,
          u.u_circle2_pos.value.x
        );
      }

      // Update colors
      u.u_circle1_color.value.copy(color1);
      u.u_circle2_color.value.copy(color2);

      // Special animations for interpolate
      if (operation === "interpolate") {
        u.u_interpolation.value = 0.5 + 0.3 * Math.sin(time * 2.0);
      }

      // Connection radius - stronger when not hovered (merged state)
      const distance = Math.abs(
        u.u_circle2_pos.value.x - u.u_circle1_pos.value.x
      );
      const targetConn = Math.max(0, (3.6 - distance) / 3.6) * 0.4;
      u.u_connection_radius.value +=
        (targetConn - u.u_connection_radius.value) * speed;

      // Update button states
      u.u_left_button_hover.value +=
        (leftButtonHover ? 1 : 0 - u.u_left_button_hover.value) * 0.2;
      u.u_right_button_hover.value +=
        (rightButtonHover ? 1 : 0 - u.u_right_button_hover.value) * 0.2;
      u.u_left_button_click.value +=
        (leftButtonClick ? 1 : 0 - u.u_left_button_click.value) * 0.3;
      u.u_right_button_click.value +=
        (rightButtonClick ? 1 : 0 - u.u_right_button_click.value) * 0.3;
    }
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
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

// Shape Morphing Plane Component with Rotated Square
function ShapeMorphPlane({
  isHovered,
  animationOffset = 0,
}: {
  isHovered: boolean;
  animationOffset?: number;
}) {
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
    uniform float u_morph_factor;
    uniform vec2 u_position;
    uniform vec3 u_color1;
    uniform vec3 u_color2;
    uniform vec3 u_background_color;
    uniform float u_line_distance;
    uniform float u_line_thickness;
    
    varying vec2 vUv;
    
    const float PI = 3.14159265359;
    
    // Rotation function
    vec2 rotate(vec2 p, float angle) {
      float c = cos(angle);
      float s = sin(angle);
      return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
    }
    
    // SDF Functions
    float circle(vec2 p, float r) {
      return length(p) - r;
    }
    
    float rectangle(vec2 p, vec2 b) {
      vec2 d = abs(p) - b;
      return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
    }
    
    // Rotated square (45 degrees)
    float rotatedSquare(vec2 p, vec2 b) {
      vec2 rotatedP = rotate(p, PI * 0.25); // 45 degrees
      return rectangle(rotatedP, b);
    }
    
    // Smooth interpolation between circle and rotated square with position
    float morphShape(vec2 position, float t, vec2 pos) {
      float circleShape = circle(position - pos, 0.8);
      float squareShape = rotatedSquare(position - pos, vec2(0.8, 0.8));
      return mix(circleShape, squareShape, t);
    }
    
    vec3 getColor(float t) {
      return mix(u_color1, u_color2, t);
    }
    
    void main() {
      vec2 position = (vUv - 0.5) * 4.0;
      float dist = morphShape(position, u_morph_factor, u_position);
      
      vec3 color = getColor(u_morph_factor);
      vec3 finalColor = mix(color, u_background_color, step(0.0, dist));
      
      // Isolines
      float derivative = length(vec2(dFdx(dist), dFdy(dist)));
      float lineDistance = abs(fract(dist / u_line_distance + 0.5) - 0.5) * u_line_distance;
      float lines = smoothstep(u_line_thickness - derivative, u_line_thickness + derivative, lineDistance);
      
      gl_FragColor = vec4(finalColor * lines, 1.0);
    }
  `;

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_morph_factor: { value: 0 },
      u_position: { value: new THREE.Vector2(0, 0) },
      u_color1: { value: new THREE.Color(0.2, 0.9, 0.5) },
      u_color2: { value: new THREE.Color(0.9, 0.3, 0.7) },
      u_background_color: { value: new THREE.Color(0.98, 0.98, 1.0) },
      u_line_distance: { value: 0.12 },
      u_line_thickness: { value: 0.012 },
    }),
    []
  );

  useFrame((state) => {
    if (materialRef.current) {
      const u = materialRef.current.uniforms;
      const time = state.clock.elapsedTime + animationOffset;

      u.u_time.value = time;

      // Continuous morphing animation
      const morphProgress = 0.5 + 0.5 * Math.sin(time * 1.5);
      u.u_morph_factor.value = morphProgress;

      // Position interpolation: left (-1.5) to right (1.5)
      const positionX = -1.5 + morphProgress * 3.0;
      u.u_position.value.x = positionX;

      // Hover effect - faster morphing
      if (isHovered) {
        const fastMorph = 0.5 + 0.5 * Math.sin(time * 3.0);
        u.u_morph_factor.value = fastMorph;
        u.u_position.value.x = -1.5 + fastMorph * 3.0;
      }
    }
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
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

// Individual Canvas Component
function SDFCanvas({
  operation,
  title,
  isHovered,
  onHover,
  animationOffset = 0,
  colorScheme = "default",
  isShapeMorph = false,
}: {
  operation: string;
  title: string;
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
  animationOffset?: number;
  colorScheme?: string;
  isShapeMorph?: boolean;
}) {
  const [leftButtonHover, setLeftButtonHover] = useState(false);
  const [rightButtonHover, setRightButtonHover] = useState(false);
  const [leftButtonClick, setLeftButtonClick] = useState(false);
  const [rightButtonClick, setRightButtonClick] = useState(false);

  // Track actual circle positions from the shader
  const [leftCircleX, setLeftCircleX] = useState(-0.6);
  const [rightCircleX, setRightCircleX] = useState(0.6);

  // Callback to receive circle positions from the shader
  const handleCirclePositionUpdate = (leftX: number, rightX: number) => {
    setLeftCircleX(leftX);
    setRightCircleX(rightX);
  };

  // Convert shader coordinates to screen percentages
  const convertToScreenPercent = (shaderX: number) => {
    // Shader range: -3 to 3 (6 units total)
    // Screen range: 0% to 100%
    return ((shaderX + 3) / 6) * 100;
  };

  const leftButtonPercent = convertToScreenPercent(leftCircleX);
  const rightButtonPercent = convertToScreenPercent(rightCircleX);

  const handleCanvasClick = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    if (operation !== "round_merge") return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 6;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 4;

    // Use actual circle positions for click detection
    const leftDist = Math.sqrt((x - leftCircleX) ** 2 + y ** 2);
    const rightDist = Math.sqrt((x - rightCircleX) ** 2 + y ** 2);

    if (leftDist < 0.8) {
      setLeftButtonClick(true);
      console.log("Left circle button clicked!");
      setTimeout(() => setLeftButtonClick(false), 200);
    } else if (rightDist < 0.8) {
      setRightButtonClick(true);
      console.log("Right circle button clicked!");
      setTimeout(() => setRightButtonClick(false), 200);
    }
  };

  const handleCanvasMouseMove = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    if (operation !== "round_merge") return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 6;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 4;

    // Use actual circle positions for hover detection
    const leftDist = Math.sqrt((x - leftCircleX) ** 2 + y ** 2);
    const rightDist = Math.sqrt((x - rightCircleX) ** 2 + y ** 2);

    setLeftButtonHover(leftDist < 0.8);
    setRightButtonHover(rightDist < 0.8);
  };

  return (
    <motion.div
      className="relative bg-white rounded-lg border-2 border-gray-200 overflow-hidden cursor-pointer"
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      whileHover={{ scale: 1.02 }}
      animate={{ borderColor: isHovered ? "#059669" : "#d1d5db" }}
      transition={{ duration: 0.2 }}
    >
      <div className="absolute top-2 left-2 z-10 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm font-mono">
        {title}
      </div>
      <Canvas
        camera={{ position: [0, 8, 0], fov: 40, up: [0, 0, 1] }}
        style={{ width: "100%", height: "350px" }}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
      >
        {isShapeMorph ? (
          <ShapeMorphPlane
            isHovered={isHovered}
            animationOffset={animationOffset}
          />
        ) : (
          <SDFPlane
            operation={operation}
            isHovered={isHovered}
            animationOffset={animationOffset}
            colorScheme={colorScheme}
            leftButtonHover={leftButtonHover}
            rightButtonHover={rightButtonHover}
            leftButtonClick={leftButtonClick}
            rightButtonClick={rightButtonClick}
            onCirclePositionUpdate={handleCirclePositionUpdate}
          />
        )}
      </Canvas>
      {/* Moving Button Overlays - only for round_merge */}
      {operation === "round_merge" && (
        <>
          {/* Left Button */}
          <div
            className="absolute pointer-events-none select-none transition-all duration-75 ease-out"
            style={{
              left: `${leftButtonPercent}%`,
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <motion.div
              animate={{
                scale: leftButtonHover ? 1.1 : leftButtonClick ? 0.95 : 1,
              }}
              transition={{ duration: 0.1 }}
            >
              {/* Button Fill */}
              <div
                className="absolute rounded-full"
                style={{
                  width: "60px",
                  height: "60px",
                  backgroundColor: leftButtonHover
                    ? "rgba(255, 255, 0, 0.3)"
                    : leftButtonClick
                    ? "rgba(0, 255, 0, 0.4)"
                    : "rgba(255, 255, 255, 0.1)",
                  border: leftButtonHover
                    ? "2px solid rgba(255, 255, 0, 0.8)"
                    : "2px solid rgba(255, 255, 255, 0.3)",
                  transform: "translate(-50%, -50%)",
                  transition: "all 0.2s ease",
                }}
              />
              {/* Button Text */}
              <div
                className="absolute text-white font-bold text-xs"
                style={{
                  transform: "translate(-50%, -50%)",
                  textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                  opacity: leftButtonHover ? 1 : 0.8,
                  transition: "opacity 0.2s ease",
                }}
              >
                Menu
              </div>
            </motion.div>
          </div>

          {/* Right Button */}
          <div
            className="absolute pointer-events-none select-none transition-all duration-75 ease-out"
            style={{
              left: `${rightButtonPercent}%`,
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <motion.div
              animate={{
                scale: rightButtonHover ? 1.1 : rightButtonClick ? 0.95 : 1,
              }}
              transition={{ duration: 0.1 }}
            >
              {/* Button Fill */}
              <div
                className="absolute rounded-full"
                style={{
                  width: "60px",
                  height: "60px",
                  backgroundColor: rightButtonHover
                    ? "rgba(255, 255, 0, 0.3)"
                    : rightButtonClick
                    ? "rgba(0, 255, 0, 0.4)"
                    : "rgba(255, 255, 255, 0.1)",
                  border: rightButtonHover
                    ? "2px solid rgba(255, 255, 0, 0.8)"
                    : "2px solid rgba(255, 255, 255, 0.3)",
                  transform: "translate(-50%, -50%)",
                  transition: "all 0.2s ease",
                }}
              />
              {/* Button Text */}
              <div
                className="absolute text-white font-bold text-xs"
                style={{
                  transform: "translate(-50%, -50%)",
                  textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                  opacity: rightButtonHover ? 1 : 0.8,
                  transition: "opacity 0.2s ease",
                }}
              >
                Profile
              </div>
            </motion.div>
          </div>
        </>
      )}
    </motion.div>
  );
}

export default function Component() {
  const [hoveredCanvas, setHoveredCanvas] = useState<string | null>(null);

  const operations = [
    { op: "round_merge", title: "round_merge()", color: "green" },
    { op: "interpolate", title: "interpolate()", color: "purple" },
    {
      op: "shape_morph",
      title: "circle → diamond",
      color: "blue",
      isShapeMorph: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">💎 Core SDF Operations</h1>
          <p className="text-xl text-gray-600 mb-2">
            Essential Signed Distance Field operations with diamond morphing
          </p>
          <motion.p
            className="text-lg font-semibold"
            animate={{
              color: hoveredCanvas ? "#059669" : "#374151",
              scale: hoveredCanvas ? 1.05 : 1,
            }}
            transition={{ duration: 0.3 }}
          >
            {hoveredCanvas
              ? `🔥 ${hoveredCanvas} Active`
              : "Hover any canvas to see live SDF operations"}
          </motion.p>
        </div>

        {/* Canvas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {operations.map((item, index) => (
            <SDFCanvas
              key={item.op}
              operation={item.op}
              title={item.title}
              isHovered={hoveredCanvas === item.title}
              onHover={(hovered) =>
                setHoveredCanvas(hovered ? item.title : null)
              }
              animationOffset={index * 0.5}
              colorScheme={item.color}
              isShapeMorph={item.isShapeMorph}
            />
          ))}
        </div>

        {/* Live Status */}
        <motion.div
          className="bg-white rounded-lg p-6 shadow-lg border-2"
          animate={{
            borderColor: hoveredCanvas ? "#059669" : "#e5e7eb",
            backgroundColor: hoveredCanvas ? "#f0fdf4" : "#ffffff",
          }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-center">
            <motion.h3
              className="text-2xl font-bold mb-4"
              animate={{ color: hoveredCanvas ? "#059669" : "#374151" }}
            >
              {hoveredCanvas || "Core SDF Operations"}
            </motion.h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="text-center p-6 bg-green-50 rounded-lg">
                <div className="text-3xl mb-3">🔗</div>
                <div className="font-bold text-green-900 text-lg">
                  round_merge()
                </div>
                <div className="text-sm text-green-700 mt-2">
                  Buttons slide perfectly with circles - synchronized motion
                </div>
              </div>
              <div className="text-center p-6 bg-purple-50 rounded-lg">
                <div className="text-3xl mb-3">🌊</div>
                <div className="font-bold text-purple-900 text-lg">
                  interpolate()
                </div>
                <div className="text-sm text-purple-700 mt-2">
                  Animated blending between shapes over time
                </div>
              </div>
              <div className="text-center p-6 bg-blue-50 rounded-lg">
                <div className="text-3xl mb-3">💎</div>
                <div className="font-bold text-blue-900 text-lg">
                  circle → diamond
                </div>
                <div className="text-sm text-blue-700 mt-2">
                  Shape morphing with 45° rotated square (diamond)
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Operation Details */}
        {hoveredCanvas && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gray-900 rounded-lg p-6 text-white"
          >
            <h3 className="text-xl font-bold mb-3 text-cyan-400">
              {hoveredCanvas} - Live Operation Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-green-400 mb-2">
                  Implementation:
                </h4>
                <p className="font-mono text-gray-300">
                  {hoveredCanvas.includes("circle → diamond")
                    ? "mix(circle(), rotatedSquare(45°), t) + position interpolation"
                    : hoveredCanvas.includes("round_merge")
                    ? "round_merge(circle1, circle2, k) + synchronized button sliding"
                    : hoveredCanvas.includes("interpolate")
                    ? "interpolate(circle1, circle2, sin(time))"
                    : `${hoveredCanvas.replace(
                        "()",
                        ""
                      )}(shape1, shape2, smoothness)`}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-blue-400 mb-2">Features:</h4>
                <ul className="text-gray-300 space-y-1">
                  {hoveredCanvas.includes("circle → diamond") && (
                    <>
                      <li>• 45° rotated square (diamond shape)</li>
                      <li>• Moving interpolation left to right</li>
                      <li>• Synchronized shape + position morphing</li>
                    </>
                  )}
                  {hoveredCanvas.includes("round_merge") && (
                    <>
                      <li>• Real-time shader position tracking</li>
                      <li>• Buttons slide with exact circle motion</li>
                      <li>• Smooth CSS transitions (75ms duration)</li>
                      <li>• Perfect synchronization with SDF animation</li>
                    </>
                  )}
                  {hoveredCanvas.includes("interpolate") && (
                    <>
                      <li>• Continuous animated blending</li>
                      <li>• Sine wave interpolation factor</li>
                      <li>• Faster animation on hover</li>
                    </>
                  )}
                  <li>• Distance field isolines</li>
                  <li>• Real-time GPU rendering</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-purple-400 mb-2">
                  Use Case:
                </h4>
                <p className="text-gray-300">
                  {hoveredCanvas.includes("circle → diamond")
                    ? "Perfect for UI elements that need to transform from circular buttons to diamond-shaped indicators with smooth spatial movement"
                    : hoveredCanvas.includes("round_merge")
                    ? "Perfect for navigation bars where buttons physically slide with the underlying SDF shapes, creating seamless visual continuity"
                    : hoveredCanvas.includes("interpolate")
                    ? "Great for loading animations, morphing icons, or any UI element that needs smooth transitional states"
                    : "Advanced SDF operation for complex UI morphing"}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Technical Implementation */}
        <div className="bg-gray-900 rounded-lg p-6 text-white">
          <h3 className="text-xl font-bold mb-4 text-cyan-400">
            🔧 Perfect Synchronization Implementation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-green-400 mb-3">
                Real-time Position Tracking:
              </h4>
              <pre className="text-sm bg-gray-800 p-3 rounded overflow-x-auto">
                {`// Shader sends actual positions
onCirclePositionUpdate={(leftX, rightX) => {
  setLeftCircleX(leftX)   // Real shader value
  setRightCircleX(rightX) // Real shader value
}}

// Convert to screen coordinates
convertToScreenPercent = (shaderX) => {
  return ((shaderX + 3) / 6) * 100
}

// Buttons use exact positions
left: \`\${convertToScreenPercent(leftCircleX)}%\``}
              </pre>
            </div>
            <div>
              <h4 className="font-semibold text-blue-400 mb-3">
                Smooth CSS Sliding:
              </h4>
              <pre className="text-sm bg-gray-800 p-3 rounded overflow-x-auto">
                {`// CSS transition for smooth sliding
className="transition-all duration-75 ease-out"

// No React state interpolation needed
// Buttons follow shader positions directly
style={{
  left: \`\${leftButtonPercent}%\`,
  top: "50%",
  transform: "translate(-50%, -50%)"
}}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
