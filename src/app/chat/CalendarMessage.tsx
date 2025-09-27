"use client";

import { useState } from "react";

export function CalendarMessage({ onSelect }: { onSelect: (dateISO: string) => void }) {
  const [value, setValue] = useState("");
  const min = new Date().toISOString().split("T")[0]; // Today

  return (
    <div className="flex flex-col gap-3 w-full">
      <input
        type="date"
        min={min}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors text-base"
      />
      <button
        type="button"
        onClick={() => onSelect(value)}
        className="w-full px-4 py-3 rounded-md bg-black text-white font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 transition-colors cursor-pointer text-base"
      >
        Confirmar fecha
      </button>
    </div>
  );
}