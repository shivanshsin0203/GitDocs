import { useNavigate, useSearchParams } from "react-router";

const REASON_MESSAGES: Record<string, { title: string; description: string }> = {
  state_mismatch: {
    title: "Session verification failed",
    description: "Your sign-in request couldn't be verified. Please try again.",
  },
  missing_code: {
    title: "Sign-in interrupted",
    description: "GitHub didn't return an authorization code.",
  },
  access_denied: {
    title: "Access not granted",
    description: "You declined to authorize Gitdocs on GitHub.",
  },
  bad_verification_code: {
    title: "Code expired",
    description: "Your authorization code was invalid or expired.",
  },
  token_exchange_failed: {
    title: "Couldn't connect to GitHub",
    description: "We couldn't exchange your code with GitHub.",
  },
  profile_fetch_failed: {
    title: "Couldn't reach GitHub",
    description: "We couldn't load your GitHub profile.",
  },
  invalid_profile: {
    title: "Unexpected response",
    description: "GitHub returned a response we didn't recognize.",
  },
  user_persist_failed: {
    title: "Couldn't save your account",
    description: "We hit a snag saving your account.",
  },
  internal_error: {
    title: "Something went wrong",
    description: "An unexpected error happened on our side.",
  },
};

const DEFAULT_MESSAGE = {
  title: "Authentication failed",
  description: "We couldn't complete your sign-in.",
};

function AuthError() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reason = searchParams.get("reason") ?? "";
  const message = REASON_MESSAGES[reason] ?? DEFAULT_MESSAGE;

  return (
    <div className="bg-black text-[#e2e2e2] font-sans selection:bg-[#27c93f] selection:text-black antialiased min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-8">
        <span
          className="material-symbols-outlined text-[40px] text-[#ff5f56]"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          error
        </span>

        <div className="space-y-3">
          <h1 className="text-3xl font-black text-white tracking-tighter">
            {message.title}
          </h1>
          <p className="text-sm text-[#a1a1a1] font-light leading-relaxed">
            {message.description}
          </p>
        </div>

        <button
          onClick={() => navigate("/")}
          className="bg-white text-black px-8 py-3 rounded-lg font-bold text-sm hover:bg-neutral-200 transition-all active:scale-95 inline-flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">
            arrow_back
          </span>
          Back to home
        </button>

        {reason && (
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">
            {reason}
          </p>
        )}
      </div>
    </div>
  );
}

export default AuthError;
