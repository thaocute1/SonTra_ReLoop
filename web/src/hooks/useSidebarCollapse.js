import { useCallback, useEffect, useState } from "react";

/**
 * Persists desktop sidebar collapsed state in localStorage and binds Ctrl/Cmd+B.
 * Also manages floating rail tooltip coordinates for collapsed icon-only items.
 */
export function useSidebarCollapse(storageKey = "sr_sidebar_collapsed") {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });

  const [tooltip, setTooltip] = useState(null);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {
        // Ignore storage write errors
      }
      if (!next) setTooltip(null);
      return next;
    });
  }, [storageKey]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === "b"
      ) {
        const target = event.target;
        const tag = target?.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          target?.isContentEditable
        ) {
          return;
        }
        event.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleCollapsed]);

  const showTooltip = useCallback(
    (label, element) => {
      if (!collapsed || !element || !label) return;
      const rect = element.getBoundingClientRect();
      setTooltip({
        label,
        top: rect.top + rect.height / 2,
        left: rect.right + 10,
      });
    },
    [collapsed]
  );

  const hideTooltip = useCallback(() => {
    setTooltip(null);
  }, []);

  return {
    collapsed,
    toggleCollapsed,
    tooltip,
    showTooltip,
    hideTooltip,
  };
}
