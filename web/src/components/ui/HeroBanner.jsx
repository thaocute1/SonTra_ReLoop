import React from "react";

export function HeroBanner({
  variant = "dark", // 'dark' | 'light'
  badgeText,
  badgeIcon: BadgeIcon,
  title,
  description,
  rightContent,
  className = "",
  children
}) {
  const isDark = variant === "dark";

  return (
    <div
      className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all ${
        isDark
          ? "bg-gradient-to-r from-forest-800 to-forest-700 text-white shadow-xs"
          : "bg-cream-50 text-slate-800 border border-slate-200 shadow-2xs"
      } ${className}`.trim()}
    >
      {/* Subtle Eco Accent bar for light variant */}
      {!isDark && <div className="absolute top-0 left-0 right-0 h-1.5 bg-forest-700" />}

      <div className="space-y-2.5 max-w-2xl z-10">
        {badgeText && (
          <div
            className={`inline-flex items-center gap-1.5 min-h-6 px-3 py-1 rounded-full text-xs font-bold font-be-vietnam ${
              isDark
                ? "bg-white/10 backdrop-blur-md text-emerald-200 border border-white/10"
                : "bg-forest-50 text-forest-700 border border-forest-200"
            }`}
          >
            {BadgeIcon && <BadgeIcon className="w-3.5 h-3.5" />}
            <span>{badgeText}</span>
          </div>
        )}

        {title && (
          <h2
            className={`text-xl sm:text-2xl lg:text-3xl font-bold font-fraunces leading-tight m-0 ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            {title}
          </h2>
        )}

        {description && (
          <p
            className={`text-sm sm:text-base font-be-vietnam leading-relaxed m-0 ${
              isDark ? "text-emerald-50/90" : "text-slate-600"
            }`}
          >
            {description}
          </p>
        )}

        {children}
      </div>

      {rightContent && (
        <div className="shrink-0 z-10 w-full md:w-auto">
          {rightContent}
        </div>
      )}
    </div>
  );
}

export default HeroBanner;

