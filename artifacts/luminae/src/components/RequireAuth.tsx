import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useAccount } from "@/contexts/AccountContext";

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const [, setLocation] = useLocation();
  const { account, isLoading } = useAccount();

  useEffect(() => {
    if (!isLoading && !account) {
      setLocation("/");
    }
  }, [isLoading, account, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!account) {
    return null;
  }

  return <>{children}</>;
}
