import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import {
  getAccountSession,
  saveAccountSession,
  clearAccountSession,
  apiLogin,
  apiRegister,
  apiLogout,
  apiGetMe,
  type AccountInfo,
  type AccountSession,
} from "@/lib/accountSession";
import { syncAccountPreferences, setPreferencesSyncToken, type AccountPreferences } from "@/lib/cinematicPrefs";
import { setTutorialToken } from "@/lib/tutorialProgress";

const PREFS_POLL_INTERVAL_MS = 30_000;

interface AccountContextValue {
  account: AccountInfo | null;
  token: string | null;
  prefs: AccountPreferences | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccount: () => Promise<void>;
}

const AccountContext = createContext<AccountContextValue | null>(null);

// Keep a module-level reference to the current token so the getter is always fresh
let _currentToken: string | null = null;

// Register once — getter reads current token at call time
setAuthTokenGetter(() => _currentToken);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AccountSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [prefs, setPrefs] = useState<AccountPreferences | null>(null);

  const hydrateAccount = useCallback(async (current: AccountSession): Promise<AccountSession> => {
    const me = await apiGetMe(current.token);
    const hydrated = { ...current, account: { ...current.account, ...me } };
    saveAccountSession(hydrated);
    return hydrated;
  }, []);

  useEffect(() => {
    const restore = async () => {
      const stored = getAccountSession();
      _currentToken = stored?.token ?? null;
      setPreferencesSyncToken(_currentToken);
      setTutorialToken(_currentToken);
      if (stored) {
        const [p, hydrated] = await Promise.all([
          syncAccountPreferences(stored.token, stored.account.id).catch(() => null),
          hydrateAccount(stored).catch(() => stored),
        ]);
        if (p) setPrefs(p);
        setSession(hydrated);
      } else {
        setSession(null);
      }
    };
    void restore().finally(() => setIsLoading(false));
  }, [hydrateAccount]);

  useEffect(() => {
    const handleSessionChange = () => {
      const stored = getAccountSession();
      _currentToken = stored?.token ?? null;
      setPreferencesSyncToken(_currentToken);
      setTutorialToken(_currentToken);
      if (!stored) {
        setSession(null);
        setPrefs(null);
        return;
      }
      void Promise.all([
        syncAccountPreferences(stored.token, stored.account.id).catch(() => null),
        hydrateAccount(stored).catch(() => stored),
      ]).then(([nextPrefs, hydrated]) => {
        if (nextPrefs) setPrefs(nextPrefs);
        setSession(hydrated);
      });
    };
    window.addEventListener("luminae:account-session-changed", handleSessionChange);
    return () => window.removeEventListener("luminae:account-session-changed", handleSessionChange);
  }, [hydrateAccount]);

  // Poll preferences every 30 s while logged in so other open sessions stay current.
  useEffect(() => {
    if (!session?.token || !session?.account?.id) return;
    const { token, account } = session;
    const id = setInterval(async () => {
      try {
        const p = await syncAccountPreferences(token, account.id);
        setPrefs(p);
      } catch {
        // network errors are non-fatal; next poll will retry
      }
    }, PREFS_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [session?.token, session?.account?.id]);

  const login = useCallback(async (username: string, password: string) => {
    const s = await apiLogin({ username, password });
    saveAccountSession(s);
    _currentToken = s.token;
    setPreferencesSyncToken(s.token);
    setTutorialToken(s.token);
    const p = await syncAccountPreferences(s.token, s.account.id).catch(() => null);
    if (p) setPrefs(p);
    setSession(await hydrateAccount(s).catch(() => s));
  }, [hydrateAccount]);

  const register = useCallback(async (username: string, password: string, email?: string) => {
    const s = await apiRegister({ username, password, email });
    saveAccountSession(s);
    _currentToken = s.token;
    setPreferencesSyncToken(s.token);
    setTutorialToken(s.token);
    const p = await syncAccountPreferences(s.token, s.account.id).catch(() => null);
    if (p) setPrefs(p);
    setSession(await hydrateAccount(s).catch(() => s));
  }, [hydrateAccount]);

  const refreshAccount = useCallback(async () => {
    if (!session) return;
    setSession(await hydrateAccount(session));
  }, [hydrateAccount, session]);

  const logout = useCallback(async () => {
    if (session?.token) {
      await apiLogout(session.token).catch(() => {});
    }
    clearAccountSession();
    _currentToken = null;
    setPreferencesSyncToken(null);
    setTutorialToken(null);
    setSession(null);
    setPrefs(null);
  }, [session]);

  return (
    <AccountContext.Provider
      value={{
        account: session?.account ?? null,
        token: session?.token ?? null,
        prefs,
        isLoading,
        login,
        register,
        logout,
        refreshAccount,
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
