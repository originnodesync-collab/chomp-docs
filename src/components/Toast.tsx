"use client";

import { useState, useEffect } from "react";

interface ToastProps {
  message: string;
  type?: "success" | "uk" | "info";
  onClose: () => void;
}

export default function Toast({ message, type = "info", onClose }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      }`}
    >
      <div
        className={`rounded-xl px-5 py-3 shadow-lg text-sm font-semibold max-w-xs text-center ${
          type === "uk"
            ? "bg-blue-600 text-white"
            : type === "success"
            ? "bg-green-600 text-white"
            : "bg-text text-base"
        }`}
      >
        {type === "uk" && (
          <span className="inline-block animate-bounce mr-1">🇬🇧</span>
        )}
        {message}
      </div>
    </div>
  );
}
