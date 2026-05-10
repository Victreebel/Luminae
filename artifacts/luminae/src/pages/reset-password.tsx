import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, CheckCircle, XCircle } from "lucide-react";
import { apiResetPassword } from "@/lib/accountSession";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (!t) {
      setError("Missing or invalid reset link. Please request a new one.");
    } else {
      setToken(t);
    }
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
    <div className="dark min-h-[100dvh] bg-background text-foreground flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-primary">Luminae</h1>
          <p className="text-muted-foreground text-sm">Reset your password</p>
        </div>

        <div className="bg-card/50 border border-border/50 rounded-2xl p-6 space-y-4">
          {done ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle className="h-12 w-12 text-green-400" />
              <div>
                <p className="font-semibold text-foreground">Password updated!</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Your password has been changed and all previous sessions have been signed out.
                </p>
              </div>
              <Button
                className="w-full h-11 rounded-xl font-bold"
                onClick={() => setLocation("/")}
              >
                Sign In
              </Button>
            </div>
          ) : !token ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <XCircle className="h-12 w-12 text-destructive" />
              <div>
                <p className="font-semibold text-foreground">Invalid link</p>
                <p className="text-muted-foreground text-sm mt-1">
                  {error}
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full h-11 rounded-xl"
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
                    placeholder="Min 6 characters"
                    className="h-11 bg-input/60 rounded-xl pr-10"
                    autoComplete="new-password"
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
                  className="h-11 bg-input/60 rounded-xl"
                  autoComplete="new-password"
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                />
              </div>

              {error && (
                <p className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                className="w-full h-12 font-bold rounded-xl"
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
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Back to Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
