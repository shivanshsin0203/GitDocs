import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { useEffect } from "react";
import { toastError, toastWarn } from "../lib/toast";
import { API_BASE } from "../lib/api";

export interface User {
  avatar: string;
  name: string;
  email: string;
  username: string;
}

async function fetchUser(): Promise<User> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/dashboard/me`, {
      credentials: "include",
    });
  } catch {
    // fetch() throws on DNS failure, server unreachable, CORS, etc.
    throw new Error("NETWORK_ERROR");
  }
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (res.status === 404) throw new Error("USER_NOT_FOUND");
  if (!res.ok) throw new Error("SERVER_ERROR");
  const data = await res.json();
  return data.user;
}

// Suppresses the next auth-error toast triggered by the post-logout refetch.
// Auto-clears after 1s so a manual visit to /dashboard later still toasts normally.
let logoutSuppress = false;
export function markLoggingOut() {
  logoutSuppress = true;
  setTimeout(() => { logoutSuppress = false; }, 1000);
}

interface UseUserOptions {
  // Background subscribers (e.g. JobStreamProvider at app root) pass true so
  // only the active route's useUser fires the toast and redirect. Without
  // this, every consumer's effect fires on the same query.error → N toasts.
  silent?: boolean;
}

export function useUser({ silent = false }: UseUserOptions = {}) {
  const navigate = useNavigate();

  const query = useQuery<User>({
    queryKey: ["user"],
    queryFn: fetchUser,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (silent) return;
    const message = query.error?.message;
    if (!message) return;
    if (logoutSuppress) return;
    if (message === "UNAUTHORIZED" || message === "USER_NOT_FOUND") {
      toastWarn(
        "Not authorized",
        message === "USER_NOT_FOUND"
          ? "Your account couldn't be found. Please log in again."
          : "Please log in to access your workspace.",
      );
    } else if (message === "NETWORK_ERROR") {
      toastError(
        "Couldn't reach server",
        "The service is unavailable right now. Please try again later.",
      );
    } else {
      toastError(
        "Server error",
        "Something went wrong on our end. Please try again later.",
      );
    }
    navigate("/");
  }, [query.error, navigate, silent]);

  return query;
}
