import React, { JSX } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';

import Home from "./pages/Home";
import Projects from "./pages/Projects";
import User from "./pages/User";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import TranslatorEditor from "./pages/TranslatorEditor";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUserProjects from "./pages/AdminUserProjects";
import Header from "./components/Header";

const ProtectedRoute: React.FC<{ children: React.ReactNode; requireAdmin?: boolean }> = ({ 
  children, 
  requireAdmin = false 
}) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <>
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          
          <Route 
            path="/user" 
            element={
              <ProtectedRoute>
                <User />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/user/projects" 
            element={
              <ProtectedRoute>
                <Projects />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/projects/:projectId/translate" 
            element={
              <ProtectedRoute>
                <TranslatorEditor />
              </ProtectedRoute>
            }  
          />
          
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/users/:userId/projects" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminUserProjects />
              </ProtectedRoute>
            } 
          />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <ConfigProvider locale={ruRU}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ConfigProvider>
  );
}