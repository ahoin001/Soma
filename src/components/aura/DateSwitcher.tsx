import { useEffect, useMemo, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { SHEET_CALENDAR_KEY } from "@/lib/storageKeys";
import { useSheetManager } from "@/hooks/useSheetManager";

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const formatDay = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);

const formatFull = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);

type DateSwitcherProps = {
  value?: Date;
  onChange?: (date: Date) => void;
};

export const DateSwitcher = ({ value, onChange }: DateSwitcherProps) => {
  const { activeSheet, openSheet, closeSheets } = useSheetManager<"calendar">(
    null,
    { storageKey: SHEET_CALENDAR_KEY, persist: true },
  );
  const [selectedDate, setSelectedDate] = useState(value ?? new Date());
  const label = useMemo(() => {
    const today = new Date();
    const prefix = isSameDay(selectedDate, today) ? "Today" : "Selected";
    return `${prefix}, ${formatDay(selectedDate)}`;
  }, [selectedDate]);

  const shiftDate = (delta: number) => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + delta);
      onChange?.(next);
      return next;
    });
  };

  useEffect(() => {
    if (!value) return;
    setSelectedDate(value);
  }, [value]);

  return (
    <Drawer
      open={activeSheet === "calendar"}
      onOpenChange={(open) => (open ? openSheet("calendar") : closeSheets())}
    >
      <section className="mt-8 flex items-center justify-between rounded-[24px] border border-black/5 bg-white px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => shiftDate(-1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <DrawerTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-slate-800"
          >
            <CalendarDays className="h-4 w-4 text-emerald-500" />
            {label}
          </Button>
        </DrawerTrigger>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => shiftDate(1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </section>
      <DrawerContent className="rounded-t-[28px] border-t border-emerald-100 bg-gradient-to-b from-white via-emerald-50/60 to-white px-5 pb-8 pt-6">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-xl font-display text-emerald-950">
            Calendar
          </DrawerTitle>
          <p className="text-sm text-emerald-700/70">
            Jump to a day to review your nutrition flow.
          </p>
        </DrawerHeader>
        <div className="mt-4 rounded-[24px] border border-emerald-100 bg-white/90 p-2 shadow-[0_12px_28px_rgba(16,185,129,0.12)]">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (!date) return;
              setSelectedDate(date);
              onChange?.(date);
              closeSheets();
            }}
            className="w-full"
          />
        </div>
        <div className="mt-4 rounded-[18px] border border-emerald-100/80 bg-white/80 px-4 py-3 text-sm text-emerald-700/80">
          {formatFull(selectedDate)}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
