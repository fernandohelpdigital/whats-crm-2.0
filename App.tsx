
import React from 'react';
import { AuthConfig } from './types';
import { useAuth } from './src/hooks/useAuth';
import AuthScreen from './components/AuthScreen';
import ChatDashboard from './components/ChatDashboard';
import { Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Build AuthConfig from profile for Evolution API compatibility
  const authConfig: AuthConfig | null = user && profile?.instance_name ? {
    instanceName: profile.instance_name,
    apiKey: profile.api_key || '',
    baseUrl: profile.base_url || 'https://api.automacaohelp.com.br',
  } : null;

  return (
    <div className="h-screen w-full bg-background text-foreground transition-colors duration-300">
      <Toaster position="top-right" toastOptions={{
        className: 'bg-card text-card-foreground border border-border shadow-lg',
        style: {
          background: 'hsl(var(--card))',
          color: 'hsl(var(--foreground))',
          borderColor: 'hsl(var(--border))',
        },
      }} />
      
      {user ? (
        <ChatDashboard config={authConfig} onLogout={() => {}} />
      ) : (
        <AuthScreen />
      )}
    </div>
  );
};

export default App;
