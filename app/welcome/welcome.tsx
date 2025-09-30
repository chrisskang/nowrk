import { Environment, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import BG from "~/components/BG";
import Headertest from "~/components/HeaderTest";

import TestCanvas from "~/components/TestCanvas";
import WIP from "~/components/WIP";
import Squircle from "../components/Squircle";
import MorphHeader2 from "~/components/MorphHeader2";
import MorphHeader from "~/components/MorphHeader";
import MorphHeader3 from "~/components/MorphHeader3";

export default function Welcome() {
  return (
    <main className="flex min-h-screen p-10 items-center justify-center bg-yellow-50">
      {/* <div className="size-auto rounded-xl shadow-xl p-6 flex flex-row ">
        <div className="w-[500px] h-[500px] items-center justify-center">
          <TestCanvas />
        </div>
      </div> */}

      {/* <div className="size-auto rounded-xl shadow-xl p-6 flex flex-row ">
        <div className="w-[500px] h-[500px] items-center justify-center">
          <BG />
        </div>
      </div> */}

      {/* <div className="size-auto rounded-xl shadow-xl p-6 flex flex-row ">
        <MorphHeader />
      </div> */}

      <MorphHeader3 />

      {/* <div className="size-auto rounded-xl shadow-xl p-6 flex flex-row ">
        <Squircle />
      </div> */}
    </main>
  );
}
