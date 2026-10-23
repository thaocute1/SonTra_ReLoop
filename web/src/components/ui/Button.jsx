import React from "react";

/** Standard Design System Button */
export function Button({
  variant = "primary", // 'primary' | 'outline' | 'danger' | 'sun' | 'ghost'
  size = "md",        // 'sm' | 'md' | 'lg'
  icon: Icon,
  className = "",
  type = "button",
  children,
  disabled = false,
  ...props
}) {
  const variantStyles = {
    primary: "bg-forest-700 hover:bg-forest-800 text-white border border-forest-700 shadow-2xs",
    outline: "bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-2xs",
    danger: "bg-danger-50 hover:bg-danger-100 text-danger-700 border border-danger-100 shadow-2xs",
    sun: "bg-sun-500 hover:bg-sun-600 text-white border border-sun-500 shadow-2xs",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-700 border-0"
  };

  const sizeStyles = {
    sm: "py-1.5 px-3 text-xs rounded-xl gap-1.5",
    md: "py-2.5 px-4 text-xs rounded-2xl gap-2",
    lg: "py-3 px-6 text-sm rounded-2xl gap-2.5"
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center font-bold font-be-vietnam transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-forest-600/40 disabled:opacity-50 disabled:cursor-not-allowed ${
        variantStyles[variant] || variantStyles.primary
      } ${sizeStyles[size] || sizeStyles.md} ${className}`.trim()}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      {children}
    </button>
  );
}

export default Button;
