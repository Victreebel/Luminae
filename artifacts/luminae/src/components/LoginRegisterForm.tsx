import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAccount } from "@/contexts/AccountContext";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

interface Props {
  onSuccess?: () => void;
  defaultMode?: "login" | "register";
  onAuthOutcome?: (
    mode: "login" | "register",
    outcome: "success" | "failure",
  ) => void;
}

export function LoginRegisterForm({ onSuccess, defaultMode = "login", onAuthOutcome }: Props) {
  const { login, register } = useAccount();
  const [mode, setMode] = useState<"login" | "register" | "forgot">(defaultMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (mode === "forgot") return;
    if (!username.trim() || !password.trim()) return;
    setError(null);
    setIsLoading(true);
    try {
      if (mode === "login") {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password, email.trim() || undefined);
      }
      onAuthOutcome?.(mode, "success");
      onSuccess?.();
    } catch (err: unknown) {
      onAuthOutcome?.(mode, "failure");
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === "forgot") {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="forgot"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          <ForgotPasswordForm onBack={() => { setMode("login"); setError(null); }} />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="oom-segmented grid grid-cols-2" aria-label="Account action">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setError(null); }}
            data-active={mode === m}
          >
            {m === "login" ? "Sign In" : "Create Account"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col gap-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="authUsername" className="text-sm font-medium">Username</Label>
            <Input
              id="authUsername"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your username"
              className="h-12 rounded-md bg-input/60"
              autoComplete="username"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          {mode === "register" && (
            <div className="space-y-1.5">
              <Label htmlFor="authEmail" className="text-sm font-medium">
                Email <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="authEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-12 rounded-md bg-input/60"
                autoComplete="email"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="authPassword" className="text-sm font-medium">Password</Label>
              {mode === "login" && (
                <button
                  type="button"
                  onClick={() => { setMode("forgot"); setError(null); }}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Input
                id="authPassword"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "register" ? "At least 10 characters" : "Your password"}
                minLength={mode === "register" ? 10 : undefined}
                maxLength={128}
                className="h-12 rounded-md bg-input/60 pr-11"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
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

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button
            className="oom-action-primary mt-1 h-12"
            onClick={handleSubmit}
            disabled={isLoading || !username.trim() || !password.trim() || (mode === "register" && password.length < 10)}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === "login" ? "Sign In" : "Create Account"}
          </Button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
