import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TelegramProvider } from "./contexts/TelegramContext";
import ErrorBoundary from "./components/misc/ErrorBoundary";
import Layout from "./components/layout/Layout";
import Market from "./pages/Market";
import Auctions from "./pages/Auctions";
import Activities from "./pages/Activities";
import MyChannels from "./pages/MyChannels";
import Profile from "./pages/Profile";
import TopTraders from "./pages/TopTraders";
import ReferralStatistics from "./pages/ReferralStatistics";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Login from "./pages/Login";
import WalletTest from "./pages/WalletTest";
import AIAssistantPage from "./pages/AIAssistant";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TelegramProvider>
      <LanguageProvider>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="*" element={
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Market />} />
                      <Route path="/auctions" element={<Auctions />} />
                      <Route path="/activities" element={<Activities />} />
                      <Route path="/channels" element={<MyChannels />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/top-traders" element={<TopTraders />} />
                      <Route path="/referral-statistics" element={<ReferralStatistics />} />
                      <Route path="/wallet-test" element={<WalletTest />} />
            <Route path="/ai-assistant" element={<AIAssistantPage />} />
                      <Route path="/terms" element={<Terms />} />
                      <Route path="/privacy" element={<Privacy />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Layout>
                } />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </LanguageProvider>
    </TelegramProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
