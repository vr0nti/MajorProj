import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser, getCurrentUser, changePassword } from '../api/axios';
import { handleError, handleSuccess } from '../utils/toast';

export const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Role hierarchy and permissions
export const ROLES = {
  STUDENT: 'student',
  FACULTY: 'faculty', 
  DEPARTMENT_ADMIN: 'departmentAdmin',
  ADMIN: 'admin' // This is the super admin
};

export const ROLE_HIERARCHY = {
  [ROLES.STUDENT]: 1,
  [ROLES.FACULTY]: 2,
  [ROLES.DEPARTMENT_ADMIN]: 3,
  [ROLES.ADMIN]: 4
};

export const hasPermission = (userRole, requiredRole) => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

export const isSuperAdmin = (role) => role === ROLES.ADMIN;
export const isDepartmentAdmin = (role) => role === ROLES.DEPARTMENT_ADMIN;
export const isFaculty = (role) => role === ROLES.FACULTY;
export const isStudent = (role) => role === ROLES.STUDENT;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const userData = await getCurrentUser();
        setUser(userData);
        setNeedsPasswordChange(userData.needsPasswordChange || false);
      }
    } catch (error) {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await loginUser(email, password);
      const { token, user: userData } = response;
      
      localStorage.setItem('token', token);
      setUser(userData);
      setNeedsPasswordChange(userData.needsPasswordChange || false);
      
      handleSuccess('Login successful!');
      return userData;
    } catch (error) {
      handleError(error, 'Login failed');
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await registerUser(userData);
      handleSuccess('User registered successfully!');
      return response;
    } catch (error) {
      handleError(error, 'Registration failed');
      throw error;
    }
  };

  const changeUserPassword = async (currentPassword, newPassword) => {
    try {
      await changePassword(currentPassword, newPassword);
      setNeedsPasswordChange(false);
      handleSuccess('Password changed successfully!');
    } catch (error) {
      handleError(error, 'Password change failed');
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setNeedsPasswordChange(false);
    handleSuccess('Logged out successfully!');
  };

  const value = {
    user,
    loading,
    needsPasswordChange,
    login,
    register,
    logout,
    changePassword: changeUserPassword,
    isAuthenticated: !!user,
    isSuperAdmin: user ? isSuperAdmin(user.role) : false,
    isDepartmentAdmin: user ? isDepartmentAdmin(user.role) : false,
    isFaculty: user ? isFaculty(user.role) : false,
    isStudent: user ? isStudent(user.role) : false,
    hasPermission: user ? (requiredRole) => hasPermission(user.role, requiredRole) : () => false
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 