import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import {
  getAccountSession,
  saveAccountSession,
  clearAccountSession,
  apiLogin,
  apiRegister,
  apiLogout,
  type AccountInfo,
  type AccountSession,
} from "@/lib/accountSession";
import { syncAccountPreferences } from "@/lib/cinematicPrefs";

interface AccountContextValue {
  account: AccountInfo | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AccountContext = createContext<AccountContextValue | null>(null);

// Keep a module-level reference to the current token so the getter is always fresh
let _currentToken: string | null = null;

// Register once — getter reads current token at call time
setAuthTokenGetter(() => _currentToken);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AccountSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      const stored = getAccountSession();
      _currentToken = stored?.token ?? null;
      if (stored) {
        await syncAccountPreferences(stored.token, stored.account.id).catch(() => undefined);
      }
      setSession(stored);
    };
    void restore().finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const s = await apiLogin({ username, password });
    saveAccountSession(s);
    _currentToken = s.token;
    await syncAccountPreferences(s.token, s.account.id).catch(() => undefined);
    setSession(s);
  }, []);

  const register = useCallback(async (username: string, password: string, email?: string) => {
    const s = await apiRegister({ username, password, email });
    saveAccountSession(s);
    _currentToken = s.token;
    await syncAccountPreferences(s.token, s.account.id).catch(() => undefined);
    setSession(s);
  }, []);

  const logout = useCallback(async () => {
    if (session?.token) {
      await apiLogout(session.token).catch(() => {});
    }
    clearAccountSession();
    _currentToken = null;
    setSession(null);
  }, [session]);

  return (
    <AccountContext.Provider
      value={{
        account: session?.account ?? null,
        token: session?.token ?? null,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used within AccountProvider");
  return ctx;
}
