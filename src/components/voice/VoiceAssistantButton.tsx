import { useEffect, useRef, useState } from "react";
import { Mic, Loader2, Volume2, VolumeX, X, Send, Trash2, MessageSquare } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { askVoiceAssistant } from "@/lib/voiceAssistant.functions";
import { useApp } from "@/state/AppStore";
import { useAuth } from "@/state/AuthContext";
import { cn } from "@/lib/utils";

type Status = "idle" | "listening" | "thinking" | "speaking";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

type SRConstructor = new () => any;
function getSpeechRecognition(): SRConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function VoiceAssistantButton() {
  const [status, setStatus] = useState<Status>("idle");
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [interim, setInterim] = useState("");
  const [textInput, setTextInput] = useState("");
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, interim, status]);

  function pickVoice(): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    const en = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
    const preferred = [
      "Google US English",
      "Microsoft Aria Online (Natural) - English (United States)",
      "Microsoft Jenny Online (Natural) - English (United States)",
      "Samantha",
    ];
    for (const name of preferred) {
      const match = en.find((v) => v.name === name);
      if (match) return match;
    }
    return en.find((v) => /natural|neural|enhanced/i.test(v.name)) ?? en[0] ?? voices[0];
  }

  function speak(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) utter.voice = voice;
    utter.rate = 0.9;
    utter.pitch = 1.0;
    utter.onend = () => setStatus("idle");
    utter.onerror = () => setStatus("idle");
    setStatus("speaking");
    window.speechSynthesis.speak(utter);
  }

  function stopSpeaking() {
    window.speechSynthesis?.cancel();
    if (status === "speaking") setStatus("idle");
  }

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setInterim("");
    setTextInput("");
    // Stop any in-flight TTS before producing a new response
    window.speechSynthesis?.cancel();

    // Snapshot history BEFORE adding the new user message (so we don't double-send it)
    const historySnapshot = messages.map((m) => ({ role: m.role, content: m.content }));

    const userMsg: ChatMessage = {
      id: newId(),
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
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
        data: {
          transcript: trimmed,
          accounts,
          repName: rep?.name ?? undefined,
          history: historySnapshot,
        },
      });
      const assistantMsg: ChatMessage = {
        id: newId(),
        role: "assistant",
        content: res.reply,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      speak(res.reply);
    } catch (e: any) {
      const msg = e?.message ?? "Voice assistant failed";
      toast.error(msg);
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "assistant", content: `⚠️ ${msg}`, timestamp: Date.now() },
      ]);
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
    setInterim("");
    window.speechSynthesis?.cancel();
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    let finalText = "";
    recognition.onresult = (e: any) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else live += r[0].transcript;
      }
      setInterim((finalText + live).trim());
    };
    recognition.onerror = (e: any) => {
      setStatus("idle");
      setInterim("");
      if (e.error !== "aborted" && e.error !== "no-speech") {
        toast.error(`Voice error: ${e.error}`);
      }
    };
    recognition.onend = () => {
      const text = finalText.trim();
      setInterim("");
      if (text) {
        void submit(text);
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

  function stopListening() {
    try {
      recognitionRef.current?.stop();
    } catch {}
    window.speechSynthesis?.cancel();
    setStatus("idle");
  }

  function clearConversation() {
    window.speechSynthesis?.cancel();
    setMessages([]);
    setInterim("");
    setStatus("idle");
  }

  const statusLabel =
    status === "listening"
      ? "Listening…"
      : status === "thinking"
        ? "Thinking…"
        : status === "speaking"
          ? "Speaking…"
          : "";

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-6 z-40 flex h-[min(560px,calc(100vh-8rem))] w-[min(400px,calc(100vw-3rem))] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: "var(--primary)" }}
              >
                <MessageSquare className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="text-sm font-semibold">Sales assistant</div>
                {statusLabel && (
                  <div className="text-[11px] text-muted-foreground">{statusLabel}</div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearConversation}
                disabled={messages.length === 0 && !interim}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent disabled:opacity-40"
                title="Clear conversation"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </button>
              <button
                onClick={() => {
                  stopListening();
                  setOpen(false);
                }}
                className="rounded-full p-1 text-muted-foreground hover:bg-accent"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && !interim && (
              <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                Try: "top accounts today", "tell me about Acme", "renewal alerts", or "draft email
                to Acme".
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn("flex flex-col", m.role === "user" ? "items-end" : "items-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm",
                    m.role === "user"
                      ? "rounded-br-sm bg-blue-600 text-white"
                      : "rounded-bl-sm bg-muted text-foreground",
                  )}
                >
                  {m.content}
                </div>
                <div className="mt-1 px-1 text-[10px] text-muted-foreground">
                  {formatTime(m.timestamp)}
                </div>
              </div>
            ))}
            {interim && status === "listening" && (
              <div className="flex flex-col items-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-blue-600/60 px-3 py-2 text-sm italic text-white">
                  {interim}
                </div>
              </div>
            )}
            {status === "thinking" && (
              <div className="flex items-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Thinking…
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t bg-background/60 p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submit(textInput);
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={status === "listening" ? stopListening : startListening}
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-colors",
                  status === "listening" && "animate-pulse",
                )}
                style={{
                  backgroundColor:
                    status === "listening" ? "var(--destructive)" : "var(--primary)",
                }}
                title={status === "listening" ? "Stop listening" : "Speak"}
                aria-label="Voice input"
              >
                <Mic className="h-4 w-4" />
              </button>
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type or speak a question…"
                className="flex-1 rounded-full border bg-background px-4 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                disabled={status === "thinking"}
              />
              <button
                type="submit"
                disabled={!textInput.trim() || status === "thinking"}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-40"
                style={{ backgroundColor: "var(--primary)" }}
                aria-label="Send"
              >
                {status === "thinking" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      <button
        onClick={() => {
          if (!open) {
            setOpen(true);
            return;
          }
          if (status === "listening") stopListening();
          else startListening();
        }}
        aria-label="Voice assistant"
        title="Voice assistant"
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
