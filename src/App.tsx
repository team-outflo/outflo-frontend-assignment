import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useIsFetching } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigationType, useLocation, Navigate } from "react-router-dom";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignUpPage";
import CampaignEditorPage from "./pages/CampaignEditorPage";
import CampaignsList from "./pages/CampaignsList";
import CampaignAnalytics from "./pages/CampaignAnalytics";
import { Root } from "./root";
import { FullPageLoaderStyles } from "./components/FullPageLoader";


const queryClient = new QueryClient();

const App = () => {
  

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />

        <BrowserRouter>
          <FullPageLoaderStyles />
          {/* <GlobalRouteLoader /> */}
          <Routes>
          {/* Auth routes - no layout, public access */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Root redirect to campaigns */}
          <Route path="/" element={<Navigate to="/allcampaigns" replace />} />

          {/* Protected routes - wrapped with Root component for auth check */}
          <Route element={<Root />}>            
            {/* Campaign routes */}
            <Route path="/campaign/view/:id" element={<CampaignEditorPage />} />
            <Route path="/campaign/edit/:id" element={<CampaignEditorPage />} />
            <Route path="/campaign/analytics/:id" element={<CampaignAnalytics />} />
            <Route path="/allcampaigns" element={<CampaignsList />} />

            {/* Other protected routes */}
            {/* <Route path="/calendar" element={<ComingSoon />} />
            <Route path="/analytics" element={<ComingSoon />} />
            <Route path="/settings" element={<ComingSoon />} />
            <Route path="/coming-soon/:feature" element={<ComingSoon />} /> */}
          </Route>

          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

// Global route + query loading indicator
const GlobalRouteLoader = () => {
  const isFetching = useIsFetching();
  const navType = useNavigationType();
  const location = useLocation();

  // Show a small top-bar loader if any query is fetching or navigation type indicates a push/replace
  const show = isFetching > 0;

  if (!show) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}>
      <div style={{ height: 3 }} className="w-full bg-primary/10">
        <div className="h-[3px] bg-primary animate-[indeterminate_1.2s_ease_infinite]" style={{ width: '40%' }} />
      </div>
      <style>{`
        @keyframes indeterminate {
          0% { margin-left: -40%; }
          50% { margin-left: 60%; }
          100% { margin-left: 100%; }
        }
      `}</style>
    </div>
  );
};
