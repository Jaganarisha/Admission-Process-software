import { Navigate, Route, Routes } from 'react-router-dom';
import { PortalLayout, PublicLayout } from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/public/Home';
import AboutProcess from './pages/public/AboutProcess';
import Courses from './pages/public/Courses';
import Contact from './pages/public/Contact';
import Register from './pages/public/Register';
import { StudentLogin, AdminLogin } from './pages/public/Login';
import { StudentForgotPassword, StaffForgotPassword } from './pages/public/ForgotPassword';
import StudentDashboard from './pages/student/StudentDashboard';
import ApplicationForm from './pages/student/ApplicationForm';
import ApplicationStatus from './pages/student/ApplicationStatus';
import FeePayment from './pages/student/FeePayment';
import Confirmation from './pages/student/Confirmation';
import { Profile, Notifications } from './pages/student/Profile';
import AdminDashboard from './pages/admin/AdminDashboard';
import Applications from './pages/admin/Applications';
import ApplicationDetail from './pages/admin/ApplicationDetail';
import CoursesFees from './pages/admin/CoursesFees';
import Users from './pages/admin/Users';
import Reports from './pages/admin/Reports';
import { useAuth } from './context/AuthContext';

const AdminOnly = ({ children }) => {
  const { user } = useAuth();
  return user.role === 'admin' ? children : <Navigate to="/admin/dashboard" replace />;
};

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about-admission" element={<AboutProcess />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<StudentLogin />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/forgot-password" element={<StudentForgotPassword />} />
        <Route path="/admin/forgot-password" element={<StaffForgotPassword />} />
      </Route>


      <Route element={<ProtectedRoute roles={['student']} loginPath="/login" />}>
        <Route path="/student" element={<PortalLayout role="student" />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="apply" element={<Navigate to="personal" replace />} />
          <Route path="apply/:step" element={<ApplicationForm />} />
          <Route path="status" element={<ApplicationStatus />} />
          <Route path="payment" element={<FeePayment />} />
          <Route path="confirmation" element={<Confirmation />} />
          <Route path="profile" element={<Profile />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['admin', 'officer']} loginPath="/admin/login" />}>
        <Route path="/admin" element={<PortalLayout role="staff" />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="applications" element={<Applications />} />
          <Route path="applications/:id" element={<ApplicationDetail />} />
          <Route path="courses" element={<CoursesFees />} />
          <Route path="reports" element={<Reports />} />
          <Route path="users" element={<AdminOnly><Users /></AdminOnly>} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
