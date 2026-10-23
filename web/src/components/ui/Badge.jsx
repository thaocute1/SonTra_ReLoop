import React from "react";

export function Badge({
  children,
  variant = "forest", // 'forest' | 'sun' | 'danger' | 'neutral' | 'outline'
  size = "sm",       // 'sm' | 'md'
  icon: Icon,
  className = "",
  ...props
}) {
  const variantStyles = {
    forest: "bg-forest-50 text-forest-700 border border-forest-200",
    sun: "bg-sun-50 text-sun-700 border border-sun-100",
    danger: "bg-danger-50 text-danger-700 border border-danger-100",
    neutral: "bg-slate-100 text-slate-700 border border-slate-200",
    outline: "bg-transparent text-slate-700 border border-slate-300"
  };

  const sizeStyles = {
    sm: "px-2.5 py-0.5 text-[11px]",
    md: "px-3 py-1 text-xs"
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold rounded-full font-be-vietnam shrink-0 transition-colors ${variantStyles[variant] || variantStyles.forest} ${sizeStyles[size] || sizeStyles.sm} ${className}`.trim()}
      {...props}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      {children}
    </span>
  );
}

export default Badge;

