import React from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout";
import { useGetCurrentUser, setAuthTokenGetter } from "@workspace/api-client-react";

class PageErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[PageErrorBoundary] Render error:", error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="max-w-2xl mx-auto mt-16 p-6 bg-red-50 border border-red-200 rounded-xl text-red-800">
          <h2 className="text-base font-bold mb-2">Something went wrong loading this page.</h2>
          <p className="text-sm font-mono break-all">{this.state.error.message}</p>
          <button
            className="mt-4 text-sm underline text-red-700"
            onClick={() => { this.setState({ error: null }); window.history.back(); }}
          >
            ← Go back
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

setAuthTokenGetter(() => localStorage.getItem("raos_token"));

// Pages
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import CasesList from "@/pages/cases/index";
import NewCase from "@/pages/cases/new";
import CaseDetail from "@/pages/cases/[id]/index";
import ScoringView from "@/pages/cases/[id]/scoring";
import ReportEditor from "@/pages/cases/[id]/report";
import GuidedSelfReport from "@/pages/cases/[id]/self-report";
import CdpProfilePage from "@/pages/cases/[id]/cdp";
import ResponseViewer from "@/pages/cases/[id]/response/[assignmentId]";
import ExternalFormView from "@/pages/external/[token]";
import Portal from "@/pages/portal";
import AssessmentTools from "@/pages/tools";
import FormPreviewPage from "@/pages/tools/[id]/preview";
import TeamPage from "@/pages/team";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

// Protected Route Wrapper
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [, navigate] = useLocation();
  const { data: user, isLoading } = useGetCurrentUser({
    query: {
      retry: false,
      staleTime: 5 * 60 * 1000,
    }
  });

  React.useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
    // navigate is stable in wouter; intentionally excluded from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  if (!user) {
    return null;
  }

  return (
    <AppLayout>
      <PageErrorBoundary>
        <Component />
      </PageErrorBoundary>
    </AppLayout>
  );
}


function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/portal" component={Portal} />
      <Route path="/external/:token" component={ExternalFormView} />
      
      <Route path="/">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/cases">
        {() => <ProtectedRoute component={CasesList} />}
      </Route>
      <Route path="/cases/new">
        {() => <ProtectedRoute component={NewCase} />}
      </Route>
      <Route path="/cases/:id/cdp">
        {() => <ProtectedRoute component={CdpProfilePage} />}
      </Route>
      <Route path="/cases/:id/scoring">
        {() => <ProtectedRoute component={ScoringView} />}
      </Route>
      <Route path="/cases/:id">
        {() => <ProtectedRoute component={CaseDetail} />}
      </Route>
      <Route path="/cases/:id/report">
        {() => <ProtectedRoute component={ReportEditor} />}
      </Route>
      <Route path="/cases/:id/self-report">
        {() => <ProtectedRoute component={GuidedSelfReport} />}
      </Route>
      <Route path="/cases/:id/response/:assignmentId">
        {() => <ProtectedRoute component={ResponseViewer} />}
      </Route>
      <Route path="/tools">
        {() => <ProtectedRoute component={AssessmentTools} />}
      </Route>
      <Route path="/tools/:id/preview" component={FormPreviewPage} />
      <Route path="/team">
        {() => <ProtectedRoute component={TeamPage} />}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
