import { Environment, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";

import GooeyHeader from "~/components/GooeyHeader";

export default function Welcome() {
  return (
    <main className="flex min-h-screen p-10 items-center justify-center bg-yellow-50">
      <GooeyHeader />
    </main>
  );
}
