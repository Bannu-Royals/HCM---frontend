import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';
import React from 'react';
import MemberManagement from './pages/admin/MemberManagement';

// Lazy load components
const Login = lazy(() => import('./pages/Login'));
const StudentRegister = lazy(() => import('./pages/StudentRegister'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const StudentDashboard = lazy(() => import('./pages/student/Dashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Home = lazy(() => import('./pages/Home'));

// Admin components
const Students = lazy(() => import('./pages/admin/Students'));
const Complaints = lazy(() => import('./pages/admin/Complaints'));
const Announcements = lazy(() => import('./pages/admin/Announcements'));
const Notifications = lazy(() => import('./pages/admin/Notifications'));
const DashboardHome = lazy(() => import('./pages/admin/DashboardHome'));
const PollManagement = lazy(() => import('./pages/admin/PollManagement'));

// Student components
const RaiseComplaint = lazy(() => import('./pages/student/RaiseComplaint'));
const MyComplaints = lazy(() => import('./pages/student/MyComplaints'));
const StudentAnnouncements = lazy(() => import('./pages/student/Announcements'));
const StudentNotifications = lazy(() => import('./pages/student/Notifications'));
const ResetPassword = lazy(() => import('./pages/student/ResetPassword'));
const Polls = lazy(() => import('./pages/student/Polls'));

// Loading component
const Loading = () => (
  <div className="flex items-center justify-center min-h-screen">
    <LoadingSpinner size="lg" />
  </div>
);

// Error boundary component
const ErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    const handleError = (error) => {
      console.error('Error caught by boundary:', error);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h2>
          <button 
            className="btn-primary"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return children;
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Suspense fallback={<Loading />}>
          <Routes>
            {/* Home page */}
            <Route path="/" element={<Home />} />
            
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<StudentRegister />} />
            
            {/* Protected admin routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAuth={true} role="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardHome />} />
              <Route path="students" element={<Students />} />
              <Route path="complaints" element={<Complaints />} />
              <Route path="announcements" element={<Announcements />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="members" element={<MemberManagement />} />
              <Route path="polls" element={<PollManagement />} />
            </Route>
            
            {/* Student reset password route */}
            <Route
              path="/student/reset-password"
              element={
                <ProtectedRoute requireAuth={true} requirePasswordChange={true}>
                  <ResetPassword />
                </ProtectedRoute>
              }
            />
            
            {/* Protected student routes */}
            <Route
              path="/student"
              element={
                <ProtectedRoute requireAuth={true} requirePasswordChange={false}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            >
              <Route index element={<div>Welcome, Student! Select a feature from the sidebar.</div>} />
              <Route path="raise" element={<RaiseComplaint />} />
              <Route path="my-complaints" element={<MyComplaints />} />
              <Route path="announcements" element={<StudentAnnouncements />} />
              <Route path="notifications" element={<StudentNotifications />} />
              <Route path="polls" element={<Polls />} />
            </Route>
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;