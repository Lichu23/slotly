"use client";

const DEFAULT_SLOTS = ["09:00", "10:30", "12:00", "15:00", "17:30"] as const;

export function TimeSlotsMessage({ onPick, slots = DEFAULT_SLOTS }: { onPick: (time: string) => void; slots?: readonly string[] }) {
  return (
    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full">
      {slots.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onPick(t)}
          className="px-3 py-2 rounded-lg border border-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 w-full sm:w-auto text-center"
        >
          {t}
        </button>
      ))}
    </div>
  );
}


