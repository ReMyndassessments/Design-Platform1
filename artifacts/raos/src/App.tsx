import React, { Suspense } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout";
import { useGetCurrentUser, setAuthTokenGetter } from "@workspace/api-client-react";
import { LangProvider } from "@/lib/i18n";
import { WatchAlongProvider } from "@/hooks/use-watch-along";
import { WatchAlongBanner } from "@/components/watch-along-banner";

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

const Login = React.lazy(() => import("@/pages/login"));
const Dashboard = React.lazy(() => import("@/pages/dashboard"));
const CasesList = React.lazy(() => import("@/pages/cases/index"));
const NewCase = React.lazy(() => import("@/pages/cases/new"));
const CaseDetail = React.lazy(() => import("@/pages/cases/[id]/index"));
const ScoringView = React.lazy(() => import("@/pages/cases/[id]/scoring"));
const ReportEditor = React.lazy(() => import("@/pages/cases/[id]/report"));
const GuidedSelfReport = React.lazy(() => import("@/pages/cases/[id]/self-report"));
const CdpProfilePage = React.lazy(() => import("@/pages/cases/[id]/cdp"));
const ResponseViewer = React.lazy(() => import("@/pages/cases/[id]/response/[assignmentId]"));
const ExternalFormView = React.lazy(() => import("@/pages/external/[token]"));
const JoinMeetingPage = React.lazy(() => import("@/pages/join/[room]"));
const QuickMeetPage = React.lazy(() => import("@/pages/meet/[room]"));
const Portal = React.lazy(() => import("@/pages/portal"));
const MyPortalLogin = React.lazy(() => import("@/pages/my-portal"));
const LandingPage = React.lazy(() => import("@/pages/landing"));
const AssessmentTools = React.lazy(() => import("@/pages/tools"));
const FormPreviewPage = React.lazy(() => import("@/pages/tools/[id]/preview"));
const TeamPage = React.lazy(() => import("@/pages/team"));
const InquiriesPage = React.lazy(() => import("@/pages/inquiries"));
const PartnerSchoolsPage = React.lazy(() => import("@/pages/partner-schools"));
const PartnerInquiryPage = React.lazy(() => import("@/pages/partner-inquiry"));
const AssessmentServicesPage = React.lazy(() => import("@/pages/assessment-services"));
const AssessmentPreparationPage = React.lazy(() => import("@/pages/assessment-preparation"));
const NotFound = React.lazy(() => import("@/pages/not-found"));
const RppiAdminPage = React.lazy(() => import("@/pages/cases/[id]/rppi"));
const RdaAdminPage = React.lazy(() => import("@/pages/cases/[id]/rda"));
const RrfaAdminPage = React.lazy(() => import("@/pages/cases/[id]/rrfa"));
const RrcaAdminPage = React.lazy(() => import("@/pages/cases/[id]/rrca"));
const RmraAdminPage = React.lazy(() => import("@/pages/cases/[id]/rmra"));
const RamriInterviewPage = React.lazy(() => import("@/pages/cases/[id]/ramri-interview"));
const RaepaPage = React.lazy(() => import("@/pages/cases/[id]/raepa"));
const RamriUploadPage = React.lazy(() => import("@/pages/ramri-upload/[token]"));
const LiteracyDashboardPage = React.lazy(() => import("@/pages/cases/[id]/literacy-dashboard"));
const RemyndDashboardPage = React.lazy(() => import("@/pages/cases/[id]/remynd-dashboard"));
const DashboardsHub = React.lazy(() => import("@/pages/cases/[id]/dashboards"));
const ProductDashboard = React.lazy(() => import("@/pages/cases/[id]/product-dashboard"));
const RdaStudentView = React.lazy(() => import("@/pages/student-view/rda"));
const RrcaStudentView = React.lazy(() => import("@/pages/student-view/rrca"));
const RrfaStudentView = React.lazy(() => import("@/pages/student-view/rrfa"));
const RmraStudentView = React.lazy(() => import("@/pages/student-view/rmra"));
const RaepaStudentView = React.lazy(() => import("@/pages/student-view/raepa"));
const RaepaTeacherUpload = React.lazy(() => import("@/pages/raepa-teacher"));
const RmraLandingPage = React.lazy(() => import("@/pages/rmra-landing"));
const RmraStandaloneSessionPage = React.lazy(() => import("@/pages/rmra-session"));
const ApprenticeDashboard = React.lazy(() => import("@/pages/apprentice/dashboard"));
const ApprenticeResourcesPage = React.lazy(() => import("@/pages/apprentice/resources"));
const ApprenticeResourceDetailPage = React.lazy(() => import("@/pages/apprentice/resource-detail"));
const ApprenticeToolsLibraryPage = React.lazy(() => import("@/pages/apprentice/tools-library"));
const ApprenticeCompetenciesPage = React.lazy(() => import("@/pages/apprentice/competencies"));

