import Link from "next/link";
import { clsx } from "clsx";

type ButtonProps = {
  href?: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
};

const variants = {
  primary: "bg-mint-500 text-ink-950 hover:bg-mint-400 shadow-glow",
  secondary: "border border-white/12 bg-white/[0.06] text-white hover:bg-white/[0.1]",
  ghost: "text-zinc-300 hover:bg-white/[0.07] hover:text-white"
};

export function Button({
  href,
  children,
  variant = "primary",
  className,
  type = "button",
  onClick,
  disabled = false
}: ButtonProps) {
  const classes = clsx(
    "inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold transition",
    variants[variant],
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
