import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Clock } from 'lucide-react';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading, profile, role } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Admins are always approved; others need explicit approval
  if (profile && !profile.approved && role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Aguardando aprovação</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta foi criada com sucesso, mas precisa ser aprovada por um administrador antes de acessar a plataforma.
          </p>
          <button
            onClick={async () => {
              const { supabase } = await import('@/integrations/supabase/client');
              await supabase.auth.signOut();
            }}
            className="text-sm text-primary hover:underline font-medium"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
