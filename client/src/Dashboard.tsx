import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
interface User {
  avatar: string;
  name: string;
  email: string;
  username: string;
}
const Dashboard = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const avatarBtnRef = useRef<HTMLButtonElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:3000/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      navigate("/");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isDropdownOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        avatarBtnRef.current &&
        !avatarBtnRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isDropdownOpen]);
  useEffect(() => {
    async function fetchUser() {
      setIsLoading(true);
      try {
        const res = await fetch("http://localhost:3000/api/dashboard/me", {
          credentials: "include",
        });
        if (res.status === 401) {
          navigate("/");
          return;
        }
        const data = await res.json();
        setUser(data.user);
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to fetch user:", err);
        setIsLoading(false);
      }
    }
    fetchUser();
  }, [navigate]);
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center font-sans antialiased text-[#e2e2e2]">
        <div className="flex flex-col items-center gap-8 translate-y-[-10%]">
          <div className="relative flex items-center justify-center w-20 h-20">
            <div className="w-full h-full rounded-full border-[3px] border-white/5 border-t-white/80 animate-[spin_1s_cubic-bezier(0.5,0,0.5,1)_infinite] absolute"></div>
            <div className="w-14 h-14 rounded-full border-[3px] border-white/5 border-b-white/50 animate-[spin_1.5s_linear_infinite_reverse] absolute"></div>
            <span className="text-2xl font-black tracking-tighter text-white z-10 animate-pulse">
              G
            </span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-white/90 font-medium tracking-wide text-lg">
              Gitdocs
            </h2>
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
        .window-shadow {
            box-shadow: 0 30px 60px -12px rgba(0,0,0,0.5), 0 18px 36px -18px rgba(0,0,0,0.5);
        }
        ::-webkit-scrollbar {
            width: 8px;
        }
        ::-webkit-scrollbar-track {
            background: transparent;
        }
        ::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
      <div className="bg-[#000000] text-[#e2e2e2] font-sans selection:bg-white selection:text-black antialiased overflow-x-hidden min-h-screen flex flex-col pt-0">
        <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tighter text-white">
                  Gitdocs
                </span>
                <div className="h-6 w-[1px] bg-white/10 mx-2 transform rotate-12"></div>
                <div className="flex items-center gap-2 text-sm font-medium text-white hover:text-white/80 transition-colors cursor-pointer">
                  <img
                    src="https://avatars.githubusercontent.com/u/9919?s=40&v=4"
                    alt="User Org"
                    className="w-5 h-5 rounded-full border border-white/20"
                  />
                  <span>{user?.username}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="text-white/40 hover:text-white transition-colors flex items-center">
                <span className="material-symbols-outlined text-[20px]">
                  notifications
                </span>
              </button>

              <div className="relative">
                <button
                  ref={avatarBtnRef}
                  onClick={toggleDropdown}
                  className="w-8 h-8 rounded-full overflow-hidden border border-white/20 hover:border-white/50 transition-all focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  <img
                    src={user?.avatar}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </button>

                <div
                  ref={dropdownRef}
                  className={`absolute right-0 mt-2 w-48 bg-[#161b22] border border-white/10 rounded-xl shadow-2xl py-1 transform transition-all origin-top-right z-50 ${isDropdownOpen ? "opacity-100 scale-100 block" : "opacity-0 scale-95 hidden"}`}
                >
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-sm text-white font-medium">
                      {user?.name}
                    </p>
                    <p className="text-xs text-[#a1a1a1] truncate">
                      {user?.email}
                    </p>
                  </div>
                  <div className="py-1">
                    <button className="w-full text-left px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 flex items-center gap-2 transition-colors">
                      <span className="material-symbols-outlined text-[16px]">
                        settings
                      </span>
                      Settings
                    </button>
                  </div>
                  <div className="py-1 border-t border-white/5">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-[#ffb4ab] hover:bg-[#ffb4ab]/10 flex items-center gap-2 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        logout
                      </span>
                      Log Out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-6 flex gap-6 text-sm">
            <a
              href="#"
              className="pb-3 border-b-2 border-white text-white font-medium"
            >
              Overview
            </a>
            <a
              href="#"
              className="pb-3 border-b-2 border-transparent text-white/50 hover:text-white transition-colors"
            >
              Integrations
            </a>
            <a
              href="#"
              className="pb-3 border-b-2 border-transparent text-white/50 hover:text-white transition-colors"
            >
              Settings
            </a>
          </div>
        </nav>

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
                  className="w-full bg-[#0d1117] border border-white/10 text-white text-sm rounded-lg focus:ring-1 focus:ring-white/30 focus:border-white/30 block pl-10 p-2.5 transition-all placeholder-white/30"
                />
              </div>

              <button className="bg-white text-black px-5 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-neutral-200 transition-all active:scale-95 text-sm whitespace-nowrap shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                <span className="material-symbols-outlined text-[18px]">
                  add
                </span>
                Add New
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="group bg-[#0d1117] rounded-xl border border-white/10 hover:border-white/30 transition-all duration-300 flex flex-col h-48 cursor-pointer relative overflow-hidden">
                <div className="p-6 flex-grow flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white">
                        <span className="material-symbols-outlined text-[16px]">
                          terminal
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-white tracking-tight flex items-center gap-2">
                          awesome-project
                          <span className="material-symbols-outlined text-[14px] text-white/0 group-hover:text-white/40 transition-all -ml-2 group-hover:ml-0">
                            arrow_outward
                          </span>
                        </h3>
                        <p className="text-xs text-white/40 font-mono">
                          octocat/awesome-project
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-[#a1a1a1] font-light flex-grow mt-2 line-clamp-2">
                    A highly optimized AI tool for generating automated
                    documentation workflows.
                  </p>
                </div>
                <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-between text-xs text-white/50">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#27c93f] shadow-[0_0_8px_#27c93f]"></span>
                    <span className="font-medium text-white/80">Synced</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono">
                    <span className="material-symbols-outlined text-[14px]">
                      commit
                    </span>
                    4a2b8c9 • 2h ago
                  </div>
                </div>
              </div>

              <div className="group bg-[#0d1117] rounded-xl border border-white/10 hover:border-white/30 transition-all duration-300 flex flex-col h-48 cursor-pointer relative overflow-hidden">
                <div className="p-6 flex-grow flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#ffbd2e]">
                        <span className="material-symbols-outlined text-[16px]">
                          javascript
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-white tracking-tight flex items-center gap-2">
                          react-ui-components
                          <span className="material-symbols-outlined text-[14px] text-white/0 group-hover:text-white/40 transition-all -ml-2 group-hover:ml-0">
                            arrow_outward
                          </span>
                        </h3>
                        <p className="text-xs text-white/40 font-mono">
                          octocat/react-ui-components
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-[#a1a1a1] font-light flex-grow mt-2 line-clamp-2">
                    A comprehensive library of accessible, reusable React
                    components built with Tailwind.
                  </p>
                </div>
                <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-between text-xs text-white/50">
                  <div className="flex items-center gap-2 text-[#aec6ff]">
                    <span className="material-symbols-outlined text-[14px] animate-spin">
                      sync
                    </span>
                    <span className="font-medium">Drafting README...</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono">
                    <span className="material-symbols-outlined text-[14px]">
                      commit
                    </span>
                    8f1e9d2 • Just now
                  </div>
                </div>
              </div>

              <div className="group bg-[#0d1117] rounded-xl border border-white/10 hover:border-white/30 transition-all duration-300 flex flex-col h-48 cursor-pointer relative overflow-hidden">
                <div className="p-6 flex-grow flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#508eff]">
                        <span className="material-symbols-outlined text-[16px]">
                          data_object
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-white tracking-tight flex items-center gap-2">
                          python-data-pipeline
                          <span className="material-symbols-outlined text-[14px] text-white/0 group-hover:text-white/40 transition-all -ml-2 group-hover:ml-0">
                            arrow_outward
                          </span>
                        </h3>
                        <p className="text-xs text-white/40 font-mono">
                          octocat/python-data-pipeline
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-[#a1a1a1] font-light flex-grow mt-2 line-clamp-2">
                    ETL pipeline scripts and machine learning model training
                    configurations.
                  </p>
                </div>
                <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-between text-xs text-white/50">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#27c93f] shadow-[0_0_8px_#27c93f]"></span>
                    <span className="font-medium text-white/80">Synced</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono">
                    <span className="material-symbols-outlined text-[14px]">
                      commit
                    </span>
                    1c4a7b9 • 5d ago
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="w-full border-t border-white/5 bg-black mt-auto">
          <div className="flex justify-between items-center px-6 py-8 max-w-7xl mx-auto">
            <div className="text-sm font-medium text-white/40 tracking-tighter">
              Gitdocs
            </div>
            <div className="flex gap-6">
              <a
                className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors"
                href="#"
              >
                Support
              </a>
              <a
                className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors"
                href="#"
              >
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
