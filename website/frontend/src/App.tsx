import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { ClerkProvider, SignIn, SignUp } from '@clerk/clerk-react';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { theme } from './theme/theme';
import { apiClient } from './services/api';
import ResponsiveLayout from './components/layout/ResponsiveLayout';

// Page components (will be created later)
import Dashboard from './pages/Dashboard';
import Requests from './pages/Requests';
import Profile from './pages/Profile';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

// Get Clerk publishable key from environment
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error('Missing Clerk publishable key');
}

// Protected route wrapper
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAuth = true 
}) => {
  const { isLoading, isSignedIn } = useAuthContext();

  if (isLoading) {
    return <div>Loading...</div>; // TODO: Replace with proper loading component
  }

  if (requireAuth && !isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  if (!requireAuth && isSignedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Main app layout wrapper
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSignedIn } = useAuthContext();

  if (!isSignedIn) {
    return <>{children}</>;
  }

  return <ResponsiveLayout>{children}</ResponsiveLayout>;
};

// Auth setup component to initialize API client
const AuthSetup: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getToken } = useAuthContext();

  React.useEffect(() => {
    // Set up API client with auth token provider
    apiClient.setAuthTokenProvider(getToken);
  }, [getToken]);

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <AuthProvider>
            <AuthSetup>
              <Routes>
                {/* Public routes */}
                <Route
                  path="/sign-in/*"
                  element={
                    <ProtectedRoute requireAuth={false}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        minHeight: '100vh',
                        backgroundColor: '#f5f5f5'
                      }}>
                        <SignIn routing="path" path="/sign-in" />
                      </div>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/sign-up/*"
                  element={
                    <ProtectedRoute requireAuth={false}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        minHeight: '100vh',
                        backgroundColor: '#f5f5f5'
                      }}>
                        <SignUp routing="path" path="/sign-up" />
                      </div>
                    </ProtectedRoute>
                  }
                />

                {/* Protected routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Dashboard />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/requests"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Requests />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Profile />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Analytics />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Settings />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                {/* Default routes */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </AuthSetup>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ClerkProvider>
  );
};

export default App; 