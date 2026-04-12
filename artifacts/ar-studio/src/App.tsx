import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import { QueryClientProvider, useQueryClient, QueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";

import Home from "./pages/home";
import Dashboard from "./pages/dashboard";
import Explore from "./pages/explore";
import Editor from "./pages/editor";
import Studio from "./pages/studio";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient();
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}
if (!clerkPubKey) throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");

function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      {/* To update login providers, app branding, or OAuth settings use the Auth pane in the workspace toolbar. More information can be found in the Replit docs. */}
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      {/* To update login providers, app branding, or OAuth settings use the Auth pane in the workspace toolbar. More information can be found in the Replit docs. */}
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    return addListener(({ user }) => {
      const id = user?.id ?? null;
      if (prevRef.current !== undefined && prevRef.current !== id) qc.clear();
      prevRef.current = id;
    });
  }, [addListener, qc]);
  return null;
}

function HomeRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/dashboard", { replace: true }); }, [setLocation]);
  return null;
}

function HomeRoute() {
  return (
    <>
      <Show when="signed-in">
        <HomeRedirect />
      </Show>
      <Show when="signed-out">
        <Home />
      </Show>
    </>
  );
}

function SignInRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/sign-in", { replace: true }); }, [setLocation]);
  return null;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <Component />
      </Show>
      <Show when="signed-out">
        <SignInRedirect />
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
      appearance={{
        variables: {
          colorPrimary: "hsl(44 54% 54%)",
          colorBackground: "hsl(0 0% 8%)",
          colorText: "hsl(0 0% 96%)",
          colorInputBackground: "hsl(0 0% 13%)",
          colorInputText: "hsl(0 0% 96%)",
        }
      }}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/" component={HomeRoute} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/dashboard">
            {() => <ProtectedRoute component={Dashboard} />}
          </Route>
          <Route path="/explore">
            {() => <ProtectedRoute component={Explore} />}
          </Route>
          <Route path="/editor/:id">
            {() => <ProtectedRoute component={Editor} />}
          </Route>
          <Route path="/studio/:id" component={Studio} />
          <Route component={NotFound} />
        </Switch>
        <Toaster />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
