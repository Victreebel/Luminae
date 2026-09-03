import { Component, lazy, Suspense, type ReactNode } from "react";
import { Redirect, Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import { PwaUpdatePrompt } from "@/components/PwaUpdatePrompt";
import { AccountProvider, useAccount } from "@/contexts/AccountContext";
import { CosmeticsProvider } from "@/contexts/CosmeticsContext";
import {
  LuminaeWordmark,
  OutOfMatchBackdrop,
  OutOfMatchHeader,
  OutOfMatchSectionHeading,
} from "@/components/out-of-match/OutOfMatchChrome";
import { AlertTriangle, RotateCcw } from "lucide-react";

const Lobby = lazy(() => import("@/pages/lobby"));
const Game = lazy(() => import("@/pages/game"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const ResetPassword = lazy(() => import("@/pages/reset-password"));
const Tutorial = lazy(() => import("@/pages/tutorial"));
const ArchitectRecordContinuity = lazy(() =>
  import("@/components/ArchitectRecordContinuity").then((module) => ({
    default: module.ArchitectRecordContinuity,
  })),
);
// Every development import sits behind a compile-time false branch in release
// builds, so Vite omits both the route and its assets from production output.
const FontPreview = import.meta.env.DEV ? lazy(() => import("@/pages/font-preview")) : null;
const DevCardBacks = import.meta.env.DEV ? lazy(() => import("@/pages/dev-card-backs")) : null;
const DevCardBrowser = import.meta.env.DEV ? lazy(() => import("@/pages/dev-card-browser")) : null;
const DevAnimSandbox = import.meta.env.DEV ? lazy(() => import("@/pages/dev-anim-sandbox")) : null;
const DevAntimatterCinematic = import.meta.env.DEV ? lazy(() => import("@/pages/dev-antimatter-cinematic")) : null;
const DevAntimatterDetonation = import.meta.env.DEV ? lazy(() => import("@/pages/dev-antimatter-detonation")) : null;
const DevBlueprintCard = import.meta.env.DEV ? lazy(() => import("@/pages/dev-blueprint-card")) : null;
const DevBlueprintVault = import.meta.env.DEV ? lazy(() => import("@/pages/dev-blueprint-vault")) : null;
const DevLumiiVaultEncounter = import.meta.env.DEV ? lazy(() => import("@/pages/dev-lumii-vault-encounter")) : null;
const DevBalanceLab = import.meta.env.DEV ? lazy(() => import("@/pages/dev-balance-lab")) : null;
const BalanceLabOverlay = import.meta.env.DEV ? lazy(() =>
  import("@/components/BalanceLabOverlay").then((module) => ({ default: module.BalanceLabOverlay }))
) : null;

function RouteLoading() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[#050611] text-foreground">
      <LuminaeWordmark />
      <span className="h-px w-28 overflow-hidden bg-white/10" aria-hidden="true">
        <span className="block h-full w-1/2 animate-pulse bg-primary/80" />
      </span>
      <span className="sr-only">Loading Luminae</span>
    </div>
  );
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary] caught:', error?.message ?? String(error));
    console.error('[ErrorBoundary] stack:', error?.stack ?? '');
    console.error('[ErrorBoundary] component stack:', info?.componentStack ?? '');
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="oom-shell min-h-[100dvh] flex flex-col">
          <OutOfMatchBackdrop />
          <OutOfMatchHeader left={<LuminaeWordmark />} />
          <main className="oom-frame relative z-10 flex flex-1 items-center justify-center py-8">
            <section className="oom-panel w-full max-w-md p-5 sm:p-7">
              <div className="mb-5 flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-destructive/35 bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <OutOfMatchSectionHeading eyebrow="System Recovery" title="The Signal Was Interrupted" />
              </div>
              <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                Luminae encountered an unexpected error. Return to the main menu and try again.
              </p>
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = import.meta.env.BASE_URL || "/";
                }}
                className="oom-action-primary h-12"
              >
                <RotateCcw className="h-4 w-4" />
                Return to Main Menu
              </button>
            </section>
          </main>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient();

function AuthenticatedArchitectRecordContinuity() {
  const { account, isLoading } = useAccount();
  if (isLoading || !account) return null;

  return (
    <Suspense fallback={null}>
      <ArchitectRecordContinuity />
    </Suspense>
  );
}

function TutorialAwareGameRoute() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("tutorial") === "1") {
    return <Redirect to="/tutorial" replace />;
  }
  const balanceCandidate = params.get("balanceLab");
  const balanceFormat = params.get("balanceFormat") ?? "standard";
  const balancePlayers = Number(params.get("balancePlayers")) || null;
  return <>{BalanceLabOverlay && balanceCandidate ? <BalanceLabOverlay candidateId={balanceCandidate} format={balanceFormat} playerCount={balancePlayers} /> : null}<Game /></>;
}

function Router() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/tutorial" component={Tutorial} />
        <Route path="/dashboard/archive/:section" component={Dashboard} />
        <Route path="/dashboard/archive" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/lobby/:roomId" component={Lobby} />
        <Route path="/game/:roomId" component={TutorialAwareGameRoute} />
        {FontPreview && <Route path="/dev/font-preview" component={FontPreview} />}
        {DevCardBacks && <Route path="/dev/card-backs/:tier" component={DevCardBacks} />}
        {DevCardBrowser && <Route path="/dev/card-browser" component={DevCardBrowser} />}
        {DevAnimSandbox && <Route path="/dev/anim-sandbox" component={DevAnimSandbox} />}
        {DevAntimatterCinematic && (
          <Route path="/dev/antimatter-cinematic" component={DevAntimatterCinematic} />
        )}
        {DevAntimatterDetonation && (
          <Route path="/dev/antimatter-detonation" component={DevAntimatterDetonation} />
        )}
        {DevBlueprintCard && <Route path="/dev/blueprint-card" component={DevBlueprintCard} />}
        {DevBlueprintVault && <Route path="/dev/blueprint-vault" component={DevBlueprintVault} />}
        {DevLumiiVaultEncounter && (
          <Route path="/dev/lumii-vault-encounter" component={DevLumiiVaultEncounter} />
        )}
        {DevBalanceLab && <Route path="/dev/balance-lab" component={DevBalanceLab} />}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  const isDesktopShell =
    typeof navigator !== "undefined" && navigator.userAgent.includes("Electron");

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AccountProvider>
          <CosmeticsProvider>
            <TooltipProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <div className="dark min-h-[100dvh] bg-background text-foreground">
                  <Router />
                  <AuthenticatedArchitectRecordContinuity />
                </div>
              </WouterRouter>
              <Toaster />
              {!isDesktopShell && <PwaUpdatePrompt />}
            </TooltipProvider>
          </CosmeticsProvider>
        </AccountProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
