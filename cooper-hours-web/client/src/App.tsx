import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

const appBasePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const appHomePath = appBasePath ? `${appBasePath}/` : "/";
const appNotFoundPath = appBasePath ? `${appBasePath}/404` : "/404";

function Router() {
  return (
    <Switch>
      {appBasePath ? <Route path={appHomePath} component={Home} /> : null}
      {appBasePath ? <Route path={appBasePath} component={Home} /> : null}
      <Route path={"/"} component={Home} />
      {appBasePath ? <Route path={appNotFoundPath} component={NotFound} /> : null}
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
