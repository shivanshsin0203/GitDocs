import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import Logo from "./components/Logo";
import "./landing-page.css";

const API_BASE = "http://localhost:3000/api/auth";

const LANGUAGES = [
  { name: "Python", color: "#4b8bbe" },
  { name: "Java", color: "#ffbd2e" },
  { name: "JavaScript", color: "#f7df1e" },
  { name: "C++", color: "#aec6ff" },
  { name: "Go", color: "#00acd7" },
  { name: "Rust", color: "#dbb8ff" },
];

const CAPABILITIES = [
  {
    icon: "description",
    title: "Auto-Generate READMEs",
    desc: "Our AI crawls your codebase to understand dependencies, usage patterns, and architecture to build an exhaustive README in seconds.",
  },
  {
    icon: "auto_fix_high",
    title: "Profile Builder",
    desc: "Transform your static GitHub profile into a dynamic landing page with real-time stats, tech stacks, and animated components.",
  },
  {
    icon: "preview",
    title: "Real-time Preview",
    desc: "Edit and visualize your documentation side-by-side with our high-fidelity renderer that mirrors GitHub's exact styling perfectly.",
  },
];

function LandingPage() {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/login`, { credentials: 'include' });
      if (!res.ok) throw new Error("Login request failed");
      const data = await res.json();
      return data.url as string;
    },
    onSuccess: (url) => {
      setIsRedirecting(true);
      window.location.href = url;
    },
  });

  const isLoading = loginMutation.isPending || isRedirecting;

  return (
    <div className="bg-black text-[#e2e2e2] font-sans selection:bg-[#27c93f] selection:text-black antialiased overflow-x-hidden">
      <main>
        {/* Hero Section */}
        <section className="relative pt-20 pb-40 hero-gradient min-h-screen flex flex-col items-center justify-center overflow-hidden">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 dot-grid opacity-[0.35]"></div>
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-white/[0.04] blur-[150px] rounded-full"></div>
            <div className="absolute bottom-[20%] right-[-10%] w-[40%] h-[40%] bg-[#27c93f]/[0.06] blur-[150px] rounded-full"></div>
          </div>
          <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
            <div className="flex flex-col items-center space-y-12">
              <div className="mb-4 hero-fade-up delay-1">
                <Logo size="lg" />
              </div>
              <div className="space-y-6 max-w-4xl hero-fade-up delay-2">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#27c93f]/10 border border-[#27c93f]/25 text-[10px] font-bold uppercase tracking-[0.2em] text-[#27c93f]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#27c93f] animate-pulse shadow-[0_0_8px_#27c93f]"></span>
                  AI README engine
                </span>
                <h1 className="text-6xl md:text-[9rem] font-black text-white leading-[0.9] tracking-tighter text-glow">
                  READMEs <br />
                  <span className="text-[#a1a1a1] opacity-60 italic font-medium">
                    Redefined.
                  </span>
                </h1>
                <p className="text-xl md:text-2xl text-[#a1a1a1] max-w-3xl mx-auto leading-relaxed font-light">
                  The AI engine that writes complete READMEs and{" "}
                  <span className="text-white border-b border-white/30">
                    rebuilds
                  </span>{" "}
                  your GitHub profile in one click.
                  <span className="block mt-2 font-normal text-white/80">
                    Works with any repository: Website, App, Python, Java, JS,
                    and more.
                  </span>
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-6 pt-8 hero-fade-up delay-3">
                <button
                  onClick={() => loginMutation.mutate()}
                  disabled={isLoading}
                  className="group relative bg-white text-black px-10 py-5 rounded-lg font-bold flex items-center justify-center gap-3 hover:bg-neutral-200 transition-all active:scale-95 brand-glow disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isLoading ? (
                    <span className="material-symbols-outlined text-xl animate-spin">sync</span>
                  ) : (
                    <span className="material-symbols-outlined text-xl">login</span>
                  )}
                  {isLoading ? "Redirecting…" : "Login with GitHub"}
                  <div className="absolute -inset-1 bg-[#27c93f]/25 blur-xl group-hover:opacity-100 opacity-0 transition-opacity rounded-lg"></div>
                </button>
                <button
                  className="bg-transparent border border-white/10 text-white px-10 py-5 rounded-lg font-bold hover:bg-white/5 transition-all active:scale-95"
                  onClick={() => navigate("/dashboard")}
                >
                  View Showcase
                </button>
              </div>

              {/* Terminal Animation */}
              <div className="w-full max-w-4xl mt-24 relative px-4 z-20 mx-auto hero-fade-up delay-4">
                <div className="absolute -inset-1 bg-gradient-to-r from-white/10 to-transparent blur opacity-50"></div>
                <div className="relative bg-[#0d1117] rounded-xl overflow-hidden border border-white/10 window-shadow font-mono text-sm sm:text-base">
                  <div className="flex items-center gap-3 px-4 py-3 bg-[#161b22] border-b border-white/5">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                      <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                      <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                    </div>
                    <div className="text-[10px] text-white/30 font-mono flex items-center gap-2">
                      <span className="material-symbols-outlined text-[12px]">
                        terminal
                      </span>
                      gitdocs-engine
                    </div>
                  </div>

                  <div className="p-6 md:p-8 space-y-4 text-left min-h-[380px] bg-[#0d1117] relative">
                    <div className="tl-1 flex items-center gap-3 text-white/70">
                      <span className="text-[#508eff]">~</span>
                      <span className="text-[#27c93f]">❯</span>
                      <span>gitdocs generate --repo user/awesome-project</span>
                    </div>

                    <div className="tl-2 flex items-center gap-3 text-white/50 pl-2">
                      <span className="material-symbols-outlined text-[16px] animate-spin text-[#aec6ff]">
                        sync
                      </span>
                      <span>Cloning repository 'awesome-project'...</span>
                    </div>

                    <div className="tl-3 flex items-center gap-3 text-white/70">
                      <span className="text-[#dbb8ff]">➜</span>
                      <span className="text-white/90">
                        Analyzing codebase structure...
                      </span>
                    </div>

                    <div className="tl-4 flex items-center gap-3 text-white/60 pl-6 border-l-2 border-white/10 ml-2 py-1">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[#ffbd2e]">⚡</span>
                          <span>
                            Detected frameworks: React, Node.js, TailwindCSS
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#508eff]">📦</span>
                          <span>
                            Mapped 42 dependencies &amp; 18 key components
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="tl-5 flex items-center gap-3 text-white/70">
                      <span className="text-[#dbb8ff]">➜</span>
                      <span className="text-white/90">
                        Drafting intelligent README.md...
                      </span>
                    </div>

                    <div className="tl-6 flex items-center gap-3 text-[#27c93f] font-bold mt-4">
                      <span className="material-symbols-outlined text-[18px]">
                        check_circle
                      </span>
                      <span>Documentation successfully generated!</span>
                    </div>

                    <div className="tl-6 flex items-center gap-3 text-white/60 pt-2">
                      <span className="text-[#508eff]">~</span>
                      <span className="text-[#27c93f]">❯</span>
                      <div className="w-2 h-5 bg-white/70 animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Language Compatibility Section */}
        <section className="py-24 border-y border-white/5 bg-black overflow-hidden relative">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#27c93f]/10 to-transparent blur-[80px] opacity-50"></div>
          </div>
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center mb-12">
              <h3 className="text-xs font-bold uppercase tracking-[0.4em] text-white/40 mb-4 flex items-center justify-center gap-2">
                <span className="font-mono text-[#27c93f] not-italic normal-case tracking-normal">❯</span>
                Built for any stack
              </h3>
              <p className="text-2xl text-white font-light">
                Deep codebase analysis across every language.
              </p>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-6 md:gap-16">
              {LANGUAGES.map((lang) => (
                <div
                  key={lang.name}
                  className="flex flex-col items-center gap-3 group"
                >
                  <div
                    className="p-4 rounded-xl bg-white/[0.03] border transition-all duration-300 group-hover:scale-105"
                    style={{
                      borderColor: `${lang.color}30`,
                      boxShadow: `0 0 0 0 ${lang.color}00`,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${lang.color}20`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 0 ${lang.color}00`;
                    }}
                  >
                    <span
                      className="font-bold tracking-tighter text-lg md:text-2xl"
                      style={{ color: lang.color }}
                    >
                      {lang.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Capabilities Section */}
        <section className="py-40 px-6 bg-black relative">
          <div className="max-w-7xl mx-auto">
            <div className="mb-24 space-y-6">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.4em] text-white/40 flex items-center gap-2">
                <span className="font-mono text-[#27c93f] tracking-normal">❯</span>
                Capabilities
              </h2>
              <h3 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-[0.95]">
                Built for developers <br /> who ship.
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {CAPABILITIES.map((card) => (
                <div
                  key={card.title}
                  className="group p-10 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-[#27c93f]/25 transition-all duration-500 flex flex-col h-full"
                >
                  <div className="w-14 h-14 rounded-lg bg-white/5 flex items-center justify-center mb-10 group-hover:bg-[#27c93f] text-white group-hover:text-black transition-all duration-300">
                    <span className="material-symbols-outlined">
                      {card.icon}
                    </span>
                  </div>
                  <h4 className="text-2xl font-bold text-white mb-6">
                    {card.title}
                  </h4>
                  <p className="text-[#a1a1a1] leading-relaxed mb-10 flex-grow font-light">
                    {card.desc}
                  </p>
                  <div className="w-full h-[1px] bg-white/10 overflow-hidden">
                    <div className="h-full bg-[#27c93f] w-0 transition-all duration-700 group-hover:w-full"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Slim final CTA */}
        <section className="py-20 border-t border-white/5 bg-black relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-[#27c93f]/[0.04] to-transparent pointer-events-none"></div>
          <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-2xl md:text-3xl font-black text-white tracking-tighter">
                Generate your first README.
              </p>
              <p className="text-sm text-white/40 mt-1">
                Connect a GitHub repo, get a complete README in under a minute.
              </p>
            </div>
            <button
              onClick={() => loginMutation.mutate()}
              disabled={isLoading}
              className="group relative bg-white text-black px-8 py-3.5 rounded-lg font-bold flex items-center justify-center gap-3 hover:bg-neutral-200 transition-all active:scale-95 brand-glow-sm disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap"
            >
              {isLoading ? (
                <span className="material-symbols-outlined text-xl animate-spin">sync</span>
              ) : (
                <span className="material-symbols-outlined text-xl">login</span>
              )}
              {isLoading ? "Redirecting…" : "Continue with GitHub"}
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 bg-black">
        <div className="flex flex-col md:flex-row justify-between items-center px-8 py-20 max-w-7xl mx-auto gap-12">
          <div className="space-y-6 text-center md:text-left">
            <Logo size="md" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">
              © 2024 gitdocs. Built for developers.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-10">
            {["Privacy", "Terms", "GitHub", "Twitter", "Changelog"].map(
              (link) => (
                <a
                  key={link}
                  className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors"
                  href="#"
                >
                  {link}
                </a>
              )
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
