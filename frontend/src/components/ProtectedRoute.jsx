import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './ui';

/** Role-based route guard. `roles` = roles allowed to see the nested routes. */
export default function ProtectedRoute({ roles, loginPath }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to={loginPath} replace state={{ from: location.pathname }} />;
  if (!roles.includes(user.role)) return <Navigate to={user.role === 'student' ? '/student/dashboard' : '/admin/dashboard'} replace />;
  return <Outlet />;
}
