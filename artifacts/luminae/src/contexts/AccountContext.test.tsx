import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  setAuthTokenGetter: vi.fn(),
  getAccountSession: vi.fn(),
  saveAccountSession: vi.fn(),
  clearAccountSession: vi.fn(),
  apiLogin: vi.fn(),
  apiRegister: vi.fn(),
  apiLogout: vi.fn(),
  apiGetMe: vi.fn(),
  syncAccountPreferences: vi.fn(),
  setPreferencesSyncToken: vi.fn(),
  claimPendingTutorialCompletion: vi.fn(),
  setTutorialToken: vi.fn(),
  clearGameSession: vi.fn(),
}));

vi.mock("@workspace/api-client-react", () => ({
  setAuthTokenGetter: mocks.setAuthTokenGetter,
}));

vi.mock("@/lib/accountSession", () => ({
  ACCOUNT_SESSION_STORAGE_KEY: "luminae_account_session",
  getAccountSession: mocks.getAccountSession,
  saveAccountSession: mocks.saveAccountSession,
  clearAccountSession: mocks.clearAccountSession,
  apiLogin: mocks.apiLogin,
  apiRegister: mocks.apiRegister,
  apiLogout: mocks.apiLogout,
  apiGetMe: mocks.apiGetMe,
}));

vi.mock("@/lib/cinematicPrefs", () => ({
  syncAccountPreferences: mocks.syncAccountPreferences,
  setPreferencesSyncToken: mocks.setPreferencesSyncToken,
}));

vi.mock("@/lib/tutorialProgress", () => ({
  claimPendingTutorialCompletion: mocks.claimPendingTutorialCompletion,
  setTutorialToken: mocks.setTutorialToken,
}));

vi.mock("@/lib/session", () => ({
  clearSession: mocks.clearGameSession,
}));

import { AccountProvider, useAccount } from "./AccountContext";

const session = {
  account: { id: "account-1", username: "Architect" },
  token: "account-token",
  expiresAt: "2099-01-01T00:00:00.000Z",
};

function AccountProbe({ mode }: { mode: "login" | "register" }) {
  const { account, login, register, logout } = useAccount();
  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (mode === "login") void login("Architect", "password");
          else void register("Architect", "password", "architect@example.com");
        }}
      >
        Authenticate
      </button>
      <button type="button" onClick={() => void logout()}>Sign out</button>
      <span>{account?.username ?? "guest"}</span>
    </>
  );
}

describe("AccountProvider tutorial claim ordering", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.getAccountSession.mockReturnValue(null);
    mocks.apiLogin.mockResolvedValue(session);
    mocks.apiRegister.mockResolvedValue(session);
    mocks.apiGetMe.mockResolvedValue(session.account);
    mocks.apiLogout.mockResolvedValue(undefined);
    mocks.claimPendingTutorialCompletion.mockResolvedValue(false);
    mocks.syncAccountPreferences.mockResolvedValue({});
  });

  afterEach(cleanup);

  it.each(["login", "register"] as const)(
    "claims guest tutorial completion before preference sync on %s",
    async (mode) => {
      let acceptClaim: (() => void) | undefined;
      mocks.claimPendingTutorialCompletion.mockImplementationOnce(
        () => new Promise<void>((resolve) => { acceptClaim = resolve; }),
      );

      render(
        <AccountProvider>
          <AccountProbe mode={mode} />
        </AccountProvider>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Authenticate" }));

      await waitFor(() => expect(mocks.claimPendingTutorialCompletion).toHaveBeenCalledWith("account-token"));
      expect(mocks.syncAccountPreferences).not.toHaveBeenCalled();

      acceptClaim?.();
      await waitFor(() => expect(mocks.syncAccountPreferences).toHaveBeenCalledWith("account-token", "account-1"));
      expect(await screen.findByText("Architect")).toBeInTheDocument();

      if (mode === "login") {
        expect(mocks.apiLogin).toHaveBeenCalledWith({ username: "Architect", password: "password" });
      } else {
        expect(mocks.apiRegister).toHaveBeenCalledWith({
          username: "Architect",
          password: "password",
          email: "architect@example.com",
        });
      }
    },
  );

  it("clears the account and active game seat when signing out", async () => {
    mocks.getAccountSession.mockReturnValue(session);
    render(
      <AccountProvider>
        <AccountProbe mode="login" />
      </AccountProvider>,
    );

    expect(await screen.findByText("Architect")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(mocks.apiLogout).toHaveBeenCalledWith("account-token"));
    expect(mocks.clearAccountSession).toHaveBeenCalledOnce();
    expect(mocks.clearGameSession).toHaveBeenCalledOnce();
    expect(await screen.findByText("guest")).toBeInTheDocument();
  });

  it("clears a stored session when the server rejects it", async () => {
    mocks.getAccountSession.mockReturnValue(session);
    mocks.apiGetMe.mockRejectedValue({ status: 401 });

    render(
      <AccountProvider>
        <AccountProbe mode="login" />
      </AccountProvider>,
    );

    expect(await screen.findByText("guest")).toBeInTheDocument();
    expect(mocks.clearAccountSession).toHaveBeenCalledOnce();
    expect(mocks.clearGameSession).toHaveBeenCalledOnce();
  });
});
