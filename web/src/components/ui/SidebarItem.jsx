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
      className={`flex items-center w-full min-h-11 py-2.5 px-3.5 gap-2.5 rounded-2xl text-sm transition-all border-0 text-left cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600/40 motion-press ${
        active
          ? "bg-[#E9EFEC] text-[#2D3732] font-semibold"
          : "text-[#6B7A72] font-semibold hover:bg-[#EEF2EF] hover:text-[#2D3732]"
      } ${className}`.trim()}
    >
      {Icon && (
        <Icon
          className={`w-[18px] h-[18px] shrink-0 ${
            active ? "text-[#4A6B5D]" : "text-[#6B7A72]"
          }`}
        />
      )}
      <span className="flex-1 truncate">{label}</span>
      {badge && (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-forest-100 text-forest-800">
          {badge}
        </span>
      )}
    </button>
  );
}

export default SidebarItem;

