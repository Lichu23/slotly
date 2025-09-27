"use client";

import Calendar from "./Calendar";

interface CustomTimeSlotsMessageProps {
  onPick: (date: string, time: string) => void;
}

export function CustomTimeSlotsMessage({ onPick }: CustomTimeSlotsMessageProps) {
  const handleDateAndTimeSelect = (date: string, time: string) => {
    onPick(date, time);
  };

  return (
    <div className="w-full">
      <Calendar onDateSelect={handleDateAndTimeSelect} />
    </div>
  );
}