const queryClient = new QueryClient();

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-950">
    <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
  </div>
);

function ProtectedRoute({ component: Component, apprenticeOnly = false, allowApprentice = false }: { component: React.ComponentType; apprenticeOnly?: boolean; allowApprentice?: boolean }) {
  const [, navigate] = useLocation();
  const { data: user, isLoading } = useGetCurrentUser({
    query: {
      retry: false,
      staleTime: 5 * 60 * 1000,
    }
  });

  const isApprentice = user?.role === "clinical_apprentice";
  // Some routes (real case detail + sub-pages) are shared: apprentices see the
  // exact same page as staff, read-only, so they should neither be redirected
  // away nor treated as "apprentice-only".
  const isShared = allowApprentice;

  React.useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
      return;
    }
    if (!isLoading && user) {
      if (isShared) return;
      if (isApprentice && !apprenticeOnly) {
        navigate("/apprentice/dashboard");
      } else if (!isApprentice && apprenticeOnly) {
        navigate("/dashboard");
      }
    }
    // navigate is stable in wouter; intentionally excluded from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user, isApprentice, apprenticeOnly, isShared]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  if (!user) {
    return null;
  }

  if (!isShared && ((isApprentice && !apprenticeOnly) || (!isApprentice && apprenticeOnly))) {
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
    <Suspense fallback={<PageFallback />}>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/portal" component={Portal} />
        <Route path="/assessment-preparation" component={AssessmentPreparationPage} />
        <Route path="/my-portal" component={MyPortalLogin} />
        <Route path="/external/:token" component={ExternalFormView} />
        <Route path="/ramri-upload/:token" component={RamriUploadPage} />
        <Route path="/student-view/rda" component={RdaStudentView} />
        <Route path="/student-view/rrca/:token" component={RrcaStudentView} />
        <Route path="/student-view/rrfa/:token" component={RrfaStudentView} />
        <Route path="/student-view/rmra/:token" component={RmraStudentView} />
        <Route path="/rmra/student/:token" component={RmraStudentView} />
        <Route path="/student-view/raepa/:caseId" component={RaepaStudentView} />
        <Route path="/raepa-teacher/:token" component={RaepaTeacherUpload} />
        <Route path="/rmra" component={RmraLandingPage} />
        <Route path="/rmra/session/:sessionId" component={RmraStandaloneSessionPage} />
        <Route path="/join/:room" component={JoinMeetingPage} />
        <Route path="/meet/:room" component={QuickMeetPage} />
        <Route path="/" component={LandingPage} />
        <Route path="/dashboard">
          {() => <ProtectedRoute component={Dashboard} />}
        </Route>
        <Route path="/cases">
          {() => <ProtectedRoute component={CasesList} allowApprentice />}
        </Route>
        <Route path="/cases/new">
          {() => <ProtectedRoute component={NewCase} />}
        </Route>
        <Route path="/cases/:id/cdp">
          {() => <ProtectedRoute component={CdpProfilePage} allowApprentice />}
        </Route>
        <Route path="/cases/:id/scoring">
          {() => <ProtectedRoute component={ScoringView} allowApprentice />}
        </Route>
        <Route path="/cases/:id">
          {() => <ProtectedRoute component={CaseDetail} allowApprentice />}
        </Route>
        <Route path="/cases/:id/report">
          {() => <ProtectedRoute component={ReportEditor} allowApprentice />}
        </Route>
        <Route path="/cases/:id/self-report">
          {() => <ProtectedRoute component={GuidedSelfReport} />}
        </Route>
        <Route path="/cases/:id/response/:assignmentId">
          {() => <ProtectedRoute component={ResponseViewer} allowApprentice />}
        </Route>
        <Route path="/cases/:id/rppi/:assignmentId">
          {() => <ProtectedRoute component={RppiAdminPage} allowApprentice />}
        </Route>
        <Route path="/cases/:id/rda/:assignmentId">
          {() => <ProtectedRoute component={RdaAdminPage} allowApprentice />}
        </Route>
        <Route path="/cases/:id/rrfa/:assignmentId">
          {() => <ProtectedRoute component={RrfaAdminPage} allowApprentice />}
        </Route>
        <Route path="/cases/:id/rrca/:assignmentId">
          {() => <ProtectedRoute component={RrcaAdminPage} allowApprentice />}
        </Route>
        <Route path="/cases/:id/rmra/:assignmentId">
          {() => <ProtectedRoute component={RmraAdminPage} allowApprentice />}
        </Route>
        <Route path="/cases/:id/ramri/:assignmentId">
          {() => <ProtectedRoute component={RamriInterviewPage} allowApprentice />}
        </Route>
        <Route path="/cases/:id/raepa/:assignmentId">
          {() => <ProtectedRoute component={RaepaPage} allowApprentice />}
        </Route>
        <Route path="/cases/:id/dashboards">
          {() => <ProtectedRoute component={DashboardsHub} allowApprentice />}
        </Route>
        <Route path="/cases/:id/product-dashboard">
          {() => <ProtectedRoute component={ProductDashboard} allowApprentice />}
        </Route>
        <Route path="/cases/:id/literacy-dashboard">
          {() => <ProtectedRoute component={LiteracyDashboardPage} allowApprentice />}
        </Route>
        <Route path="/cases/:id/remynd-dashboard">
          {() => <ProtectedRoute component={RemyndDashboardPage} allowApprentice />}
        </Route>
        <Route path="/tools">
          {() => <ProtectedRoute component={AssessmentTools} />}
        </Route>
        <Route path="/tools/:id/preview" component={FormPreviewPage} />
        <Route path="/team">
          {() => <ProtectedRoute component={TeamPage} />}
        </Route>
        <Route path="/inquiries">
          {() => <ProtectedRoute component={InquiriesPage} />}
        </Route>
        <Route path="/partner-schools" component={PartnerSchoolsPage} />
        <Route path="/partner-inquiry" component={PartnerInquiryPage} />
        <Route path="/assessment-services" component={AssessmentServicesPage} />
        <Route path="/apprentice/dashboard">
          {() => <ProtectedRoute component={ApprenticeDashboard} apprenticeOnly />}
        </Route>
        <Route path="/apprentice/cases/:id">
          {({ id }: { id: string }) => {
            const [, navigate] = useLocation();
            React.useEffect(() => { navigate(`/cases/${id}`, { replace: true }); }, [id]);
            return null;
          }}
        </Route>
        <Route path="/apprentice/resources">
          {() => <ProtectedRoute component={ApprenticeResourcesPage} apprenticeOnly />}
        </Route>
        <Route path="/apprentice/resources/:slug">
          {() => <ProtectedRoute component={ApprenticeResourceDetailPage} apprenticeOnly />}
        </Route>
        <Route path="/apprentice/tools">
          {() => <ProtectedRoute component={ApprenticeToolsLibraryPage} apprenticeOnly />}
        </Route>
        <Route path="/apprentice/competencies">
          {() => <ProtectedRoute component={ApprenticeCompetenciesPage} apprenticeOnly />}
        </Route>

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <LangProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <WatchAlongProvider>
              <Router />
              <WatchAlongBanner />
            </WatchAlongProvider>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </LangProvider>
  );
}

export default App;
