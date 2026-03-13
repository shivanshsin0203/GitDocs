import { Button } from "@/components/ui/button";

function App() {
  return (
    <div className="relative bg-black w-screen flex flex-col items-center justify-center h-screen overflow-hidden">
      {/* Animated background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-600/20 blur-[120px] animate-pulse" />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-[100px] animate-pulse delay-1000" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        <h1 className="text-5xl font-bold text-white tracking-tight">
          Welcome to{" "}
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
            GitDocs
          </span>
        </h1>
        <h2 className="text-lg text-gray-400 max-w-md text-center">
          Collaborate, create, and manage your documentation with ease.
        </h2>

        {/* Login Button */}
        <Button
          id="login-button"
          size="lg"
          className="relative mt-4 px-8 py-3 h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-purple-600 via-pink-500 to-blue-500 text-white border-0 shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:shadow-[0_0_50px_rgba(168,85,247,0.6)] hover:scale-105 transition-all duration-300 cursor-pointer"
        >
          🚀 Login to GitDocs
        </Button>
      </div>
    </div>
  );
}

export default App;
