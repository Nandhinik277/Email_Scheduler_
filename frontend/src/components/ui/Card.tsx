import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-stone-200 bg-white shadow-sm ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
