import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import ContentsPage from "@/pages/ContentsPage";
import ProjectsPage from "@/pages/ProjectsPage";
import CalendarPage from "@/pages/CalendarPage";
import WorkflowPage from "@/pages/WorkflowPage";
import ApprovalsPage from "@/pages/ApprovalsPage";
import MediaLibraryPage from "@/pages/MediaLibraryPage";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";
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
              <Route path="/contents" element={<ContentsPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectsPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/workflow" element={<WorkflowPage />} />
              <Route path="/approvals" element={<ApprovalsPage />} />
              <Route path="/media" element={<MediaLibraryPage />} />
              <Route path="/reports" element={<ReportsPage />} />
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
