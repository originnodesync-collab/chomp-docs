"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface ExperimentTimerProps {
  seconds: number;
  onComplete?: () => void;
}

export default function ExperimentTimer({
  seconds,
  onComplete,
}: ExperimentTimerProps) {
  const [remaining, setRemaining] = useState(seconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRemaining(seconds);
    setIsRunning(false);
    clearTimer();
  }, [seconds, clearTimer]);

  const start = () => {
    if (isRunning) return;
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearTimer();
          setIsRunning(false);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const pause = () => {
    setIsRunning(false);
    clearTimer();
  };

  const reset = () => {
    setIsRunning(false);
    clearTimer();
    setRemaining(seconds);
  };

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const progress = seconds > 0 ? ((seconds - remaining) / seconds) * 100 : 0;

  return (
    <div className="bg-surface border border-border rounded-xl p-4 mt-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-text">⏱️ 타이머</span>
        <span
          className={`text-2xl font-mono font-bold ${
            remaining === 0 ? "text-cta" : "text-text"
          }`}
        >
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </span>
      </div>

      {/* 진행바 */}
      <div className="w-full h-2 bg-border rounded-full mb-3 overflow-hidden">
        <div
          className="h-full bg-cta rounded-full transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex gap-2">
        {!isRunning && remaining > 0 && (
          <button
            onClick={start}
            className="flex-1 bg-cta text-white text-sm font-semibold py-2 rounded-lg active:scale-[0.97] transition-transform"
          >
            {remaining === seconds ? "시작" : "계속"}
          </button>
        )}
        {isRunning && (
          <button
            onClick={pause}
            className="flex-1 bg-text-sub/20 text-text text-sm font-semibold py-2 rounded-lg active:scale-[0.97] transition-transform"
          >
            일시정지
          </button>
        )}
        {remaining < seconds && (
          <button
            onClick={reset}
            className="px-4 bg-text-sub/10 text-text-sub text-sm py-2 rounded-lg active:scale-[0.97] transition-transform"
          >
            초기화
          </button>
        )}
        {remaining === 0 && (
          <span className="flex-1 text-center text-cta font-semibold text-sm py-2">
            완료!
          </span>
        )}
      </div>
    </div>
  );
}
