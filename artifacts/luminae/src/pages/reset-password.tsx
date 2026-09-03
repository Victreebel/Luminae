import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, CheckCircle, XCircle, ArrowLeft, KeyRound } from "lucide-react";
import { apiResetPassword } from "@/lib/accountSession";
import {
  LuminaeWordmark,
  OutOfMatchBackdrop,
  OutOfMatchHeader,
  OutOfMatchSectionHeading,
} from "@/components/out-of-match/OutOfMatchChrome";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [linkChecked, setLinkChecked] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (!t) {
      setError("Missing or invalid reset link. Please request a new one.");
    } else {
      setToken(t);
    }
    setLinkChecked(true);
  }, []);

  const handleSubmit = async () => {
    if (!token) return;
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await apiResetPassword({ token, newPassword: password });
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="oom-shell min-h-[100dvh] flex flex-col">
      <OutOfMatchBackdrop />
      <OutOfMatchHeader
        left={<LuminaeWordmark onClick={() => setLocation("/")} />}
        center={<span className="oom-kicker hidden sm:block !mb-0">Account Security</span>}
        right={(
          <button type="button" className="oom-icon-button" onClick={() => setLocation("/")} title="Return home">
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
      />

      <main className="oom-frame relative z-10 flex flex-1 items-center justify-center py-7 sm:py-10">
        <section className="oom-panel w-full max-w-md p-5 sm:p-7">
          <div className="mb-6 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
              <KeyRound className="h-5 w-5" />
            </span>
            <OutOfMatchSectionHeading
              eyebrow="Luminae Account"
              title={done ? "Access Restored" : linkChecked && !token ? "Reset Link Invalid" : "Set a New Password"}
            />
          </div>

          {!linkChecked ? (
            <div className="flex min-h-44 items-center justify-center" aria-label="Validating reset link">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : done ? (
            <div className="flex flex-col items-center gap-4 py-3 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-green-400/35 bg-green-400/10">
                <CheckCircle className="h-8 w-8 text-green-400" />
              </span>
              <div>
                <p className="font-semibold text-foreground">Password updated</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Your password has been changed and all previous sessions have been signed out.
                </p>
              </div>
              <Button
                className="oom-action-primary h-12"
                onClick={() => setLocation("/")}
              >
                Sign In
              </Button>
            </div>
          ) : !token ? (
            <div className="flex flex-col items-center gap-4 py-3 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-destructive/35 bg-destructive/10">
                <XCircle className="h-8 w-8 text-destructive" />
              </span>
              <div>
                <p className="font-semibold text-foreground">Invalid link</p>
                <p className="text-muted-foreground text-sm mt-1">
                  {error}
                </p>
              </div>
              <Button
                variant="outline"
                className="oom-action-secondary h-12"
                onClick={() => setLocation("/")}
              >
                Return Home
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="newPassword" className="text-sm font-medium">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="h-12 rounded-md bg-input/60 pr-11"
                    autoComplete="new-password"
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat your new password"
                  className="h-12 rounded-md bg-input/60"
                  autoComplete="new-password"
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
                disabled={isLoading || !password.trim() || !confirm.trim()}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Set New Password"
                )}
              </Button>

              <button
                type="button"
                onClick={() => setLocation("/")}
                className="flex w-full items-center justify-center gap-1.5 text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Sign In
              </button>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
