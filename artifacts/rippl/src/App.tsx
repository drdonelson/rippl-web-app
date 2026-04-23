import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import Layout from "@/components/layout";
import Login from "@/pages/login";
import ProtectedRoute from "@/components/protected-route";
import { OfficeProvider } from "@/contexts/office-context";
import { AuthProvider } from "@/contexts/auth-context";

const Dashboard  = lazy(() => import("@/pages/dashboard"));
const Events     = lazy(() => import("@/pages/events"));
const Patients   = lazy(() => import("@/pages/patients"));
const AdminTasks = lazy(() => import("@/pages/admin-tasks"));
const Campaigns  = lazy(() => import("@/pages/campaigns"));
const Partners   = lazy(() => import("@/pages/partners"));
const Offices    = lazy(() => import("@/pages/offices"));
const Analytics  = lazy(() => import("@/pages/analytics"));
const Claim      = lazy(() => import("@/pages/claim"));
const Refer      = lazy(() => import("@/pages/refer"));
const Demo       = lazy(() => import("@/pages/demo"));
const Onboard    = lazy(() => import("@/pages/onboard"));
const Staff      = lazy(() => import("@/pages/staff"));
const Privacy    = lazy(() => import("@/pages/privacy"));
const Terms      = lazy(() => import("@/pages/terms"));
const HowItWorks = lazy(() => import("@/pages/how-it-works"));
const Practices      = lazy(() => import("@/pages/practices"));
const ResetPassword  = lazy(() => import("@/pages/reset-password"));
const NotFound       = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center h-screen bg-background">
    <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
  </div>
);

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Public routes — no sidebar */}
        <Route path="/" component={Login} />
        <Route path="/demo" component={Demo} />
        <Route path="/claim" component={Claim} />
        <Route path="/refer" component={Refer} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/how-it-works" component={HowItWorks} />
        <Route path="/practices"      component={Practices}     />
        <Route path="/reset-password" component={ResetPassword} />

        {/* Onboarding — no sidebar, auth-protected inside component */}
        <Route path="/onboard" component={Onboard} />

        {/* Protected internal app routes with sidebar */}
        <Route>
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <Switch>
                  <Route path="/dashboard"   component={Dashboard}  />
                  <Route path="/events"      component={Events}     />
                  <Route path="/patients"    component={Patients}   />
                  <Route path="/admin-tasks" component={AdminTasks} />
                  <Route path="/campaigns"  component={Campaigns}  />
                  <Route path="/staff"      component={Staff}      />
                  <Route path="/partners"    component={Partners}   />
                  <Route path="/offices"     component={Offices}    />
                  <Route path="/analytics"   component={Analytics}  />
                  <Route component={NotFound} />
                </Switch>
              </Suspense>
            </Layout>
          </ProtectedRoute>
        </Route>
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <OfficeProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
            <SonnerToaster position="top-right" richColors closeButton />
          </OfficeProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
