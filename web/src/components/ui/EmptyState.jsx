import React from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  className = ""
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-10 sm:p-14 bg-cream-50 rounded-3xl border border-dashed border-slate-300 text-center gap-3.5 transition-all ${className}`.trim()}
    >
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-white text-forest-700 flex items-center justify-center border border-slate-200 shadow-2xs">
          <Icon className="w-7 h-7 stroke-[1.5]" />
        </div>
      )}

      {title && (
        <h3 className="text-base sm:text-lg font-bold font-fraunces text-slate-800 m-0">
          {title}
        </h3>
      )}

      {description && (
        <p className="text-xs sm:text-sm text-slate-600 max-w-md font-be-vietnam leading-relaxed m-0">
          {description}
        </p>
      )}

      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 py-2.5 px-6 rounded-full bg-forest-700 hover:bg-forest-800 text-white text-xs font-bold font-be-vietnam border-0 cursor-pointer transition-all shadow-xs"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}

export default EmptyState;

