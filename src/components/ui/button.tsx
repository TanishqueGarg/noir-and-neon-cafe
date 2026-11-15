import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string;
  variant?: "lime" | "outline" | "blue" | "quiet";
  children: ReactNode;
  arrow?: boolean;
};

const styles = {
  lime: "bg-lime-muted text-ink hover:bg-lime",
  outline: "border border-line text-text hover:border-lime-muted hover:text-lime",
  blue: "bg-blue text-white hover:bg-[#3563ff]",
  quiet: "border border-line bg-elevated text-text hover:border-[#3a4353] hover:bg-[#1a202c]",
};

export function Button({ href, variant = "lime", children, arrow, className, ...props }: Props) {
  const classes = cn(
    "group inline-flex min-h-12 items-center justify-center gap-3 rounded-full px-6 text-xs font-extrabold uppercase tracking-[0.16em] transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-50",
    styles[variant],
    className,
  );
  const content = <>{children}{arrow && <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />}</>;
  if (href) return <Link href={href} className={classes}>{content}</Link>;
  return <button className={classes} {...props}>{content}</button>;
}
