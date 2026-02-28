import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
export type VoiceCommand =
  | { type: "start" }
  | { type: "stop" }
  | { type: "snapshot" }
  | { type: "reset" }
  | { type: "set_goal"; text: string }
  | { type: "ask"; question: string }
  | { type: "clear_goals" }
  | { type: "mute_voice" }
  | { type: "unmute_voice" };

export interface VoiceInputState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string; // latest interim/final transcript text
  lastCommand: VoiceCommand | null;
  micLevel: number; // 0–1 volume level for the waveform bar
  error: string | null;
}

interface UseVoiceInputOptions {
  onCommand?: (cmd: VoiceCommand) => void;
  onTranscript?: (text: string) => void; // fires on every final transcript
}

// ─── Browser SpeechRecognition shim ──────────────────────────────────────────
const SpeechRecognition =
  (window as any).SpeechRecognition ||
  (window as any).webkitSpeechRecognition ||
  null;

// ─── Command parser ───────────────────────────────────────────────────────────
function parseCommand(text: string): VoiceCommand | null {
  const t = text.toLowerCase().trim();

  if (/^start(\s|$)/.test(t) || t === "go" || t === "begin")
    return { type: "start" };
  if (/^stop(\s|$)/.test(t) || t === "pause" || t === "halt")
    return { type: "stop" };
  if (/^(take\s)?snapshot|snap(\s|$)/.test(t) || t === "capture")
    return { type: "snapshot" };
  if (/^reset(\s|$)/.test(t) || t === "clear all" || t === "restart")
    return { type: "reset" };
  if (/^clear\s?(goals?)?$/.test(t)) return { type: "clear_goals" };
  if (/^(mute|disable)\s(voice|speech|audio)/.test(t))
    return { type: "mute_voice" };
  if (/^(unmute|enable)\s(voice|speech|audio)/.test(t))
    return { type: "unmute_voice" };

  // "set goal <text>" or "add goal <text>" or "alert me if <text>"
  const goalMatch =
    t.match(/^(?:set|add)\s+goal\s+(.+)$/) ||
    t.match(/^(?:alert\s+me\s+(?:if|when)\s+)(.+)$/) ||
    t.match(/^(?:watch\s+for\s+)(.+)$/);
  if (goalMatch) return { type: "set_goal", text: goalMatch[1].trim() };

  // "what do you see" / "describe the scene" / "what's happening" / "ask <question>"
  const askMatch =
    t.match(
      /^(?:what(?:'s|\s+is)?\s+(?:do\s+you\s+see|happening|in\s+the\s+scene)(?:\?)?)/i,
    ) ||
    t.match(/^(?:describe(?:\s+the\s+scene)?(?:\?)?)/i) ||
    t.match(/^ask\s+(.+)/i);

  if (askMatch) {
    const question = askMatch[1]
      ? askMatch[1].trim()
      : "What do you see in the scene?";
    return { type: "ask", question };
  }

  return null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useVoiceInput({
  onCommand,
  onTranscript,
}: UseVoiceInputOptions = {}) {
  const [state, setState] = useState<VoiceInputState>({
    isListening: false,
    isSupported: !!SpeechRecognition,
    transcript: "",
    lastCommand: null,
    micLevel: 0,
    error: null,
  });

  const recognitionRef = useRef<any>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const levelRafRef = useRef<number>(0);
  const onCommandRef = useRef(onCommand);
  const onTranscriptRef = useRef(onTranscript);

  // Keep refs up to date without re-creating the recognition object
  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  // ── Mic level polling via Web Audio API ────────────────────────────────────
  const startMicLevel = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(buf);
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
        setState((s) => ({ ...s, micLevel: Math.min(1, avg / 80) }));
        levelRafRef.current = requestAnimationFrame(tick);
      };
      levelRafRef.current = requestAnimationFrame(tick);
    } catch {
      // mic permission denied — ignore, level stays 0
    }
  }, []);

  const stopMicLevel = useCallback(() => {
    cancelAnimationFrame(levelRafRef.current);
    analyserRef.current?.disconnect();
    audioCtxRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    analyserRef.current = null;
    audioCtxRef.current = null;
    streamRef.current = null;
    setState((s) => ({ ...s, micLevel: 0 }));
  }, []);

  // ── Start listening ────────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      setState((s) => ({
        ...s,
        error: "Speech recognition not supported in this browser. Use Chrome.",
      }));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setState((s) => ({ ...s, isListening: true, error: null }));
      startMicLevel();
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let finalText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      const display = finalText || interim;
      setState((s) => ({ ...s, transcript: display }));

      if (finalText.trim()) {
        onTranscriptRef.current?.(finalText.trim());
        const cmd = parseCommand(finalText.trim());
        if (cmd) {
          setState((s) => ({ ...s, lastCommand: cmd }));
          onCommandRef.current?.(cmd);
        }
      }
    };

    recognition.onerror = (event: any) => {
      // "no-speech" is benign — continuous mode fires it often
      if (event.error === "no-speech") return;
      setState((s) => ({
        ...s,
        error: `Mic error: ${event.error}`,
        isListening: false,
      }));
    };

    recognition.onend = () => {
      // Auto-restart in continuous mode if we didn't intentionally stop
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          /* already started */
        }
      }
    };

    try {
      recognition.start();
    } catch {
      setState((s) => ({ ...s, error: "Could not start recognition." }));
    }
  }, [startMicLevel]);

  // ── Stop listening ─────────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null; // prevent auto-restart
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    stopMicLevel();
    setState((s) => ({
      ...s,
      isListening: false,
      transcript: "",
      micLevel: 0,
    }));
  }, [stopMicLevel]);

  // ── Toggle ─────────────────────────────────────────────────────────────────
  const toggleListening = useCallback(() => {
    if (state.isListening) stopListening();
    else startListening();
  }, [state.isListening, startListening, stopListening]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      stopMicLevel();
    };
  }, []); // eslint-disable-line

  return {
    ...state,
    startListening,
    stopListening,
    toggleListening,
  };
}
