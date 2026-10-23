import React from "react";

export function SidebarItem({
  icon: Icon,
  label,
  active = false,
  badge,
  onClick,
  className = ""
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center w-full py-3 px-3.5 gap-3 rounded-2xl text-sm transition-all border-0 text-left cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600/40 ${
        active
          ? "bg-forest-50 text-forest-900 font-bold shadow-2xs"
          : "text-slate-600 font-semibold hover:bg-slate-100 hover:text-slate-900"
      } ${className}`.trim()}
    >
      {Icon && (
        <Icon
          className={`w-4 h-4 shrink-0 ${
            active ? "text-forest-800" : "text-slate-500"
          }`}
        />
      )}
      <span className="flex-1 font-be-vietnam truncate">{label}</span>
      {badge && (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-forest-100 text-forest-800">
          {badge}
        </span>
      )}
    </button>
  );
}

export default SidebarItem;

