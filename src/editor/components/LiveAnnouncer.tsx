/**
 * ARIA live region bridge for screen reader announcements.
 * Usage: import { announce } from "./LiveAnnouncer" and call announce("message")
 */
import React, { useEffect, useRef } from "react";

let globalSetMessage: ((msg: string) => void) | null = null;

export function announce(message: string): void {
  globalSetMessage?.(message);
}

export function LiveAnnouncer() {
  const [message, setMessage] = React.useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    globalSetMessage = (msg: string) => {
      setMessage("");
      // Brief reset ensures re-announcement of identical messages
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setMessage(msg), 50);
    };
    return () => {
      globalSetMessage = null;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}
