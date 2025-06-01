"use client";

import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useState, useEffect, useRef } from "react";

// Proper SDF functions
function sdCircle(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  radius: number
): number {
  const dx = x - centerX;
  const dy = y - centerY;
  return Math.sqrt(dx * dx + dy * dy) - radius;
}

function sdfSmoothUnion(d1: number, d2: number, k: number): number {
  const h = clamp(0.5 + (0.5 * (d2 - d1)) / k, 0.0, 1.0);
  return lerp(d2, d1, h) - k * h * (1.0 - h);
}

// Helper functions
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Render SDF to canvas
function renderSDF(
  canvas: HTMLCanvasElement,
  leftX: number,
  rightX: number,
  radius: number,
  smoothness: number
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;

      // Convert screen coordinates to world coordinates
      const worldX = (x - width / 2) * 2;
      const worldY = (y - height / 2) * 2;

      // Calculate SDF distances
      const leftCircleDist = sdCircle(worldX, worldY, leftX, 0, radius);
      const rightCircleDist = sdCircle(worldX, worldY, rightX, 0, radius);

      // Smooth union of the two circles
      const combinedDist = sdfSmoothUnion(
        leftCircleDist,
        rightCircleDist,
        smoothness
      );

      // Color based on distance
      if (combinedDist < 0) {
        // Inside the shape - blue with gradient
        const intensity = Math.max(0.6, 1 - Math.abs(combinedDist) / 20);
        data[index] = Math.floor(59 * intensity); // R
        data[index + 1] = Math.floor(130 * intensity); // G
        data[index + 2] = Math.floor(246 * intensity); // B
        data[index + 3] = 255; // A
      } else if (combinedDist < 3) {
        // Near the edge - smooth anti-aliasing
        const alpha = Math.max(0, 255 * (1 - combinedDist / 3));
        data[index] = 59;
        data[index + 1] = 130;
        data[index + 2] = 246;
        data[index + 3] = alpha;
      } else {
        // Outside - transparent
        data[index] = 0;
        data[index + 1] = 0;
        data[index + 2] = 0;
        data[index + 3] = 0;
      }
    }
  }

  // Draw connection line between circles
  const lineY = height / 2;
  const lineStartX = Math.max(0, leftX + width / 2 + radius);
  const lineEndX = Math.min(width, rightX + width / 2 - radius);

  if (lineStartX < lineEndX) {
    for (let x = lineStartX; x < lineEndX; x++) {
      const index = (lineY * width + x) * 4;
      data[index] = 255; // R - red line
      data[index + 1] = 100; // G
      data[index + 2] = 100; // B
      data[index + 3] = 180; // A
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

export default function HeaderTest2() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Motion values for smooth animations
  const leftXMotion = useMotionValue(-60);
  const rightXMotion = useMotionValue(60);
  const smoothnessMotion = useMotionValue(10);

  // Spring animations for smooth motion
  const leftXSpring = useSpring(leftXMotion, {
    stiffness: 200,
    damping: 25,
    mass: 0.8,
  });
  const rightXSpring = useSpring(rightXMotion, {
    stiffness: 200,
    damping: 25,
    mass: 0.8,
  });
  const smoothnessSpring = useSpring(smoothnessMotion, {
    stiffness: 150,
    damping: 20,
    mass: 1,
  });

  // Transform values for display
  const distance = useTransform(
    [leftXSpring, rightXSpring],
    (values: number[]) => Math.abs(values[1] - values[0])
  );
  const overlap = useTransform(
    distance,
    (dist: number) => Math.max(0, 80 - dist) // radius * 2 = 80
  );

  // Update motion values when hover state changes
  useEffect(() => {
    if (isHovered) {
      leftXMotion.set(-30);
      rightXMotion.set(30);
      smoothnessMotion.set(30);
    } else {
      leftXMotion.set(-60);
      rightXMotion.set(60);
      smoothnessMotion.set(10);
    }
  }, [isHovered, leftXMotion, rightXMotion, smoothnessMotion]);

  // Render canvas when values change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const unsubscribe = [leftXSpring, rightXSpring, smoothnessSpring].map(
      (spring) =>
        spring.on("change", () => {
          renderSDF(
            canvas,
            leftXSpring.get(),
            rightXSpring.get(),
            40, // radius
            smoothnessSpring.get()
          );
        })
    );

    // Initial render
    renderSDF(
      canvas,
      leftXSpring.get(),
      rightXSpring.get(),
      40,
      smoothnessSpring.get()
    );

    return () => unsubscribe.forEach((unsub) => unsub());
  }, [leftXSpring, rightXSpring, smoothnessSpring]);

  return (
    <div className="flex flex-col items-center space-y-6 p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      <motion.h1
        className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        Signed Distance Field Merging
      </motion.h1>

      <motion.div
        className="text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <motion.p
          className="text-lg font-semibold"
          animate={{
            color: isHovered ? "#059669" : "#374151",
            scale: isHovered ? 1.05 : 1,
          }}
          transition={{ duration: 0.3 }}
        >
          {isHovered ? "🔗 SDF Smooth Union Active" : "⭕ Two Separate SDFs"}
        </motion.p>
        <p className="text-sm text-gray-600">
          Hover to see SDF smooth blending with fluid motion
        </p>
      </motion.div>

      {/* SDF Canvas */}
      <motion.div
        className="cursor-pointer border-2 border-gray-300 rounded-xl overflow-hidden shadow-lg bg-white"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{
          scale: 1.02,
          boxShadow:
            "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        <canvas ref={canvasRef} width={400} height={300} className="block" />
      </motion.div>

      {/* SDF Information */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
      >
        <motion.div
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          whileHover={{
            y: -2,
            boxShadow: "0 10px 25px -3px rgba(0, 0, 0, 0.1)",
          }}
          transition={{ duration: 0.2 }}
        >
          <h3 className="font-bold text-lg mb-3 text-gray-800">
            Live SDF Values
          </h3>
          <div className="space-y-2 text-sm">
            <motion.p>
              <span className="font-medium">Left Circle Center:</span> (
              <motion.span className="font-mono text-blue-600">
                {leftXSpring.get().toFixed(1)}
              </motion.span>
              , 0)
            </motion.p>
            <motion.p>
              <span className="font-medium">Right Circle Center:</span> (
              <motion.span className="font-mono text-blue-600">
                {rightXSpring.get().toFixed(1)}
              </motion.span>
              , 0)
            </motion.p>
            <p>
              <span className="font-medium">Circle Radius:</span>
              <span className="font-mono text-blue-600"> 40</span>
            </p>
            <motion.p>
              <span className="font-medium">Distance Between:</span>
              <motion.span className="font-mono text-green-600">
                {" "}
                {distance.get().toFixed(1)}
              </motion.span>
            </motion.p>
            <motion.p>
              <span className="font-medium">Overlap:</span>
              <motion.span className="font-mono text-purple-600">
                {" "}
                {overlap.get().toFixed(1)}
              </motion.span>
            </motion.p>
            <motion.p>
              <span className="font-medium">Smoothness (k):</span>
              <motion.span className="font-mono text-orange-600">
                {" "}
                {smoothnessSpring.get().toFixed(1)}
              </motion.span>
            </motion.p>
          </div>
        </motion.div>

        <motion.div
          className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100"
          whileHover={{
            y: -2,
            boxShadow: "0 10px 25px -3px rgba(59, 130, 246, 0.15)",
          }}
          transition={{ duration: 0.2 }}
        >
          <h3 className="font-bold text-lg mb-3 text-blue-900">
            SDF Functions
          </h3>
          <div className="space-y-3 text-sm text-blue-800">
            <div>
              <code className="bg-blue-100 px-2 py-1 rounded text-xs">
                sdCircle(x, y, cx, cy, r)
              </code>
              <p className="text-xs mt-1 text-blue-700">
                Returns distance from point to circle edge
              </p>
            </div>
            <div>
              <code className="bg-blue-100 px-2 py-1 rounded text-xs">
                sdfSmoothUnion(d1, d2, k)
              </code>
              <p className="text-xs mt-1 text-blue-700">
                Smoothly blends two distance fields
              </p>
            </div>
            <p className="text-xs">
              <span className="font-medium">Red line:</span> Shows connection
              between circle centers
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Visual Legend */}
      <motion.div
        className="bg-white p-6 rounded-xl w-full max-w-2xl shadow-sm border border-gray-100"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
      >
        <h3 className="font-semibold mb-3 text-gray-800">Visual Guide</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <motion.div
            className="flex items-center space-x-2"
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-4 h-4 bg-blue-500 rounded shadow-sm"></div>
            <span>SDF Interior (distance {"<"} 0)</span>
          </motion.div>
          <motion.div
            className="flex items-center space-x-2"
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-4 h-4 bg-blue-300 rounded shadow-sm"></div>
            <span>SDF Edge (distance ≈ 0)</span>
          </motion.div>
          <motion.div
            className="flex items-center space-x-2"
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-4 h-4 bg-red-400 rounded shadow-sm"></div>
            <span>Connection Line</span>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
