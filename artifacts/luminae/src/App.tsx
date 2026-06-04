import { Component, lazy, Suspense, type ReactNode } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Lobby from "@/pages/lobby";
import Game from "@/pages/game";
import Dashboard from "@/pages/dashboard";
import FontPreview from "@/pages/font-preview";
import ResetPassword from "@/pages/reset-password";
import Tutorial from "@/pages/tutorial";
import { PwaUpdatePrompt } from "@/components/PwaUpdatePrompt";
import { AccountProvider } from "@/contexts/AccountContext";

const DevCardBacks = lazy(() => import("@/pages/dev-card-backs"));
const DevCardBrowser = lazy(() => import("@/pages/dev-card-browser"));
const DevAnimSandbox = lazy(() => import("@/pages/dev-anim-sandbox"));

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

  render() {
    if (this.state.hasError) {
      return (
        <div className="dark min-h-[100dvh] bg-background text-foreground flex flex-col items-center justify-center p-6 text-center gap-4">
          <h1 className="text-2xl font-bold text-destructive">Something went wrong</h1>
          <p className="text-muted-foreground text-sm max-w-sm">
            An unexpected error occurred. Please return home and try again.
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = import.meta.env.BASE_URL || "/";
            }}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
          >
            Return Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/tutorial" component={Tutorial} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/lobby/:roomId" component={Lobby} />
      <Route path="/game/:roomId" component={Game} />
      {import.meta.env.DEV && <Route path="/dev/font-preview" component={FontPreview} />}
      {import.meta.env.DEV && (
        <Route path="/dev/card-backs/:tier">
          <Suspense fallback={null}>
            <DevCardBacks />
          </Suspense>
        </Route>
      )}
      {import.meta.env.DEV && (
        <Route path="/dev/card-browser">
          <Suspense fallback={null}>
            <DevCardBrowser />
          </Suspense>
        </Route>
      )}
      {import.meta.env.DEV && (
        <Route path="/dev/anim-sandbox">
          <Suspense fallback={null}>
            <DevAnimSandbox />
          </Suspense>
        </Route>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AccountProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <div className="dark min-h-[100dvh] bg-background text-foreground">
                <Router />
              </div>
            </WouterRouter>
            <Toaster />
            <PwaUpdatePrompt />
          </TooltipProvider>
        </AccountProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
