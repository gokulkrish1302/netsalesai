import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { EMAIL_TONES, emailBody, emailSubject, type Tone } from "@/lib/emailTemplates";
import type { ScoredAccount } from "@/lib/types";
import { Copy, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmailModal({
  account,
  open,
  onOpenChange,
}: {
  account: ScoredAccount | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [tone, setTone] = useState<Tone>("Professional");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // Re-init when account/tone change
  const subj = account ? emailSubject(account) : "";
  const bodyText = account ? emailBody(account, tone) : "";
  if (account && (subject === "" || subject !== subj)) {
    // simple sync: only reset when account changes
  }

  function pickTone(t: Tone) {
    setTone(t);
    if (account) {
      setSubject(emailSubject(account));
      setBody(emailBody(account, t));
    }
  }

  // Initialize on open
  function onOpen(o: boolean) {
    if (o && account) {
      setSubject(subj);
      setBody(bodyText);
      setTone("Professional");
    }
    onOpenChange(o);
  }

  const effectiveSubject = subject || subj;
  const effectiveBody = body || bodyText;

  return (
    <Dialog open={open} onOpenChange={onOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Draft Outreach Email</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {EMAIL_TONES.map((t) => (
              <button
                key={t}
                onClick={() => pickTone(t)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  tone === t
                    ? "border-transparent text-white"
                    : "border-border bg-background text-muted-foreground hover:bg-accent",
                )}
                style={tone === t ? { backgroundColor: "var(--primary)" } : undefined}
              >
                {t}
              </button>
            ))}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Subject</label>
            <Input value={effectiveSubject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Body</label>
            <Textarea
              value={effectiveBody}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              className="font-sans text-sm"
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(`Subject: ${effectiveSubject}\n\n${effectiveBody}`);
                toast.success("✉️ Email copied to clipboard");
              }}
            >
              <Copy className="mr-2 h-4 w-4" /> Copy to Clipboard
            </Button>
            <Button
              onClick={() => {
                const url = `mailto:?subject=${encodeURIComponent(effectiveSubject)}&body=${encodeURIComponent(effectiveBody)}`;
                window.location.href = url;
              }}
            >
              <Mail className="mr-2 h-4 w-4" /> Open in Email Client
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
