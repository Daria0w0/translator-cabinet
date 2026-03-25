import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.is_blocked) {
    return <Navigate to="/blocked" replace />;
  }

  if (requiredRole && user.role !== 'admin' && user.role !== requiredRole) {
    return <Navigate to="/projects" replace />;
  }

  return <>{children}</>;
}