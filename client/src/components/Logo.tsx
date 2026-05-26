type LogoSize = "sm" | "md" | "lg" | "xl";
type LogoVariant = "wordmark" | "mark";

interface LogoProps {
  size?: LogoSize;
  variant?: LogoVariant;
  className?: string;
  onClick?: () => void;
  as?: "div" | "a" | "button" | "span";
  href?: string;
}

const SIZE_CLASSES: Record<LogoSize, { mark: string; word: string; gap: string }> = {
  sm: { mark: "text-base",  word: "text-base",  gap: "gap-1.5" },
  md: { mark: "text-xl",    word: "text-xl",    gap: "gap-2" },
  lg: { mark: "text-3xl",   word: "text-3xl",   gap: "gap-2" },
  xl: { mark: "text-5xl",   word: "text-5xl",   gap: "gap-3" },
};

function Logo({
  size = "md",
  variant = "wordmark",
  className = "",
  onClick,
  as = "div",
  href,
}: LogoProps) {
  const sizes = SIZE_CLASSES[size];
  const Tag = as as keyof React.JSX.IntrinsicElements;

  const content = (
    <span className={`inline-flex items-center ${sizes.gap}`}>
      <span
        className={`${sizes.mark} font-mono leading-none text-[var(--color-brand)]`}
        style={{ textShadow: "0 0 18px var(--color-brand-glow)" }}
      >
        ❯
      </span>
      {variant === "wordmark" && (
        <span className={`${sizes.word} font-black tracking-tighter text-white leading-none`}>
          gitdocs
        </span>
      )}
    </span>
  );

  const baseProps = {
    className: `inline-flex items-center select-none ${onClick || href ? "cursor-pointer hover:opacity-80 transition-opacity" : ""} ${className}`,
    onClick,
    ...(href ? { href } : {}),
  };

  return <Tag {...baseProps}>{content}</Tag>;
}

export default Logo;
