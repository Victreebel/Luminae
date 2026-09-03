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
  ACCOUNT_SESSION_STORAGE_KEY,
  type AccountInfo,
  type AccountSession,
} from "@/lib/accountSession";
import { syncAccountPreferences, setPreferencesSyncToken, type AccountPreferences } from "@/lib/cinematicPrefs";
import { claimPendingTutorialCompletion, setTutorialToken } from "@/lib/tutorialProgress";
import { clearSession as clearGameSession } from "@/lib/session";

const PREFS_POLL_INTERVAL_MS = 30_000;

function isAuthorizationFailure(error: unknown): boolean {
  const status = (error as { status?: number } | null)?.status;
  return status === 401 || status === 403;
}

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
  const sessionToken = session?.token;
  const sessionAccountId = session?.account?.id;

  const hydrateAccount = useCallback(async (current: AccountSession): Promise<AccountSession> => {
    const me = await apiGetMe(current.token);
    const hydrated = { ...current, account: { ...current.account, ...me } };
    saveAccountSession(hydrated);
    return hydrated;
  }, []);

  const clearLocalSession = useCallback((removeStoredAccount = true) => {
    if (removeStoredAccount) clearAccountSession();
    clearGameSession();
    _currentToken = null;
    setPreferencesSyncToken(null);
    setTutorialToken(null);
    setSession(null);
    setPrefs(null);
  }, []);

  useEffect(() => {
    const restore = async () => {
      const stored = getAccountSession();
      _currentToken = stored?.token ?? null;
      setPreferencesSyncToken(_currentToken);
      setTutorialToken(_currentToken);
      if (stored) {
        await claimPendingTutorialCompletion(stored.token).catch(() => false);
        const [preferencesResult, hydrationResult] = await Promise.allSettled([
          syncAccountPreferences(stored.token, stored.account.id),
          hydrateAccount(stored),
        ]);
        if (hydrationResult.status === "rejected" && isAuthorizationFailure(hydrationResult.reason)) {
          clearLocalSession();
          return;
        }
        if (preferencesResult.status === "fulfilled") setPrefs(preferencesResult.value);
        setSession(hydrationResult.status === "fulfilled" ? hydrationResult.value : stored);
      } else {
        setSession(null);
      }
    };
    void restore().finally(() => setIsLoading(false));
  }, [clearLocalSession, hydrateAccount]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === ACCOUNT_SESSION_STORAGE_KEY && event.newValue === null) {
        clearLocalSession(false);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [clearLocalSession]);

  // Poll preferences every 30 s while logged in so other open sessions stay current.
  useEffect(() => {
    if (!sessionToken || !sessionAccountId) return;
    const id = setInterval(async () => {
      try {
        const p = await syncAccountPreferences(sessionToken, sessionAccountId);
        setPrefs(p);
      } catch (error) {
        if (isAuthorizationFailure(error)) clearLocalSession();
        // network errors are non-fatal; next poll will retry
      }
    }, PREFS_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [clearLocalSession, sessionAccountId, sessionToken]);

  const login = useCallback(async (username: string, password: string) => {
    const s = await apiLogin({ username, password });
    saveAccountSession(s);
    _currentToken = s.token;
    setPreferencesSyncToken(s.token);
    setTutorialToken(s.token);
    await claimPendingTutorialCompletion(s.token).catch(() => false);
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
    await claimPendingTutorialCompletion(s.token).catch(() => false);
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
    clearLocalSession();
  }, [clearLocalSession, session]);

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
