import React from "react";

export function StatTile({
  icon: Icon,
  label,
  value,
  subtext,
  iconBg = "bg-forest-50 text-forest-700 border-forest-200",
  valueColor = "text-slate-900",
  className = "",
  onClick
}) {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-2xl bg-[#F8FAF7] border border-slate-200/80 flex items-center gap-3.5 transition-all motion-fade-up ${
        onClick ? "cursor-pointer hover:bg-slate-100 hover:border-slate-300 motion-hover-lift motion-press" : ""
      } ${className}`.trim()}
    >
      {Icon && (
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${iconBg}`}
        >
          <Icon className="w-5 h-5" />
        </div>
      )}

      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-xs font-medium text-slate-500 font-be-vietnam truncate">
          {label}
        </span>
        <span className={`text-base sm:text-lg font-bold font-fraunces leading-tight ${valueColor}`}>
          {value}
        </span>
        {subtext && (
          <span className="text-xs text-slate-500 font-be-vietnam mt-0.5 truncate">
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
}

export default StatTile;

