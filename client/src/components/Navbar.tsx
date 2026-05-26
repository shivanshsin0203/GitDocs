import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "../hooks/useUser.tsx";
import Logo from "./Logo";

interface NavbarProps {
  user: User | null | undefined;
}

const Navbar = ({ user }: NavbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const avatarBtnRef = useRef<HTMLButtonElement>(null);
  const isDropdownOpenRef = useRef(false);

  useEffect(() => {
    isDropdownOpenRef.current = isDropdownOpen;
  }, [isDropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isDropdownOpenRef.current) return;
      if (dropdownRef.current?.contains(event.target as Node)) return;
      if (avatarBtnRef.current?.contains(event.target as Node)) return;
      setIsDropdownOpen(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const toggleDropdown = useCallback(() => {
    setIsDropdownOpen((prev) => !prev);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await fetch("http://localhost:3000/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      queryClient.clear();
      navigate("/");
    } catch (err) {
      console.error("Logout failed", err);
    }
  }, [navigate]);

  const isDashboard = location.pathname === "/dashboard";

  return (
    <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo
            size="md"
            onClick={() => navigate("/dashboard")}
          />
          <div className="h-6 w-[1px] bg-white/10 mx-2 transform rotate-12"></div>
          {isDashboard ? (
            <div className="flex items-center gap-2 text-sm font-medium text-white hover:text-white/80 transition-colors cursor-pointer">
              {user?.avatar && (
                <img
                  src={user.avatar}
                  alt="User Org"
                  className="w-5 h-5 rounded-full border border-white/20"
                />
              )}
              <span>{user?.username}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm font-medium text-white/50">
              {user?.avatar && (
                <img
                  src={user.avatar}
                  alt="User Org"
                  className="w-5 h-5 rounded-full border border-white/20 opacity-50"
                />
              )}
              <span>{user?.username}</span>
              <span className="mx-1">/</span>
              <span className="text-white">Import Project</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button className="text-white/40 hover:text-white transition-colors flex items-center">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
          </button>

          <div className="relative">
            <button
              ref={avatarBtnRef}
              onClick={toggleDropdown}
              className="w-8 h-8 rounded-full overflow-hidden border border-white/20 hover:border-[#27c93f]/50 transition-all focus:outline-none focus:ring-2 focus:ring-[#27c93f]/40"
            >
              {user?.avatar && (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              )}
            </button>

            <div
              ref={dropdownRef}
              className={`absolute right-0 mt-2 w-48 bg-[#161b22] border border-white/10 rounded-xl shadow-2xl py-1 transform transition-all duration-200 origin-top-right z-50 ${
                isDropdownOpen
                  ? "opacity-100 scale-100 pointer-events-auto"
                  : "opacity-0 scale-95 pointer-events-none"
              }`}
            >
              <div className="px-4 py-3 border-b border-white/5">
                <p className="text-sm text-white font-medium">{user?.name}</p>
                <p className="text-xs text-[#a1a1a1] truncate">{user?.email}</p>
              </div>
              <div className="py-1">
                <button className="w-full text-left px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 flex items-center gap-2 transition-colors">
                  <span className="material-symbols-outlined text-[16px]">settings</span>
                  Settings
                </button>
              </div>
              <div className="py-1 border-t border-white/5">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-[#ffb4ab] hover:bg-[#ffb4ab]/10 flex items-center gap-2 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isDashboard && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-6 text-sm">
          <a href="#" className="pb-3 border-b-2 border-white text-white font-medium">Overview</a>
          <a href="#" className="pb-3 border-b-2 border-transparent text-white/50 hover:text-white transition-colors">Integrations</a>
          <a href="#" className="pb-3 border-b-2 border-transparent text-white/50 hover:text-white transition-colors">Settings</a>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
