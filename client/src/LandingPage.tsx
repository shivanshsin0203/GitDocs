import { useState, useCallback } from "react";
import "./landing-page.css";

function LandingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = useCallback(() => {
    setIsModalOpen(true);
    document.body.style.overflow = "hidden";
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    document.body.style.overflow = "auto";
  }, []);

  const redirectToGitHub = useCallback((type: "read" | "write") => {
    const CLIENT_ID = "YOUR_GITHUB_CLIENT_ID";
    const SCOPE = type === "write" ? "repo" : "read:user";
    const githubUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=${SCOPE}`;
    window.location.href = githubUrl;
  }, []);

  return (
    <div className="bg-black text-[#e2e2e2] font-inter selection:bg-white selection:text-black antialiased overflow-x-hidden">
      <main>
        {/* Hero Section */}
        <section className="relative pt-20 pb-40 hero-gradient min-h-screen flex flex-col items-center justify-center overflow-hidden">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-white/[0.03] blur-[150px] rounded-full"></div>
            <div className="absolute bottom-[20%] right-[-10%] w-[40%] h-[40%] bg-white/[0.02] blur-[150px] rounded-full"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.05]"></div>
          </div>
          <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
            <div className="flex flex-col items-center space-y-12">
              <div className="text-2xl font-black tracking-tighter text-white mb-4">
                Gitdocs
              </div>
              <div className="space-y-6 max-w-4xl">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-[0.2em] text-[#a1a1a1]">
                  <span
                    className="material-symbols-outlined text-[14px] text-white"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    auto_awesome
                  </span>
                  Engineered for the elite
                </span>
                <h1 className="text-6xl md:text-[9rem] font-black text-white leading-[0.9] tracking-tighter text-glow">
                  READMEs <br />
                  <span className="text-[#a1a1a1] opacity-40 italic font-medium">
                    Redefined.
                  </span>
                </h1>
                <p className="text-xl md:text-2xl text-[#a1a1a1] max-w-3xl mx-auto leading-relaxed font-light">
                  The AI engine that crafts high-conversion READMEs and{" "}
                  <span className="text-white border-b border-white/30">
                    "coolifies"
                  </span>{" "}
                  your GitHub profile in one click.
                  <span className="block mt-2 font-normal text-white/80">
                    Works with any repository: Website, App, Python, Java, JS,
                    and more.
                  </span>
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-6 pt-8">
                <button
                  onClick={openModal}
                  className="group relative bg-white text-black px-10 py-5 rounded-lg font-bold flex items-center justify-center gap-3 hover:bg-neutral-200 transition-all active:scale-95 shadow-[0_20px_50px_rgba(255,255,255,0.1)]"
                >
                  <span className="material-symbols-outlined text-xl">
                    login
                  </span>
                  Login with GitHub
                  <div className="absolute -inset-1 bg-white/20 blur-xl group-hover:opacity-100 opacity-0 transition-opacity rounded-lg"></div>
                </button>
                <button className="bg-transparent border border-white/10 text-white px-10 py-5 rounded-lg font-bold hover:bg-white/5 transition-all active:scale-95">
                  View Showcase
                </button>
              </div>

              {/* Terminal Animation */}
              <div className="w-full max-w-4xl mt-24 relative px-4 z-20 mx-auto">
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

                  <div className="p-6 md:p-8 space-y-4 text-left h-[340px] bg-[#0d1117] relative">
                    <div className="tl-1 flex items-center gap-3 text-white/70">
                      <span className="text-[#508eff]">~</span>
                      <span className="text-[#27c93f]">❯</span>
                      <span>
                        gitdocs generate --repo user/awesome-project
                      </span>
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
                      <span>Documentation successfully generated! ✨</span>
                    </div>

                    <div className="absolute bottom-6 left-6 flex items-center gap-2">
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
          <div className="absolute inset-0 opacity-10">
            <img
              alt="Language compatibility backgrounds"
              className="w-full h-full object-cover blur-3xl scale-150"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDlcnXid5VRIZollN_PfNYaqyJUPbgTarVLYBP5NWrAex7h5PAC9F-jmfegwD4dnbz5kF5WLXiWimGDVW2L1oD1ZwfNvPCz5vJPugArSLcGQ4OcXlXpDFqKxZVow4QN5MGl1cCtOJps2j391xT0QG2lwx3cSMvSytuOMirvpG2IjaznLGA_8kPGCafUk9U0k_96CsPP4NE2ZB9d1DYfEJ5YkmMtiHy2OvQ0_PdEGjRk8jXlLmYjccrdcLAVOjF19QO_ve_TgHNKGPw"
            />
          </div>
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center mb-12">
              <h3 className="text-xs font-bold uppercase tracking-[0.4em] text-white/40 mb-4">
                Unmatched Compatibility
              </h3>
              <p className="text-2xl text-white font-light">
                Deep codebase analysis for every stack.
              </p>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-6 md:gap-16">
              {["Python", "Java", "JavaScript", "C++", "Go", "Rust"].map(
                (lang) => (
                  <div
                    key={lang}
                    className="flex flex-col items-center gap-3 group"
                  >
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 group-hover:border-white/30 transition-colors">
                      <span className="text-white font-bold tracking-tighter text-lg md:text-2xl">
                        {lang}
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </section>

        {/* Capabilities Section */}
        <section className="py-40 px-6 bg-black relative">
          <div className="max-w-7xl mx-auto">
            <div className="mb-24 space-y-6">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.4em] text-white/40">
                Capabilities
              </h2>
              <h3 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-[0.95]">
                Built for high-performance <br /> engineering teams.
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {[
                {
                  icon: "description",
                  title: "Auto-Generate READMEs",
                  desc: "Our AI crawls your codebase to understand dependencies, usage patterns, and architecture to build an exhaustive README in seconds.",
                },
                {
                  icon: "auto_fix_high",
                  title: "Profile Coolifier",
                  desc: "Transform your static GitHub profile into a dynamic landing page with real-time stats, tech stacks, and animated components.",
                },
                {
                  icon: "preview",
                  title: "Real-time Preview",
                  desc: "Edit and visualize your documentation side-by-side with our high-fidelity renderer that mirrors GitHub's exact styling perfectly.",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="group p-10 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all duration-500 flex flex-col h-full"
                >
                  <div className="w-14 h-14 rounded-lg bg-white/5 flex items-center justify-center mb-10 group-hover:bg-white text-white group-hover:text-black transition-all duration-300">
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
                    <div className="h-full bg-white w-0 transition-all duration-700 group-hover:w-full"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-40 relative overflow-hidden bg-black">
          <div className="absolute inset-0 bg-gradient-to-t from-white/[0.05] to-transparent"></div>
          <div className="max-w-5xl mx-auto px-6 relative z-10 text-center space-y-12">
            <h2 className="text-5xl md:text-8xl font-black text-white tracking-tighter leading-none">
              Ready to evolve <br /> your docs?
            </h2>
            <p className="text-2xl text-white/40 max-w-2xl mx-auto font-light leading-relaxed">
              Join over 10,000 developers building the future of open-source
              documentation with Gitdocs.
            </p>
            <div className="flex justify-center pt-8">
              <button
                onClick={openModal}
                className="bg-white text-black px-16 py-6 rounded-lg font-bold text-xl hover:bg-neutral-200 transition-all active:scale-95 flex items-center gap-4"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  bolt
                </span>
                Start Generating Now
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 bg-black">
        <div className="flex flex-col md:flex-row justify-between items-center px-8 py-20 max-w-7xl mx-auto gap-12">
          <div className="space-y-6 text-center md:text-left">
            <div className="text-2xl font-black text-white tracking-tighter">
              Gitdocs AI
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">
              © 2024 Gitdocs AI. Built for the modern architect.
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

      {/* Auth Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm transition-opacity duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="glass-panel border border-white/10 w-full max-w-2xl rounded-2xl overflow-hidden window-shadow transform transition-all">
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  Choose Permissions
                </h3>
                <p className="text-[#a1a1a1] text-sm mt-1">
                  Select how Gitdocs interacts with your repositories.
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-white/40 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4 p-8">
              <button
                onClick={() => redirectToGitHub("read")}
                className="group p-6 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/[0.08] transition-all text-left flex flex-col h-full"
              >
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-6 group-hover:bg-white group-hover:text-black transition-all">
                  <span className="material-symbols-outlined">visibility</span>
                </div>
                <h4 className="text-lg font-bold text-white mb-2">
                  Read-Only
                </h4>
                <p className="text-sm text-[#a1a1a1] leading-relaxed flex-grow">
                  Generate READMEs and copy the code. We{" "}
                  <b>cannot</b> push changes to your repo.
                </p>
                <span className="mt-6 text-[10px] font-bold uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">
                  Select Read-Only
                </span>
              </button>

              <button
                onClick={() => redirectToGitHub("write")}
                className="group p-6 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/[0.08] transition-all text-left flex flex-col h-full"
              >
                <div className="w-10 h-10 rounded-lg bg-[#508eff]/20 text-[#508eff] flex items-center justify-center mb-6 group-hover:bg-[#508eff] group-hover:text-white transition-all">
                  <span className="material-symbols-outlined">
                    edit_square
                  </span>
                </div>
                <h4 className="text-lg font-bold text-white mb-2">
                  Write Access
                </h4>
                <p className="text-sm text-[#a1a1a1] leading-relaxed flex-grow">
                  Directly commit and push generated documentation to your
                  GitHub branches in one click.
                </p>
                <span className="mt-6 text-[10px] font-bold uppercase tracking-widest text-[#508eff] group-hover:brightness-125 transition-colors">
                  Select Full Access
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LandingPage;
