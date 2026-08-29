import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "default" | "outline" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

export function Button({
  children,
  className = "",
  variant = "default",
  type = "button",
  ...props
}: ButtonProps) {
  const variantClasses: Record<ButtonVariant, string> = {
    default:
      "bg-stone-900 text-white hover:bg-stone-800 disabled:bg-stone-400",
    outline:
      "border border-stone-300 bg-white text-stone-800 hover:bg-stone-100 disabled:bg-stone-50 disabled:text-stone-400",
    ghost:
      "bg-transparent text-stone-700 hover:bg-stone-200 disabled:text-stone-400",
  };

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-stone-300 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
