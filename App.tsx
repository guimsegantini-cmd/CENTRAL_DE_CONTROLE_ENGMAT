import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Quotes } from './pages/Quotes';
import { Orders } from './pages/Orders';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { Billing } from './pages/Billing';
import { AIChat } from './pages/AIChat';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
};

const AppRoutes = () => {
    const { isAuthenticated } = useAuth();
    return (
        <Routes>
            <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
            
            <Route path="/" element={
                <ProtectedRoute>
                    <Dashboard />
                </ProtectedRoute>
            } />
            <Route path="/quotes" element={
                <ProtectedRoute>
                    <Quotes />
                </ProtectedRoute>
            } />
            <Route path="/orders" element={
                <ProtectedRoute>
                    <Orders />
                </ProtectedRoute>
            } />
            <Route path="/billing" element={
                <ProtectedRoute>
                    <Billing />
                </ProtectedRoute>
            } />
            <Route path="/ai" element={
                <ProtectedRoute>
                    <AIChat />
                </ProtectedRoute>
            } />
            <Route path="/settings" element={
                <ProtectedRoute>
                    <Settings />
                </ProtectedRoute>
            } />
            
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <AppRoutes />
        </Router>
      </DataProvider>
    </AuthProvider>
  );
};

export default App;
