import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { toast } from "react-toastify";
import { useUser } from "./hooks/useUser.tsx";
import Navbar from "./components/Navbar";
import Logo from "./components/Logo";

interface Repo {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    html_url: string;
    description: string | null;
    language: string | null;
    default_branch: string;
    updated_at: string;
}

const LANGUAGE_CONFIG: Record<string, { label: string; color: string }> = {
    JavaScript:    { label: "JS",   color: "#f7df1e" },
    TypeScript:    { label: "TS",   color: "#3178c6" },
    Python:        { label: "PY",   color: "#3572A5" },
    Java:          { label: "JV",   color: "#b07219" },
    Go:            { label: "GO",   color: "#00ADD8" },
    Rust:          { label: "RS",   color: "#dea584" },
    Ruby:          { label: "RB",   color: "#701516" },
    "C++":         { label: "C+",   color: "#f34b7d" },
    C:             { label: "C",    color: "#555555" },
    "C#":          { label: "C#",   color: "#178600" },
    PHP:           { label: "PH",   color: "#4F5D95" },
    Swift:         { label: "SW",   color: "#F05138" },
    Kotlin:        { label: "KT",   color: "#A97BFF" },
    Dart:          { label: "DT",   color: "#00B4AB" },
    HTML:          { label: "HT",   color: "#e34c26" },
    CSS:           { label: "CS",   color: "#563d7c" },
    Shell:         { label: "SH",   color: "#89e051" },
    Vue:           { label: "VU",   color: "#41b883" },
    Scala:         { label: "SC",   color: "#c22d40" },
    Lua:           { label: "LU",   color: "#000080" },
    Jupyter:       { label: "JN",   color: "#DA5B0B" },
    R:             { label: "R",    color: "#198CE7" },
    Elixir:        { label: "EX",   color: "#6e4a7e" },
    Haskell:       { label: "HS",   color: "#5e5086" },
    Clojure:       { label: "CL",   color: "#db5855" },
    Perl:          { label: "PL",   color: "#0298c3" },
    SCSS:          { label: "SS",   color: "#c6538c" },
    Sass:          { label: "SA",   color: "#a53b70" },
    "Objective-C": { label: "OC",   color: "#438eff" },
    Svelte:        { label: "SV",   color: "#ff3e00" },
    Zig:           { label: "ZG",   color: "#ec915c" },
    Nix:           { label: "NX",   color: "#7e7eff" },
    HCL:           { label: "TF",   color: "#844fba" },
    Makefile:      { label: "MK",   color: "#427819" },
    Dockerfile:    { label: "DK",   color: "#384d54" },
    PowerShell:    { label: "PS",   color: "#012456" },
    Vim:           { label: "VI",   color: "#199f4b" },
    Markdown:      { label: "MD",   color: "#083fa1" },
    YAML:          { label: "YM",   color: "#cb171e" },
    JSON:          { label: "JN",   color: "#292929" },
};

function getLanguageInfo(language: string | null) {
    if (!language) return { label: "—", color: "#8b949e" };
    return LANGUAGE_CONFIG[language] || { label: language.slice(0, 2).toUpperCase(), color: "#8b949e" };
}

function timeAgo(dateStr: string): string {
    const now = Date.now();
    const updated = new Date(dateStr).getTime();
    const diff = now - updated;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (seconds < 60) return "just now";
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
    if (weeks < 5) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
    if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;
    return `${years} year${years > 1 ? "s" : ""} ago`;
}

