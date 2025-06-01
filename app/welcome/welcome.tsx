import { Canvas } from "@react-three/fiber";
import BG from "~/components/BG";
import Headertest from "~/components/HeaderTest";
import HeaderTest2 from "~/components/HeaderTest2";
import Landing from "~/components/Landing";
import MorphHeader from "~/components/MorphHeader";
import MorphHeader2 from "~/components/MorphHeader2";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-yellow-50">
      <Landing />
      {/* <Headertest />
      <Canvas>
        <BG />
      </Canvas>

      <MorphHeader />
      <MorphHeader2 />

      <HeaderTest2 /> */}
    </main>
  );
}
