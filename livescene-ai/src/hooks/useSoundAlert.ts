import { useCallback, useRef } from "react";

/**
 * useSoundAlert — Web Audio API tones (no audio files needed)
 *
 * Provides three distinct sounds:
 *  playAlert  — ascending two-tone chime (goal met / alert triggered)
 *  playStart  — soft single blip (session started)
 *  playStop   — descending tone (session stopped)
 */
export function useSoundAlert() {
  const ctxRef = useRef<AudioContext | null>(null);

  function getCtx(): AudioContext {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new AudioContext();
    }
    // Resume if suspended (browser autoplay policy)
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }

  function playTone(
    frequency: number,
    startTime: number,
    duration: number,
    gain: number,
    type: OscillatorType = "sine",
  ) {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startTime);

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  /** Ascending two-tone — alert / goal met */
  const playAlert = useCallback(() => {
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;
      playTone(880, now, 0.15, 0.25, "sine");
      playTone(1175, now + 0.12, 0.2, 0.2, "sine");
    } catch {
      // AudioContext not available (SSR / blocked)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Soft single blip — session start */
  const playStart = useCallback(() => {
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;
      playTone(660, now, 0.1, 0.15, "sine");
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Descending tone — session stop */
  const playStop = useCallback(() => {
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;
      playTone(550, now, 0.08, 0.12, "sine");
      playTone(440, now + 0.07, 0.15, 0.1, "sine");
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { playAlert, playStart, playStop };
}
