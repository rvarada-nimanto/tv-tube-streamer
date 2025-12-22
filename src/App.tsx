import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import TVLogin from "./pages/TVLogin";
import TVDisplay from "./pages/TVDisplay";
import StoreSetup from "./pages/StoreSetup";
import StoreContent from "./pages/StoreContent";
import SponsorSetup from "./pages/SponsorSetup";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            
            {/* TV Display Routes */}
            <Route path="/tv/login" element={<TVLogin />} />
            <Route path="/tv" element={<TVDisplay />} />
            
            {/* Dashboard Routes */}
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Store Routes */}
            <Route path="/store/setup" element={<StoreSetup />} />
            <Route path="/store/content" element={<StoreContent />} />
            
            {/* Sponsor Routes */}
            <Route path="/sponsor/setup" element={<SponsorSetup />} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
