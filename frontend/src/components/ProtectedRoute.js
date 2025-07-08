import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) return null; // or a spinner
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" />;
  return children;
} 