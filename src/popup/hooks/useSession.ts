import { useState, useEffect, useCallback } from 'react';
import type { CaptureMode } from '@/types/capture';

export interface SessionState {
  isRecording: boolean;
  activeSessionId?: string;
  recordingStartedAt?: number;
  captureMode?: CaptureMode;
  captureCursor?: boolean;
}

export function useSession() {
  const [state, setState] = useState<SessionState>({ isRecording: false });
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    refreshState();

    const listener = (message: any) => {
      if (message.type === 'SESSION_UPDATED') {
        setState(message.payload);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [refreshState]);

  return { ...state, loading, refreshState };
}