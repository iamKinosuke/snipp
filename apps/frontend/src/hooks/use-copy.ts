"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useCopiedFlag(resetAfterMs = 2000) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, []);

  const flash = useCallback(() => {
    setCopied(true);
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), resetAfterMs);
  }, [resetAfterMs]);

  return { copied, flash };
}

export function useCopy(resetAfterMs = 2000) {
  const { copied, flash } = useCopiedFlag(resetAfterMs);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        return false;
      }

      flash();
      return true;
    },
    [flash],
  );

  return { copied, copy };
}
