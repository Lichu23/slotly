"use client";

import { useState } from "react";

export function CalendarMessage({ onSelect }: { onSelect: (dateISO: string) => void }) {
  const today = new Date();
  const min = today.toISOString().slice(0, 10);
  const [value, setValue] = useState<string>(min);

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 w-full">
      <input
        type="date"
        min={min}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="border rounded-md px-3 py-2 w-full"
      />
      <button
        type="button"
        onClick={() => onSelect(value)}
        className="px-3 py-2 rounded-lg bg-neutral-900 text-white w-full sm:w-auto whitespace-nowrap"
      >
        Confirmar fecha
      </button>
    </div>
  );
}


