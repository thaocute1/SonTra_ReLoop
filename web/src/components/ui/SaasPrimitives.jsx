import React, { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

/**
 * Custom ARIA Listbox dropdown (replaces native <select> with full keyboard support).
 */
export function SaasSelect({ label, value, options, onChange, className = "" }) {
  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(() =>
    Math.max(0, options.findIndex((opt) => opt.value === value))
  );
  const wrapRef = useRef(null);
  const listId = useId();

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    const handleOutside = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const handleKeyDown = (event) => {
    if (!open && ["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setFocusIdx((prev) => (prev + 1) % options.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setFocusIdx((prev) => (prev - 1 + options.length) % options.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      setFocusIdx(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setFocusIdx(options.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const chosen = options[focusIdx];
      if (chosen) {
        onChange(chosen.value);
        setOpen(false);
      }
    }
  };

  return (
    <div ref={wrapRef} className={`sr-select-wrap ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className="sr-select-trigger"
      >
        <span>{label ? `${label}: ${selectedOption?.label}` : selectedOption?.label}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>

      {open && (
        <ul id={listId} role="listbox" aria-label={label} className="sr-select-menu motion-popover-enter">
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setFocusIdx(idx)}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`sr-select-option ${isSelected ? "is-selected" : ""} ${
                  focusIdx === idx ? "is-focused" : ""
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={14} aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * Editorial page header with prominent display title and optional actions.
 */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="sr-page-header">
      <div className="sr-page-titles">
        <h1 className="sr-h1">{title}</h1>
        {subtitle && <p className="sr-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
