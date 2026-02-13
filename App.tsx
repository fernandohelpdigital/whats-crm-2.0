
import React, { useState, useEffect } from 'react';
import { AuthConfig } from './types';
import LoginScreen from './components/LoginScreen';
import ChatDashboard from './components/ChatDashboard';
import { Toaster } from 'react-hot-toast';
// import { disconnectSocket } from './services/socketClient'; // Socket Removed

const App: React.FC = () => {
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('evo_auth_config');
    if (savedConfig) {
      try {
        setAuthConfig(JSON.parse(savedConfig));
      } catch (e) {
        localStorage.removeItem('evo_auth_config');
      }
    }
  }, []);

  const handleLoginSuccess = (config: AuthConfig) => {
    localStorage.setItem('evo_auth_config', JSON.stringify(config));
    setAuthConfig(config);
  };

  const handleLogout = () => {
    localStorage.removeItem('evo_auth_config');
    setAuthConfig(null);
    // disconnectSocket(); // Clean up socket connection (Removed)
  };

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
      
      {authConfig ? (
        <ChatDashboard config={authConfig} onLogout={handleLogout} />
      ) : (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
};

export default App;
