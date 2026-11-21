import React, { useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Mail,
  PanelRightClose,
  PanelRightOpen,
  Phone,
  Plus,
  Users,
  UserCheck,
  XCircle,
} from "lucide-react";

const START_HOUR = 5; // 05:00
const END_HOUR = 20; // 20:00
const TOTAL_HOURS = END_HOUR - START_HOUR;
const TOTAL_MINUTES = TOTAL_HOURS * 60;
const HOUR_WIDTH = 80; // px per hour horizontally
const LANE_HEIGHT = 48; // px per event lane vertically
const MIN_ROW_HEIGHT = 68; // minimum height for each day row

const SHORT_WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const FULL_WEEKDAYS = [
  "Chủ Nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];

/**
 * Normalize booking date strings from either "YYYY-MM-DD" or "DD/MM/YYYY" into "YYYY-MM-DD".
 */
export function normalizeDateKey(rawDate) {
  if (!rawDate || typeof rawDate !== "string") return "";
  const trimmed = rawDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const dmyMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmyMatch) {
    const [, dd, mm, yyyy] = dmyMatch;
    return `${yyyy}-${mm}-${dd}`;
  }
  return "";
}

export function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Return Monday of the week containing `dateKey`.
 */
function getWeekStart(dateKey) {
  const date = parseDateKey(dateKey);
  const day = date.getDay();
  const diffToMonday = (day + 6) % 7;
  date.setDate(date.getDate() - diffToMonday);
  return date;
}

/**
 * Parse "06:00 - 10:30" into { startMinutes, endMinutes, label }.
 */
function parseTimeSlot(timeSlot) {
  const fallback = { startMinutes: 6 * 60, endMinutes: 10 * 60 + 30, label: "06:00–10:30" };
  if (!timeSlot || typeof timeSlot !== "string") return fallback;
  const match = timeSlot.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
  if (!match) return fallback;
  const startMinutes = Number(match[1]) * 60 + Number(match[2]);
  const endMinutes = Number(match[3]) * 60 + Number(match[4]);
  if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes) || endMinutes <= startMinutes) {
    return fallback;
  }
  return {
    startMinutes,
    endMinutes,
    label: `${match[1].padStart(2, "0")}:${match[2]}–${match[3].padStart(2, "0")}:${match[4]}`,
  };
}

function formatVietnameseFullDate(dateKey) {
  if (!dateKey) return "";
  const date = parseDateKey(dateKey);
  return `${FULL_WEEKDAYS[date.getDay()]}, ${date.getDate()} tháng ${
    date.getMonth() + 1
  }, ${date.getFullYear()}`;
}

function getEventBlockColors(status, isSelected) {
  if (status === "waiting_confirmation" || status === "waiting_payment") {
    return {
      bg: isSelected ? "bg-amber-100 ring-2 ring-amber-500" : "bg-amber-50/95 hover:bg-amber-100/80",
      bar: "bg-amber-500",
      text: "text-amber-950",
      sub: "text-amber-800",
    };
  }
  if (status === "completed") {
    return {
      bg: isSelected ? "bg-slate-200 ring-2 ring-slate-500" : "bg-slate-100/95 hover:bg-slate-200/75",
      bar: "bg-slate-500",
      text: "text-slate-900",
      sub: "text-slate-600",
    };
  }
  // confirmed (iPhone sky-blue style)
  return {
    bg: isSelected ? "bg-sky-100 ring-2 ring-sky-500" : "bg-sky-50/95 hover:bg-sky-100/85",
    bar: "bg-sky-500",
    text: "text-sky-950",
    sub: "text-sky-700",
  };
}

/**
 * Group active (non-cancelled) bookings on a day by (time_slot, experience_name)
 * and pack overlapping blocks into horizontal lanes so they never collide.
 */
