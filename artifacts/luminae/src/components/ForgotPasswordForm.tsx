import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import { apiForgotPassword } from "@/lib/accountSession";

interface Props {
  onBack: () => void;
}

export function ForgotPasswordForm({ onBack }: Props) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setError(null);
    setIsLoading(true);
    try {
      await apiForgotPassword(email.trim());
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <CheckCircle className="h-12 w-12 text-green-400" />
        <div className="space-y-1">
          <p className="font-semibold text-foreground">Check your email</p>
          <p className="text-muted-foreground text-sm">
            If <span className="text-foreground">{email}</span> is registered, a reset link has been sent. It expires in 1 hour.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">Forgot your password?</p>
        <p className="text-xs text-muted-foreground">
          Enter your account email and we'll send you a reset link.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="forgotEmail" className="text-sm font-medium">Email</Label>
        <Input
          id="forgotEmail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="h-12 rounded-md bg-input/60"
          autoComplete="email"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button
        className="oom-action-primary h-12"
        onClick={handleSubmit}
        disabled={isLoading || !email.trim()}
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Link"}
      </Button>

      <button
        type="button"
        onClick={onBack}
        className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Sign In
      </button>
    </div>
  );
}
