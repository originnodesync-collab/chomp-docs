"use client";

import { useEffect, useRef, useCallback } from "react";

export function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const request = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      }
    } catch {
      // 사용자가 거부하거나 지원하지 않는 경우 무시
    }
  }, []);

  const release = useCallback(async () => {
    try {
      await wakeLockRef.current?.release();
      wakeLockRef.current = null;
    } catch {
      // 무시
    }
  }, []);

  // 페이지 다시 활성화 시 재요청
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && wakeLockRef.current === null) {
        request();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    request();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      release();
    };
  }, [request, release]);
}
