import React, { useState, useEffect, useRef } from "react";
import { MessageSquare } from "lucide-react";

export default function DraggableChatFab({ onClick }) {
  const [position, setPosition] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fabRef = useRef(null);
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
    isDragging: false,
  });

  // Khởi tạo vị trí mặc định ở góc dưới bên phải
  useEffect(() => {
    const updatePosition = () => {
      const btnSize = 56; // 14 * 4px = 56px
      const margin = 24;
      setPosition((prev) => {
        if (!prev) {
          return {
            x: window.innerWidth - btnSize - margin,
            y: window.innerHeight - btnSize - margin,
          };
        }
        // Giữ nút không bị tràn khi co giãn trình duyệt
        return {
          x: Math.min(Math.max(12, prev.x), window.innerWidth - btnSize - 12),
          y: Math.min(Math.max(12, prev.y), window.innerHeight - btnSize - 12),
        };
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, []);

  const handlePointerDown = (e) => {
    // Chỉ nhận click chuột trái hoặc chạm màn hình (touch)
    if (e.button !== 0 && e.pointerType === "mouse") return;

    const fab = fabRef.current;
    if (!fab) return;

    const rect = fab.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.left,
      origY: rect.top,
      isDragging: false,
    };

    const handlePointerMove = (me) => {
      const dx = me.clientX - dragRef.current.startX;
      const dy = me.clientY - dragRef.current.startY;

      // Di chuyển chuột quá 4px thì mới tính là kéo (drag)
      if (!dragRef.current.isDragging && Math.hypot(dx, dy) > 4) {
        dragRef.current.isDragging = true;
        setIsDragging(true);
      }

      if (dragRef.current.isDragging) {
        const btnSize = 56;
        const newX = Math.min(
          Math.max(12, dragRef.current.origX + dx),
          window.innerWidth - btnSize - 12
        );
        const newY = Math.min(
          Math.max(12, dragRef.current.origY + dy),
          window.innerHeight - btnSize - 12
        );
        setPosition({ x: newX, y: newY });
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      setIsDragging(false);

      // Nếu chỉ bấm chuột mà không kéo -> kích hoạt click mở hộp thư
      if (!dragRef.current.isDragging) {
        if (onClick) onClick();
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  };

  if (!position) return null;

  return (
    <button
      ref={fabRef}
      type="button"
      title="Giữ chuột để kéo thả di chuyển"
      aria-label="Biểu tượng trò chuyện"
      onPointerDown={handlePointerDown}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: "none",
        userSelect: "none",
      }}
      className={`figma-chat-fab fixed z-40 flex items-center justify-center w-14 h-14 bg-[#4A6B5D] hover:bg-[#3D5B4F] text-white rounded-full shadow-[0px_8px_24px_rgba(74,107,93,0.35)] border-0 select-none ${
        isDragging
          ? "cursor-grabbing scale-105 shadow-2xl"
          : "cursor-grab active:cursor-grabbing hover:scale-105"
      }`}
    >
      <MessageSquare className="w-6 h-6 pointer-events-none" />
      <span
        className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-[#C6472F] ring-2 ring-white pointer-events-none"
        aria-hidden="true"
      />
    </button>
  );
}
