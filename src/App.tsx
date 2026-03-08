import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import ContentsPage from "@/pages/ContentsPage";
import ClientDashboardPage from "@/pages/ClientDashboardPage";
import ProjectsPage from "@/pages/ProjectsPage";
import CalendarPage from "@/pages/CalendarPage";
import WorkflowPage from "@/pages/WorkflowPage";
import ApprovalsPage from "@/pages/ApprovalsPage";
import MediaLibraryPage from "@/pages/MediaLibraryPage";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";
import ClientMembersPage from "@/pages/ClientMembersPage";
import UsersPage from "@/pages/UsersPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route element={
              <ProtectedRoute>
                <AppProvider>
                  <AppLayout />
                </AppProvider>
              </ProtectedRoute>
            }>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clients" element={<ProjectsPage />} />
              {/* Client-scoped routes */}
              <Route path="/clients/:id/contents" element={<ContentsPage />} />
              <Route path="/clients/:id/dashboard" element={<ClientDashboardPage />} />
              <Route path="/clients/:id/calendar" element={<CalendarPage />} />
              <Route path="/clients/:id/workflow" element={<WorkflowPage />} />
              <Route path="/clients/:id/approvals" element={<ApprovalsPage />} />
              <Route path="/clients/:id/media" element={<MediaLibraryPage />} />
              <Route path="/clients/:id/reports" element={<ReportsPage />} />
              <Route path="/clients/:id/members" element={<ClientMembersPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
