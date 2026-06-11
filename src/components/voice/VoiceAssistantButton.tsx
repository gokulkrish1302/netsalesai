import { useEffect, useRef, useState } from "react";
import { Mic, Loader2, Volume2, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { askVoiceAssistant } from "@/lib/voiceAssistant.functions";
import { useApp } from "@/state/AppStore";
import { useAuth } from "@/state/AuthContext";
import { cn } from "@/lib/utils";

type Status = "idle" | "listening" | "thinking" | "speaking";

// Minimal typings for the Web Speech API
type SRConstructor = new () => any;
function getSpeechRecognition(): SRConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function VoiceAssistantButton() {
  const [status, setStatus] = useState<Status>("idle");
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [open, setOpen] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { scoredAccounts } = useApp();
  const { rep } = useAuth();
  const ask = useServerFn(askVoiceAssistant);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
        window.speechSynthesis?.cancel();
      } catch {}
    };
  }, []);

  function speak(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.05;
    utter.pitch = 1;
    utter.onend = () => setStatus("idle");
    utter.onerror = () => setStatus("idle");
    setStatus("speaking");
    window.speechSynthesis.speak(utter);
  }

  async function handleTranscript(text: string) {
    setTranscript(text);
    setStatus("thinking");
    try {
      const accounts = scoredAccounts.map((a) => ({
        id: a.id,
        accountName: a.accountName,
        score: a.score,
        category: a.category,
        utilizationPct: a.utilizationPct,
        contractRenewalDays: a.contractRenewalDays,
        pipelineStage: a.pipelineStage,
        industry: a.industry,
        region: a.region,
        deviceModel: a.deviceModel,
        deviceAgeYears: a.deviceAgeYears,
      }));
      const res = await ask({
        data: { transcript: text, accounts, repName: rep?.name ?? undefined },
      });
      setReply(res.reply);
      speak(res.reply);
    } catch (e: any) {
      const msg = e?.message ?? "Voice assistant failed";
      setReply(msg);
      toast.error(msg);
      setStatus("idle");
    }
  }

  function startListening() {
    const SR = getSpeechRecognition();
    if (!SR) {
      toast.error("Voice recognition isn't supported in this browser. Try Chrome.");
      return;
    }
    setOpen(true);
    setReply("");
    setTranscript("");
    window.speechSynthesis?.cancel();
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    let finalText = "";
    recognition.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      setTranscript((finalText + interim).trim());
    };
    recognition.onerror = (e: any) => {
      setStatus("idle");
      if (e.error !== "aborted" && e.error !== "no-speech") {
        toast.error(`Voice error: ${e.error}`);
      }
    };
    recognition.onend = () => {
      const text = finalText.trim();
      if (text) {
        void handleTranscript(text);
      } else if (status === "listening") {
        setStatus("idle");
      }
    };
    recognitionRef.current = recognition;
    setStatus("listening");
    try {
      recognition.start();
    } catch {
      setStatus("idle");
    }
  }

  function stop() {
    try {
      recognitionRef.current?.stop();
    } catch {}
    window.speechSynthesis?.cancel();
    setStatus("idle");
  }

  function close() {
    stop();
    setOpen(false);
  }

  const label =
    status === "listening"
      ? "Listening…"
      : status === "thinking"
        ? "Thinking…"
        : status === "speaking"
          ? "Speaking…"
          : "Ask the assistant";

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-[min(360px,calc(100vw-3rem))] rounded-2xl border bg-card p-4 shadow-xl">
          <div className="flex items-start justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </div>
            <button
              onClick={close}
              className="rounded-full p-1 text-muted-foreground hover:bg-accent"
              aria-label="Close voice assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {transcript && (
            <div className="mt-2 text-sm">
              <span className="text-muted-foreground">You: </span>
              {transcript}
            </div>
          )}
          {reply && (
            <div className="mt-2 flex gap-2 text-sm">
              <Volume2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="leading-relaxed">{reply}</p>
            </div>
          )}
          {!transcript && !reply && (
            <p className="mt-2 text-xs text-muted-foreground">
              Try: "top accounts today", "tell me about Acme", "renewal alerts", or "draft email to Acme".
            </p>
          )}
        </div>
      )}
      <button
        onClick={status === "listening" ? stop : startListening}
        aria-label={label}
        title={label}
        className={cn(
          "fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          status === "listening" && "animate-pulse",
        )}
        style={{
          backgroundColor:
            status === "listening"
              ? "var(--destructive)"
              : status === "thinking" || status === "speaking"
                ? "var(--muted-foreground)"
                : "var(--primary)",
        }}
      >
        {status === "thinking" ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : status === "speaking" ? (
          <Volume2 className="h-6 w-6" />
        ) : (
          <Mic className="h-6 w-6" />
        )}
      </button>
    </>
  );
}
