import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Layout from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Events from "@/pages/events";
import Patients from "@/pages/patients";
import Claim from "@/pages/claim";
import Login from "@/pages/login";
import Demo from "@/pages/demo";
import Onboard from "@/pages/onboard";
import ProtectedRoute from "@/components/protected-route";
import { OfficeProvider } from "@/contexts/office-context";
import { AuthProvider } from "@/contexts/auth-context";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  }
});

function Router() {
  return (
    <Switch>
      {/* Public routes — no sidebar */}
      <Route path="/" component={Login} />
      <Route path="/demo" component={Demo} />
      <Route path="/claim" component={Claim} />

      {/* Onboarding — no sidebar, auth-protected inside component */}
      <Route path="/onboard" component={Onboard} />

      {/* Protected internal app routes with sidebar */}
      <Route>
        <ProtectedRoute>
          <Layout>
            <Switch>
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/events" component={Events} />
              <Route path="/patients" component={Patients} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </ProtectedRoute>
      </Route>
    </Switch>
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
          </OfficeProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