function buildDayRowLanes(dayBookings) {
  const activeBookings = dayBookings.filter((b) => b.status !== "cancelled");
  const groups = new Map();

  for (const b of activeBookings) {
    const slotKey = b.time_slot || "06:00 - 10:30";
    const expKey = b.experience_name || "Tour Sơn Trà";
    const key = `${slotKey}__${expKey}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        timeSlot: slotKey,
        experienceName: expKey,
        bookings: [],
      });
    }
    groups.get(key).bookings.push(b);
  }

  const blocks = [];
  for (const group of groups.values()) {
    const parsed = parseTimeSlot(group.timeSlot);
    const primary = group.bookings[0];
    let repStatus = primary.status;
    if (
      group.bookings.some(
        (b) => b.status === "waiting_confirmation" || b.status === "waiting_payment"
      )
    ) {
      repStatus = "waiting_confirmation";
    } else if (group.bookings.some((b) => b.status === "confirmed")) {
      repStatus = "confirmed";
    } else if (group.bookings.some((b) => b.status === "completed")) {
      repStatus = "completed";
    }

    blocks.push({
      ...group,
      ...parsed,
      repStatus,
      primaryBooking: primary,
    });
  }

  blocks.sort((a, b) => a.startMinutes - b.startMinutes);

  // Greedy lane packing
  const laneEnds = [];
  for (const block of blocks) {
    let assignedLane = laneEnds.findIndex((endMin) => endMin <= block.startMinutes);
    if (assignedLane === -1) {
      assignedLane = laneEnds.length;
      laneEnds.push(block.endMinutes);
    } else {
      laneEnds[assignedLane] = block.endMinutes;
    }
    block.lane = assignedLane;
  }

  const laneCount = Math.max(1, laneEnds.length);
  const rowHeight = Math.max(MIN_ROW_HEIGHT, laneCount * LANE_HEIGHT + 16);

  return { blocks, rowHeight };
}

export const DepartureCalendar = ({
  bookings,
  loading,
  selectedDateKey,
  onSelectDateKey,
  selectedBooking,
  onSelectBooking,
  onUpdateStatus,
  onCreateForDate,
  statusBadgeMap,
  formatMoney,
}) => {
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const activeDateKey = selectedDateKey || todayKey;

  const [weekStartKey, setWeekStartKey] = useState(() => toDateKey(getWeekStart(activeDateKey)));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const weekDays = useMemo(() => {
    const start = parseDateKey(weekStartKey);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dayOfWeek = d.getDay();
      return {
        date: d,
        dateKey: toDateKey(d),
        dayNumber: d.getDate(),
        monthNumber: d.getMonth() + 1,
        weekdayShort: SHORT_WEEKDAYS[dayOfWeek],
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      };
    });
  }, [weekStartKey]);

  const bookingsByDate = useMemo(() => {
    const map = new Map();
    for (const b of bookings) {
      const key = normalizeDateKey(b.booking_date) || normalizeDateKey(b.booking_date_formatted);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(b);
    }
    return map;
  }, [bookings]);

  const hours = useMemo(
    () => Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i),
    []
  );

  // Current time vertical indicator (% across horizontal timeline)
  const nowIndicatorLeftPct = useMemo(() => {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    if (mins < START_HOUR * 60 || mins > END_HOUR * 60) return null;
    return ((mins - START_HOUR * 60) / TOTAL_MINUTES) * 100;
  }, []);

  const dayBookings = useMemo(() => {
    const list = bookingsByDate.get(activeDateKey) || [];
    const active = list.filter((b) => b.status !== "cancelled");
    return active.length > 0 ? active : list;
  }, [bookingsByDate, activeDateKey]);

  const activeDayDetail = useMemo(() => {
    if (dayBookings.length === 0) return null;
    if (selectedBooking && dayBookings.some((b) => b.id === selectedBooking.id)) {
      return selectedBooking;
    }
    return dayBookings[0];
  }, [dayBookings, selectedBooking]);

  const headerMonthLabel = useMemo(() => {
    const midDay = weekDays[3]?.date || new Date();
    return `Tháng ${midDay.getMonth() + 1}`;
  }, [weekDays]);

  const weekRangeLabel = useMemo(() => {
    const first = weekDays[0].date;
    const last = weekDays[6].date;
    if (first.getMonth() === last.getMonth()) {
      return `${first.getDate()} – ${last.getDate()} Tháng ${
        first.getMonth() + 1
      }, ${first.getFullYear()}`;
    }
    return `${first.getDate()}/${first.getMonth() + 1} – ${last.getDate()}/${
      last.getMonth() + 1
    }/${last.getFullYear()}`;
  }, [weekDays]);

  const handleShiftWeek = (deltaDays) => {
    const d = parseDateKey(weekStartKey);
    d.setDate(d.getDate() + deltaDays);
    setWeekStartKey(toDateKey(d));
  };

  const handleGoToday = () => {
    setWeekStartKey(toDateKey(getWeekStart(todayKey)));
    onSelectDateKey(todayKey);
    const todayList = (bookingsByDate.get(todayKey) || []).filter((b) => b.status !== "cancelled");
    if (todayList.length > 0) onSelectBooking(todayList[0]);
  };

  const handleSelectDay = (dateKey) => {
    onSelectDateKey(dateKey);
    const list = (bookingsByDate.get(dateKey) || []).filter((b) => b.status !== "cancelled");
    if (list.length > 0) onSelectBooking(list[0]);
  };

  const timelineWidthPx = TOTAL_HOURS * HOUR_WIDTH;

  return (
    <div
      className={`grid grid-cols-1 gap-4 items-start ${
        sidebarCollapsed ? "xl:grid-cols-1" : "xl:grid-cols-[minmax(0,1fr)_17.5rem]"
      }`}
    >
      {/* Left: Horizontal-Time / Vertical-Weekday Calendar */}
      <section className="sr-surface !p-0 overflow-hidden" aria-label="Lịch khởi hành theo tuần">
        {/* Top Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-[var(--sr-border)] bg-[var(--sr-bg-surface)]">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-bold text-[#FF3B30]">{headerMonthLabel}</span>
            <span className="text-sm font-semibold text-[var(--sr-text-primary)]">
              {weekRangeLabel}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleGoToday}
              className="sr-btn sr-btn-sm sr-btn-secondary !text-red-600"
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => handleShiftWeek(-7)}
              aria-label="Tuần trước"
              className="sr-btn sr-btn-sm sr-btn-ghost !px-2"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => handleShiftWeek(7)}
              aria-label="Tuần sau"
              className="sr-btn sr-btn-sm sr-btn-ghost !px-2"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              aria-label={sidebarCollapsed ? "Mở chi tiết đơn" : "Thu gọn chi tiết"}
              className="hidden xl:inline-flex sr-btn sr-btn-sm sr-btn-secondary ml-1"
            >
              {sidebarCollapsed ? (
                <>
                  <PanelRightOpen size={14} aria-hidden="true" />
                  <span>Chi tiết</span>
                </>
              ) : (
                <>
                  <PanelRightClose size={14} aria-hidden="true" />
                  <span>Thu gọn</span>
                </>
              )}
            </button>
          </div>
        </div>

        {loading ? (
          <p role="status" className="py-16 text-center text-sm text-[var(--sr-text-muted)]">
            Đang tải lịch khởi hành...
          </p>
        ) : (
          <div className="overflow-auto max-h-[38rem] bg-[var(--sr-bg-surface)]">
            <div style={{ minWidth: `calc(6.5rem + ${timelineWidthPx}px)` }}>
              {/* Sticky Top Header: Corner + Hourly Columns */}
              <div className="sticky top-0 z-30 flex border-b border-[var(--sr-border)] bg-[var(--sr-bg-surface)] shadow-[0_1px_0_var(--sr-border)]">
                <div className="sticky left-0 z-40 w-[6.5rem] shrink-0 bg-[var(--sr-bg-surface)] border-r border-[var(--sr-border)] px-3 py-2.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[var(--sr-text-muted)]">
                  <span>Thứ / Ngày</span>
                </div>

                <div
                  className="grid flex-1"
                  style={{ gridTemplateColumns: `repeat(${TOTAL_HOURS}, minmax(0, 1fr))` }}
                >
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="border-r last:border-r-0 border-[var(--sr-border)]/60 px-2 py-2.5 text-left text-[11px] font-semibold text-[var(--sr-text-muted)] sr-tabular"
                    >
                      {String(hour).padStart(2, "0")}:00
                    </div>
                  ))}
                </div>
              </div>

              {/* 7 Weekday Rows */}
              <div className="divide-y divide-[var(--sr-border)]">
                {weekDays.map((day) => {
                  const isToday = day.dateKey === todayKey;
                  const isSelected = day.dateKey === activeDateKey;
                  const dayList = bookingsByDate.get(day.dateKey) || [];
                  const { blocks, rowHeight } = buildDayRowLanes(dayList);

                  return (
                    <div
                      key={day.dateKey}
                      onClick={() => handleSelectDay(day.dateKey)}
                      style={{ height: `${rowHeight}px` }}
                      className={`flex transition-colors cursor-pointer ${
                        isSelected ? "bg-[var(--sr-bg-page)]/45" : "hover:bg-[var(--sr-bg-page)]/25"
                      }`}
                    >
                      {/* Sticky Left Day Column */}
                      <div
                        className={`sticky left-0 z-20 w-[6.5rem] shrink-0 border-r border-[var(--sr-border)] px-3 flex items-center justify-between gap-2 ${
                          isSelected
                            ? "bg-[var(--sr-bg-page)]"
                            : "bg-[var(--sr-bg-surface)]"
                        }`}
                      >
                        <div className="flex flex-col">
                          <span
                            className={`text-xs font-semibold ${
                              day.isWeekend
                                ? "text-[var(--sr-text-muted)]"
                                : "text-[var(--sr-text-primary)]"
                            }`}
                          >
                            {day.weekdayShort}
                          </span>
                          <span className="text-[10px] text-[var(--sr-text-muted)] sr-tabular">
                            {day.dayNumber}/{day.monthNumber}
                          </span>
                        </div>

                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold sr-tabular ${
                            isToday
                              ? "bg-[#FF3B30] text-white"
                              : isSelected
                              ? "bg-[var(--sr-accent)] text-white"
                              : day.isWeekend
                              ? "text-[var(--sr-text-muted)]"
                              : "text-[var(--sr-text-primary)]"
                          }`}
                        >
                          {day.dayNumber}
                        </span>
                      </div>

                      {/* Horizontal Time Grid + Event Blocks */}
                      <div className="relative flex-1">
                        {/* Vertical Hour Lines */}
                        <div
                          className="absolute inset-0 grid pointer-events-none"
                          style={{ gridTemplateColumns: `repeat(${TOTAL_HOURS}, minmax(0, 1fr))` }}
                        >
                          {hours.map((hour) => (
                            <div
                              key={hour}
                              className="border-r last:border-r-0 border-[var(--sr-border)]/50 h-full"
                            />
                          ))}
                        </div>

                        {/* Red current-time vertical line on Today */}
                        {isToday && nowIndicatorLeftPct !== null && (
                          <div
                            style={{ left: `${nowIndicatorLeftPct}%` }}
                            className="absolute inset-y-0 z-10 flex flex-col items-center pointer-events-none"
                          >
                            <span className="h-2 w-2 -mt-1 rounded-full bg-[#FF3B30]" />
                            <span className="flex-1 w-[1.5px] bg-[#FF3B30]" />
                          </div>
                        )}

                        {/* Horizontal Tour Blocks */}
                        {blocks.map((block, bIdx) => {
                          const clampedStart = Math.max(block.startMinutes, START_HOUR * 60);
                          const clampedEnd = Math.min(block.endMinutes, END_HOUR * 60);
                          const leftPct = ((clampedStart - START_HOUR * 60) / TOTAL_MINUTES) * 100;
                          const widthPct = Math.max(
                            ((clampedEnd - clampedStart) / TOTAL_MINUTES) * 100,
                            5
                          );
                          const topPx = 8 + block.lane * LANE_HEIGHT;

                          const isSelectedBlock =
                            activeDayDetail &&
                            block.bookings.some((b) => b.id === activeDayDetail.id);
                          const colors = getEventBlockColors(block.repStatus, isSelectedBlock);

                          return (
                            <button
                              key={`${block.key}_${bIdx}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectDateKey(day.dateKey);
                                onSelectBooking(block.primaryBooking);
                                if (sidebarCollapsed) setSidebarCollapsed(false);
                              }}
                              style={{
                                left: `calc(${leftPct}% + 2px)`,
                                width: `calc(${widthPct}% - 4px)`,
                                top: `${topPx}px`,
                                height: `${LANE_HEIGHT - 6}px`,
                              }}
                              className={`absolute z-10 rounded-lg pl-2.5 pr-2 py-1 text-left overflow-hidden transition-all cursor-pointer shadow-xs flex flex-col justify-center ${colors.bg}`}
                            >
                              <span
                                className={`absolute left-1 top-1.5 bottom-1.5 w-[3px] rounded-full ${colors.bar}`}
                                aria-hidden="true"
                              />
                              <div className={`text-xs font-bold truncate ${colors.text}`}>
                                {block.experienceName}
                              </div>
                              <div
                                className={`flex items-center gap-1 text-[11px] font-medium sr-tabular truncate ${colors.sub}`}
                              >
                                <Clock size={10} className="shrink-0" aria-hidden="true" />
                                <span>{block.label}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Right: Compact Collapsible Sidebar (~18-22%) */}
      {!sidebarCollapsed && (
        <aside className="sr-surface flex flex-col gap-3.5" aria-label="Chi tiết đơn trong ngày">
          <div className="flex items-start justify-between gap-2 border-b border-[var(--sr-border)] pb-2.5">
            <div className="min-w-0">
              <span className="sr-eyebrow">Chi tiết ngày</span>
              <h2 className="text-sm font-bold text-[var(--sr-text-primary)] mt-0.5 capitalize m-0">
                {formatVietnameseFullDate(activeDateKey)}
              </h2>
            </div>
            {onCreateForDate && (
              <button
                type="button"
                onClick={() => onCreateForDate(activeDateKey)}
                className="sr-btn sr-btn-sm sr-btn-secondary shrink-0"
              >
                <Plus size={13} aria-hidden="true" />
                <span>Đặt chỗ</span>
              </button>
            )}
          </div>

          {dayBookings.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center gap-2">
              <CalendarIcon
                size={20}
                className="text-[var(--sr-text-muted)]"
                aria-hidden="true"
              />
              <p className="text-xs font-semibold text-[var(--sr-text-primary)] m-0">
                Không có tour ngày này
              </p>
              <p className="text-[11px] text-[var(--sr-text-muted)] m-0">
                Chọn một khung lịch trên bảng để xem chi tiết.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Compact list of orders on selected day */}
              <div className="flex flex-col gap-1.5 max-h-[14rem] overflow-y-auto pr-0.5">
                {dayBookings.map((b) => {
                  const isSelected = activeDayDetail?.id === b.id;
                  const [stLabel, stCls] = statusBadgeMap[b.status] || [
                    b.status_label || "Chưa rõ",
                    "sr-badge-neutral",
                  ];
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => onSelectBooking(b)}
                      className={`w-full text-left rounded-[var(--sr-radius-md)] border p-2 transition-all cursor-pointer ${
                        isSelected
                          ? "border-[var(--sr-accent)] bg-[var(--sr-accent-soft)]/45"
                          : "border-[var(--sr-border)] bg-[var(--sr-bg-page)]/60 hover:border-[var(--sr-accent)]/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[11px] font-semibold text-[var(--sr-accent-ink)] sr-tabular truncate">
                          {b.order_code || `#${b.id}`}
                        </span>
                        <span className={`sr-badge ${stCls} !text-[10px] !py-0`}>
                          <span className="sr-badge-dot" aria-hidden="true" />
                          <span>{stLabel}</span>
                        </span>
                      </div>
                      <div className="font-semibold text-xs text-[var(--sr-text-primary)] truncate mt-0.5">
                        {b.customer_name}
                      </div>
                      <div className="flex items-center justify-between gap-1 text-[11px] text-[var(--sr-text-muted)] mt-0.5 sr-tabular">
                        <span className="truncate">{b.time_slot || "06:00 - 10:30"}</span>
                        <span className="inline-flex items-center gap-0.5 shrink-0">
                          <Users size={10} aria-hidden="true" />
                          {(b.adults_count || 1) + (b.children_count || 0)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Booking Details */}
              {activeDayDetail && (
                <div className="rounded-[var(--sr-radius-md)] border border-[var(--sr-border)] bg-[var(--sr-bg-page)] p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[var(--sr-text-primary)] truncate">
                      {activeDayDetail.experience_name}
                    </span>
                    <strong className="text-xs sr-tabular text-[var(--sr-accent-ink)] shrink-0">
                      {activeDayDetail.total_price_formatted ||
                        formatMoney(activeDayDetail.total_price)}
                    </strong>
                  </div>

                  <div className="flex flex-col gap-1 text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[var(--sr-text-muted)] inline-flex items-center gap-1">
                        <Phone size={11} aria-hidden="true" /> SĐT
                      </span>
                      <strong className="sr-tabular text-[var(--sr-text-primary)]">
                        {activeDayDetail.customer_phone || "Chưa có"}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[var(--sr-text-muted)] inline-flex items-center gap-1">
                        <Mail size={11} aria-hidden="true" /> Email
                      </span>
                      <strong className="truncate max-w-[9.5rem] text-[var(--sr-text-primary)]">
                        {activeDayDetail.customer_email || "Chưa có"}
                      </strong>
                    </div>
                  </div>

                  {activeDayDetail.status !== "cancelled" &&
                    activeDayDetail.status !== "completed" && (
                      <div className="flex items-center gap-1.5 border-t border-[var(--sr-border)] pt-2">
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(activeDayDetail.id, "cancelled")}
                          className="sr-btn sr-btn-sm sr-btn-destructive !px-2"
                          title="Hủy đơn"
                        >
                          <XCircle size={13} aria-hidden="true" />
                        </button>

                        {activeDayDetail.status === "waiting_confirmation" ||
                        activeDayDetail.status === "waiting_payment" ? (
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(activeDayDetail.id, "confirmed")}
                            className="sr-btn sr-btn-sm sr-btn-primary flex-1"
                          >
                            <Check size={13} aria-hidden="true" />
                            <span>Xác nhận</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(activeDayDetail.id, "completed")}
                            className="sr-btn sr-btn-sm sr-btn-primary flex-1"
                          >
                            <UserCheck size={13} aria-hidden="true" />
                            <span>Hoàn thành</span>
                          </button>
                        )}
                      </div>
                    )}
                </div>
              )}
            </div>
          )}
        </aside>
      )}
    </div>
  );
};

export default DepartureCalendar;
