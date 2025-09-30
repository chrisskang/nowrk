import React from "react";
import BackgroundAnimation from "./BackgroundAnimation";

const WIP = () => {
  return (
    <div>
      <BackgroundAnimation />
      <div className="z-10 w-full max-w-md text-center ">
        <h1 className="text-4xl font-bold mb-4 text-gray-800">Coming Soon!</h1>
        <p className="text-xl mb-8 text-gray-600">
          We're working hard to bring you something amazing. Stay tuned!
        </p>
      </div>
    </div>
  );
};

export default WIP;
