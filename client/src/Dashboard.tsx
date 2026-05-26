import { useNavigate } from "react-router";
import { useUser } from "./hooks/useUser.tsx";
import Navbar from "./components/Navbar";
import Logo from "./components/Logo";

const Dashboard = () => {
  const { data: user, isLoading } = useUser();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center font-sans antialiased text-[#e2e2e2] selection:bg-[#27c93f] selection:text-black">
        <div className="flex flex-col items-center gap-8 translate-y-[-10%]">
          <div className="relative flex items-center justify-center w-20 h-20">
            <div className="w-full h-full rounded-full border-[3px] border-white/5 border-t-[#27c93f]/80 animate-[spin_1s_cubic-bezier(0.5,0,0.5,1)_infinite] absolute"></div>
            <div className="w-14 h-14 rounded-full border-[3px] border-white/5 border-b-white/30 animate-[spin_1.5s_linear_infinite_reverse] absolute"></div>
            <span
              className="text-3xl font-mono leading-none text-[#27c93f] z-10 animate-pulse"
              style={{ textShadow: "0 0 18px rgba(39,201,63,0.35)" }}
            >
              ❯
            </span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Logo size="sm" />
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#27c93f] rounded-full animate-pulse shadow-[0_0_8px_#27c93f]"></span>
              <p className="text-white/40 text-xs font-mono">
                Synchronizing workspace...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
      <div className="bg-[#000000] text-[#e2e2e2] font-sans selection:bg-[#27c93f] selection:text-black antialiased overflow-x-hidden min-h-screen flex flex-col">
        <Navbar user={user ?? null} />

        <main className="flex-grow pt-12 pb-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="relative w-full sm:w-[320px]">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search repositories..."
                  className="w-full bg-[#0d1117] border border-white/10 text-white text-sm rounded-lg focus:ring-1 focus:ring-[#27c93f]/40 focus:border-[#27c93f]/40 block pl-10 p-2.5 transition-all placeholder-white/30"
                />
              </div>

              <button onClick={() => navigate('/listrepos')} className="bg-white text-black px-5 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-neutral-200 transition-all active:scale-95 text-sm whitespace-nowrap shadow-[0_0_20px_rgba(39,201,63,0.18)]">
                <span className="material-symbols-outlined text-[18px]">add</span>
                Add New
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="group bg-[#0d1117] rounded-xl border border-white/10 hover:border-white/25 transition-all duration-300 flex flex-col h-48 cursor-pointer relative overflow-hidden">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-white/[0.04] to-transparent pointer-events-none"></div>
                <div className="p-6 flex-grow flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:border-white/20 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">terminal</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-white tracking-tight flex items-center gap-2">
                          awesome-project
                          <span className="material-symbols-outlined text-[14px] text-white/0 group-hover:text-white/40 transition-all -ml-2 group-hover:ml-0">
                            arrow_outward
                          </span>
                        </h3>
                        <p className="text-xs text-white/40 font-mono">octocat/awesome-project</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-[#a1a1a1] font-light flex-grow mt-2 line-clamp-2">
                    A highly optimized AI tool for generating automated documentation workflows.
                  </p>
                </div>
                <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-between text-xs text-white/50">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#27c93f] shadow-[0_0_8px_#27c93f]"></span>
                    <span className="font-medium text-white/80">Synced</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono">
                    <span className="material-symbols-outlined text-[14px]">commit</span>
                    4a2b8c9 • 2h ago
                  </div>
                </div>
              </div>

              {/* Card 2 */}
              <div className="group bg-[#0d1117] rounded-xl border border-white/10 hover:border-[#ffbd2e]/30 transition-all duration-300 flex flex-col h-48 cursor-pointer relative overflow-hidden">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-[#ffbd2e]/[0.05] to-transparent pointer-events-none"></div>
                <div className="p-6 flex-grow flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#ffbd2e] group-hover:border-[#ffbd2e]/30 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">javascript</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-white tracking-tight flex items-center gap-2">
                          react-ui-components
                          <span className="material-symbols-outlined text-[14px] text-white/0 group-hover:text-white/40 transition-all -ml-2 group-hover:ml-0">
                            arrow_outward
                          </span>
                        </h3>
                        <p className="text-xs text-white/40 font-mono">octocat/react-ui-components</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-[#a1a1a1] font-light flex-grow mt-2 line-clamp-2">
                    A comprehensive library of accessible, reusable React components built with Tailwind.
                  </p>
                </div>
                <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-between text-xs text-white/50">
                  <div className="flex items-center gap-2 text-[#aec6ff]">
                    <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                    <span className="font-medium">Drafting README...</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono">
                    <span className="material-symbols-outlined text-[14px]">commit</span>
                    8f1e9d2 • Just now
                  </div>
                </div>
              </div>

              {/* Card 3 */}
              <div className="group bg-[#0d1117] rounded-xl border border-white/10 hover:border-[#508eff]/30 transition-all duration-300 flex flex-col h-48 cursor-pointer relative overflow-hidden">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-[#508eff]/[0.05] to-transparent pointer-events-none"></div>
                <div className="p-6 flex-grow flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#508eff] group-hover:border-[#508eff]/30 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">data_object</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-white tracking-tight flex items-center gap-2">
                          python-data-pipeline
                          <span className="material-symbols-outlined text-[14px] text-white/0 group-hover:text-white/40 transition-all -ml-2 group-hover:ml-0">
                            arrow_outward
                          </span>
                        </h3>
                        <p className="text-xs text-white/40 font-mono">octocat/python-data-pipeline</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-[#a1a1a1] font-light flex-grow mt-2 line-clamp-2">
                    ETL pipeline scripts and machine learning model training configurations.
                  </p>
                </div>
                <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-between text-xs text-white/50">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#27c93f] shadow-[0_0_8px_#27c93f]"></span>
                    <span className="font-medium text-white/80">Synced</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono">
                    <span className="material-symbols-outlined text-[14px]">commit</span>
                    1c4a7b9 • 5d ago
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="w-full border-t border-white/5 bg-black mt-auto">
          <div className="flex justify-between items-center px-6 py-8 max-w-7xl mx-auto">
            <Logo size="sm" className="opacity-60" />
            <div className="flex gap-6">
              <a className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors" href="#">
                Support
              </a>
              <a className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors" href="#">
                Docs
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Dashboard;
