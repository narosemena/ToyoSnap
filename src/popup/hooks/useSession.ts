import { useState, useEffect, useCallback, useRef } from 'react';
import type { CaptureMode } from '@/types/capture';

export interface SessionState {
  isRecording: boolean;
  hasSessions?: boolean;
  isPaused?: boolean;
  activeSessionId?: string;
  recordingStartedAt?: number;
  captureMode?: CaptureMode;
  captureCursor?: boolean;
  stepCount?: number;
}

/** Pure helper — exported for tests and popup UI. */
export function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function useSession() {
  const [state, setState] = useState<SessionState>({ isRecording: false });
  const [loading, setLoading] = useState(true);
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshState = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'GET_SESSION_STATE' }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn("[ToyoSnap] SW unreachable:", chrome.runtime.lastError);
      } else if (response) {
        setState(response);
      }
      setLoading(false);
    });
  }, []);

  // Tick elapsed timer while recording
  useEffect(() => {
    if (state.isRecording && state.recordingStartedAt) {
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - (state.recordingStartedAt ?? Date.now()));
      }, 500);
    } else {
      setElapsedMs(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.isRecording, state.recordingStartedAt]);

  useEffect(() => {
    refreshState();
    const listener = (message: unknown) => {
      if (
        typeof message === 'object' &&
        message !== null &&
        (message as { type?: unknown }).type === 'SESSION_UPDATED'
      ) {
        setState((message as { payload: SessionState }).payload);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [refreshState]);

  return { ...state, loading, refreshState, elapsedMs };
}
