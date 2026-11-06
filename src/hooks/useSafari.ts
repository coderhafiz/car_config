"use client";

import { useState, useEffect } from "react";

export function useSafari() {
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const safari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    const timer = setTimeout(() => {
      setIsSafari(safari || ios);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  return isSafari;
}
