const Headertest = () => {
  return (
    <header className="flex justify-center items-center">
      {/* Works */}

      <div className="bg-black smooth-corners-md px-8 py-4 hover:bg-gray-900 transition-colors duration-300 group">
        <span className="text-white font-medium text-lg tracking-wide relative">
          test
        </span>
      </div>

      <svg width="500" height="300" viewBox="0 0 500 300">
        <path
          fill="#ED2F5B"
          stroke="none"
          d="
      M 0,150
      C 0,0 0,0 250,0
      S 500,0 500,150
        500,300 250,300
        0,300 0,150
    "
        ></path>
      </svg>

      {/* Works */}

      <div className="bg-black rounded-full px-8 py-4 hover:bg-gray-900 transition-colors duration-300 group">
        <span className="text-white font-medium text-lg tracking-wide relative">
          fdsafdafdsafdsafdsa
        </span>
      </div>

      <div className="w-4" />
      {/* Contact */}

      <div className="bg-black rounded-full px-8 py-4 border-gray-800 hover:bg-gray-900 transition-colors duration-300 group">
        <span className="text-white font-medium text-lg tracking-wide relative">
          Contact
        </span>
      </div>

      <div className="w-4" />

      {/* Bio */}

      <div className="bg-black rounded-full px-8 py-4 hover:bg-gray-900 transition-colors duration-300 group">
        <span className="text-white font-medium text-lg tracking-wide relative">
          Bio
        </span>
      </div>
    </header>
  );
};

export default Headertest;
