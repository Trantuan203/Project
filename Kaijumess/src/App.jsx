import React from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';

import { AppearanceProvider } from './context/AppearanceContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationCenterProvider } from './context/NotificationCenterContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import ChatPage from './pages/ChatPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import './styles/global.css';
import './styles/antd-override.css';

const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/chat" replace />;
  }

  return children;
};

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const AppRoutes = () => {
  const { isAuthenticated, isAuthReady } = useAuth();
  const { resolvedTheme } = useTheme();

  const content = !isAuthReady ? (
    <div className="flex min-h-screen items-center justify-center bg-surface px-6 text-center text-sm font-semibold text-on-surface-variant">
      Dang dong bo phien dang nhap...
    </div>
  ) : (
    <Router>
      <Routes>
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? '/chat' : '/login'} replace />}
        />
        <Route
          path="/login"
          element={(
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          )}
        />
        <Route
          path="/register"
          element={(
            <PublicOnlyRoute>
              <RegisterPage />
            </PublicOnlyRoute>
          )}
        />
        <Route
          path="/chat"
          element={(
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          )}
        />
      </Routes>
    </Router>
  );

  return (
    <ConfigProvider
      theme={{
        algorithm:
          resolvedTheme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          borderRadius: 16,
          colorBgBase: resolvedTheme === 'dark' ? '#0c1220' : '#f8f9fa',
          colorPrimary: resolvedTheme === 'dark' ? '#8fb8ff' : '#0058bc',
          colorTextBase: resolvedTheme === 'dark' ? '#ebf2f9' : '#191c1d',
          fontFamily: 'Inter, "Segoe UI", sans-serif',
        },
      }}
    >
      {content}
    </ConfigProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppearanceProvider>
          <LanguageProvider>
            <NotificationCenterProvider>
              <AppRoutes />
            </NotificationCenterProvider>
          </LanguageProvider>
        </AppearanceProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;

