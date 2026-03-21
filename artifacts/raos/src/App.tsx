import React from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout";
import { useGetCurrentUser, setAuthTokenGetter } from "@workspace/api-client-react";

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
import ExternalFormView from "@/pages/external/[token]";
import AssessmentTools from "@/pages/tools";
import FormPreviewPage from "@/pages/tools/[id]/preview";
import TeamPage from "@/pages/team";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

// Protected Route Wrapper
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [, navigate] = useLocation();
  const { data: user, isLoading, isError } = useGetCurrentUser({
    query: { retry: false }
  });

  React.useEffect(() => {
    if (!isLoading && (isError || !user)) {
      navigate("/login");
    }
    // navigate is stable in wouter; intentionally excluded from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isError, user]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  if (isError || !user) {
    return null;
  }

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
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
      <Route path="/cases/:id">
        {() => <ProtectedRoute component={CaseDetail} />}
      </Route>
      <Route path="/cases/:id/scoring">
        {() => <ProtectedRoute component={ScoringView} />}
      </Route>
      <Route path="/cases/:id/report">
        {() => <ProtectedRoute component={ReportEditor} />}
      </Route>
      <Route path="/cases/:id/self-report">
        {() => <ProtectedRoute component={GuidedSelfReport} />}
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
