import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { useEffect } from "react";
import { toastError, toastWarn } from "../lib/toast";

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
  if (res.status === 404) throw new Error("USER_NOT_FOUND");
  if (!res.ok) throw new Error("FETCH_FAILED");
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
    const message = query.error?.message;
    if (!message) return;
    if (message === "UNAUTHORIZED" || message === "USER_NOT_FOUND") {
      toastWarn(
        "Not authorized",
        message === "USER_NOT_FOUND"
          ? "Your account couldn't be found. Please log in again."
          : "Please log in to access your workspace.",
      );
      navigate("/");
    } else if (message === "FETCH_FAILED") {
      toastError(
        "Couldn't reach server",
        "Check your connection and try again.",
      );
    }
  }, [query.error, navigate]);

  return query;
}
