import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { toast } from "react-toastify";
import { useEffect } from "react";

export interface User {
  avatar: string;
  name: string;
  email: string;
  username: string;
}

async function fetchUser(): Promise<User> {
  const res = await fetch("http://localhost:3000/api/dashboard/me", {
    credentials: "include",
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error("Failed to fetch user");
  const data = await res.json();
  return data.user;
}

export function useUser() {
  const navigate = useNavigate();

  const query = useQuery<User>({
    queryKey: ["user"],
    queryFn: fetchUser,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (query.error?.message === "UNAUTHORIZED") {
      toast(
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-[#ffb4ab] text-[20px] mt-0.5">lock</span>
          <div className="flex flex-col">
            <span className="font-bold text-white text-sm tracking-wide">Not Authorized</span>
            <span className="text-white/50 text-xs mt-1">Please log in to access your workspace.</span>
          </div>
        </div>
      );
      navigate("/");
    }
  }, [query.error, navigate]);

  return query;
}
