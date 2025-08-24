import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { getCurrentUser } from '../store/slices/authSlice';
import LoadingSpinner from './ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireVerification?: boolean;
}

const ProtectedRoute: React.FC = ({
  children,
  requireAuth = true,
  requireVerification = false,
}) => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { isAuthenticated, user, loading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && !user) {
      dispatch(getCurrentUser());
    }
  }, [dispatch, isAuthenticated, user]);

  if (loading) {
    return ;
  }

  if (requireAuth && !isAuthenticated) {
    return ;
  }

  if (requireVerification && user && !user.is_verified) {
    return ;
  }

  return <>{children}</>;
};

export default ProtectedRoute;