const ListRepos = () => {
    const { data: user } = useUser();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");
    const [repos, setRepos] = useState<Repo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [importingId, setImportingId] = useState<number | null>(null);

    const handleImport = async (repo: Repo) => {
        if (importingId !== null) return;
        const [owner, name] = repo.full_name.split("/");
        setImportingId(repo.id);
        try {
            const res = await fetch("http://localhost:3000/api/generate", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ repoOwner: owner, repoName: name }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.error ?? "Failed to queue job");
            }
            toast(
                <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#aec6ff] text-[20px] mt-0.5">cloud_queue</span>
                    <div className="flex flex-col">
                        <span className="font-bold text-white text-sm tracking-wide">Queued</span>
                        <span className="text-white/50 text-xs mt-1">{repo.name} is in the generation queue.</span>
                    </div>
                </div>
            );
            navigate("/dashboard");
        } catch (err: any) {
            toast(
                <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#ffb4ab] text-[20px] mt-0.5">error</span>
                    <div className="flex flex-col">
                        <span className="font-bold text-white text-sm tracking-wide">Couldn't queue</span>
                        <span className="text-white/50 text-xs mt-1">{err.message}</span>
                    </div>
                </div>
            );
            setImportingId(null);
        }
    };

    useEffect(() => {
        const fetchRepos = async () => {
            try {
                const res = await fetch("http://localhost:3000/api/dashboard/listrepos", {
                    credentials: "include",
                });
                if (!res.ok) throw new Error("Failed to fetch repositories");
                const data = await res.json();
                setRepos(data.repos);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchRepos();
    }, []);

    const filteredRepos = repos.filter(repo =>
        repo.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            <style>{`
                .material-symbols-outlined {
                    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
                }
                .window-shadow {
                    box-shadow: 0 30px 60px -12px rgba(0,0,0,0.5), 0 18px 36px -18px rgba(0,0,0,0.5);
                }

                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.02);
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>

            <div className="bg-[#000000] text-[#e2e2e2] font-sans selection:bg-[#27c93f] selection:text-black antialiased overflow-x-hidden min-h-screen flex flex-col">
                <Navbar user={user ?? null} />

                <main className="flex-grow pt-8 sm:pt-16 pb-16 sm:pb-24">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6">

                        <div className="mb-6 sm:mb-8 text-center sm:text-left">
                            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2 flex items-center gap-3 justify-center sm:justify-start">
                                <span
                                    className="font-mono text-[#27c93f] leading-none"
                                    style={{ textShadow: "0 0 18px rgba(39,201,63,0.35)" }}
                                >
                                    ❯
                                </span>
                                Import Git Repository
                            </h1>
                            <p className="text-sm text-[#a1a1a1]">Select a repository from your GitHub account to generate documentation.</p>
                        </div>

                        <div className="bg-[#0d1117] border border-white/10 rounded-xl window-shadow overflow-hidden flex flex-col">

                            <div className="p-4 border-b border-white/10 bg-[#161b22] flex items-center gap-3">
                                <span className="material-symbols-outlined text-white/40 text-[20px]">search</span>
                                <input
                                    type="text"
                                    placeholder="Search your repositories..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-transparent border-none text-white text-sm focus:ring-0 p-0 placeholder-white/30 outline-none"
                                />
                            </div>

                            <div className="flex flex-col max-h-[60vh] sm:max-h-[450px] overflow-y-auto custom-scrollbar">
                                {loading ? (
                                    <div className="p-12 flex flex-col items-center justify-center text-center">
                                        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
                                        <p className="text-sm text-white/40">Loading repositories...</p>
                                    </div>
                                ) : error ? (
                                    <div className="p-12 flex flex-col items-center justify-center text-center">
                                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 mb-4">
                                            <span className="material-symbols-outlined text-[24px]">error</span>
                                        </div>
                                        <p className="text-sm font-medium text-white">Failed to load repositories</p>
                                        <p className="text-xs text-white/40 mt-1">{error}</p>
                                    </div>
                                ) : filteredRepos.length > 0 ? (
                                    filteredRepos.map((repo) => {
                                        const isPrivate = repo.private;
                                        const langInfo = getLanguageInfo(repo.language);
                                        const badgeClass = isPrivate
                                            ? "bg-[#ffbd2e]/10 border-[#ffbd2e]/20 text-[#ffbd2e]"
                                            : "bg-white/5 border-white/10 text-white/60";

                                        return (
                                            <div key={repo.id} className="flex items-center justify-between gap-3 p-3 sm:p-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                                    <div
                                                        className="w-8 h-8 shrink-0 rounded border flex items-center justify-center text-[11px] font-bold tracking-tight"
                                                        style={{
                                                            backgroundColor: `${langInfo.color}18`,
                                                            borderColor: `${langInfo.color}40`,
                                                            color: langInfo.color
                                                        }}
                                                    >
                                                        {langInfo.label}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h3 className="font-medium text-white text-sm truncate">{repo.name}</h3>
                                                            <span className={`px-2 py-0.5 rounded-full border ${badgeClass} text-[10px] font-medium shrink-0`}>
                                                                {isPrivate ? "Private" : "Public"}
                                                            </span>
                                                            {repo.language && (
                                                                <span className="text-[10px] text-white/30 font-medium hidden sm:inline">{repo.language}</span>
                                                            )}
                                                        </div>
                                                        {repo.description && (
                                                            <p className="text-xs text-white/30 mt-0.5 truncate">{repo.description}</p>
                                                        )}
                                                        <p className="text-xs text-white/40 mt-1 flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[12px]">schedule</span>
                                                            Updated {timeAgo(repo.updated_at)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleImport(repo)}
                                                    disabled={importingId === repo.id}
                                                    className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium bg-white text-black rounded-lg hover:bg-neutral-200 transition-all active:scale-95 shadow-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {importingId === repo.id ? "Queueing…" : "Import"}
                                                </button>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="p-12 flex flex-col items-center justify-center text-center">
                                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/30 mb-4">
                                            <span className="material-symbols-outlined text-[24px]">search_off</span>
                                        </div>
                                        <p className="text-sm font-medium text-white">No repositories found</p>
                                        <p className="text-xs text-white/40 mt-1">Try adjusting your search query.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-6 text-center">
                            <p className="text-xs text-white/40">Don't see your repository? <span className="text-white hover:underline">Try Searching it in search bar above.</span></p>
                        </div>

                    </div>
                </main>

                <footer className="w-full border-t border-white/5 bg-black mt-auto">
                    <div className="flex justify-between items-center px-6 py-8 max-w-7xl mx-auto">
                        <Logo size="sm" className="opacity-60" />
                        <div className="flex gap-6">
                            <a className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors" href="#">Support</a>
                            <a className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors" href="#">Docs</a>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
};

export default ListRepos;
