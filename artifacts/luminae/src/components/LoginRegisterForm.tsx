import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAccount } from "@/contexts/AccountContext";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";

interface Props {
  onSuccess?: () => void;
  defaultMode?: "login" | "register";
}

export function LoginRegisterForm({ onSuccess, defaultMode = "login" }: Props) {
  const { login, register } = useAccount();
  const [mode, setMode] = useState<"login" | "register">(defaultMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) return;
    setError(null);
    setIsLoading(true);
    try {
      if (mode === "login") {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password, email.trim() || undefined);
      }
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Mode toggle */}
      <div className="flex rounded-xl bg-secondary/40 p-1 gap-1">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setError(null); }}
            className={`flex-1 h-9 rounded-lg text-sm font-semibold transition-colors ${
              mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
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
              className="h-11 bg-input/60 rounded-xl"
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
                className="h-11 bg-input/60 rounded-xl"
                autoComplete="email"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="authPassword" className="text-sm font-medium">Password</Label>
            <div className="relative">
              <Input
                id="authPassword"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "register" ? "Min 6 characters" : "Your password"}
                className="h-11 bg-input/60 rounded-xl pr-10"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
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

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button
            className="h-12 font-bold rounded-xl mt-1"
            onClick={handleSubmit}
            disabled={isLoading || !username.trim() || !password.trim()}
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
