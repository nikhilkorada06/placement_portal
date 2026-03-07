import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';

// Layouts
import PublicLayout from '@layouts/PublicLayout';
import StudentLayout from '@layouts/StudentLayout';
import RecruiterLayout from '@layouts/RecruiterLayout';
import AdminLayout from '@layouts/AdminLayout';

// Public Pages
import LandingPage from '@pages/public/LandingPage';
import LoginPage from '@pages/auth/LoginPage';
import RegisterPage from '@pages/auth/RegisterPage';
import ForgotPasswordPage from '@pages/auth/ForgotPasswordPage';
import VerifyOTP from '@pages/auth/VerifyOTP';
import AdminLoginPage from '@pages/auth/AdminLoginPage';
import StudentLoginPage from '@pages/auth/StudentLoginPage';
import RecruiterLoginPage from '@pages/auth/RecruiterLoginPage';
import StudentRegisterPage from '@pages/auth/StudentRegisterPage';
import RecruiterRegisterPage from '@pages/auth/RecruiterRegisterPage';

// Student Pages
import StudentDashboard from '@pages/student/Dashboard';
import StudentProfile from '@pages/student/Profile';
import JobsList from '@pages/student/JobsList';
import JobDetails from '@pages/student/JobDetails';
import Applications from '@pages/student/Applications';
import Interviews from '@pages/student/Interviews';
import Resume from '@pages/student/Resume';

// Recruiter Pages
import RecruiterDashboard from '@pages/recruiter/Dashboard';
import RecruiterProfile from '@pages/recruiter/Profile';
import PostJob from '@pages/recruiter/PostJob';
import ManageJobs from '@pages/recruiter/ManageJobs';
import Candidates from '@pages/recruiter/Candidates';
import RecruiterAnalytics from '@pages/recruiter/Analytics';
import ScheduleInterview from '@pages/recruiter/ScheduleInterview';

// Admin Pages
import AdminDashboard from '@pages/admin/Dashboard';
import ManageStudents from '@pages/admin/ManageStudents';
import StudentProfiles from '@pages/admin/StudentProfiles';
import StudentVerification from '@pages/admin/StudentVerification';
import ManageRecruiters from '@pages/admin/ManageRecruiters';
import RecruiterProfiles from '@pages/admin/RecruiterProfiles';
import RecruiterVerification from '@pages/admin/RecruiterVerification';
import PlacementAnalytics from '@pages/admin/PlacementAnalytics';
import JobApprovals from '@pages/admin/JobApprovals';
import Reports from '@pages/admin/Reports';

// Protected Route Component called ProtectedRoute
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, userProfile, loading } = useAuth();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Wait for user profile to load
    if (!userProfile && !loading) {
        return <Navigate to="/" replace />;
    }

    if (!userProfile) {
        return <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading...</p>
            </div>
        </div>;
    }

    if (allowedRoles && !allowedRoles.includes(userProfile?.role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
};

function App() {
    const { user, userProfile, loading } = useAuth();

    // Redirect to appropriate dashboard if already logged in
    const getDefaultRoute = () => {
        if (!user || !userProfile) return '/';

        switch (userProfile.role) {
            case 'student':
                return '/student/dashboard';
            case 'recruiter':
                return '/recruiter/dashboard';
            case 'admin':
                return '/admin/dashboard';
            default:
                return '/';
        }
    };

    // Show loading state while checking authentication
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <Routes>
            {/* Public Routes */}
            <Route element={<PublicLayout />}>
                <Route path="/" element={<LandingPage />} />
                <Route
                    path="/login"
                    element={user && userProfile ? <Navigate to={getDefaultRoute()} replace /> : <LoginPage />}
                />
                <Route
                    path="/register"
                    element={user && userProfile ? <Navigate to={getDefaultRoute()} replace /> : <RegisterPage />}
                />
                <Route path="/admin/login" element={user && userProfile ? <Navigate to={getDefaultRoute()} replace /> : <AdminLoginPage />} />
                <Route path="/student/login" element={user && userProfile ? <Navigate to={getDefaultRoute()} replace /> : <StudentLoginPage />} />
                <Route path="/student/register" element={user && userProfile ? <Navigate to={getDefaultRoute()} replace /> : <StudentRegisterPage />} />
                <Route path="/recruiter/login" element={user && userProfile ? <Navigate to={getDefaultRoute()} replace /> : <RecruiterLoginPage />} />
                <Route path="/recruiter/register" element={user && userProfile ? <Navigate to={getDefaultRoute()} replace /> : <RecruiterRegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/verify-otp/:uid" element={<VerifyOTP />} />
            </Route>

            {/* Student Routes */}
            <Route
                path="/student"
                element={
                    <ProtectedRoute allowedRoles={['student']}>
                        <StudentLayout />
                    </ProtectedRoute>
                }
            >
                <Route path="dashboard" element={<StudentDashboard />} />
                <Route path="profile" element={<StudentProfile />} />
                <Route path="jobs" element={<JobsList />} />
                <Route path="jobs/:jobId" element={<JobDetails />} />
                <Route path="applications" element={<Applications />} />
                <Route path="interviews" element={<Interviews />} />
                <Route path="resume" element={<Resume />} />
            </Route>

            {/* Recruiter Routes */}
            <Route
                path="/recruiter"
                element={
                    <ProtectedRoute allowedRoles={['recruiter']}>
                        <RecruiterLayout />
                    </ProtectedRoute>
                }
            >
                <Route path="dashboard" element={<RecruiterDashboard />} />
                <Route path="profile" element={<RecruiterProfile />} />
                <Route path="post-job" element={<PostJob />} />
                <Route path="jobs" element={<ManageJobs />} />
                <Route path="jobs/:jobId/edit" element={<PostJob />} />
                <Route path="jobs/:jobId/candidates" element={<Candidates />} />
                <Route path="analytics" element={<RecruiterAnalytics />} />
                <Route path="interviews" element={<ScheduleInterview />} />
            </Route>

            {/* Admin Routes */}
            <Route
                path="/admin"
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <AdminLayout />
                    </ProtectedRoute>
                }
            >
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="students" element={<ManageStudents />} />
                <Route path="students/profiles" element={<StudentProfiles />} />
                <Route path="students/verification" element={<StudentVerification />} />
                <Route path="recruiters" element={<ManageRecruiters />} />
                <Route path="recruiters/profiles" element={<RecruiterProfiles />} />
                <Route path="recruiters/verification" element={<RecruiterVerification />} />
                <Route path="jobs/approvals" element={<JobApprovals />} />
                <Route path="analytics" element={<PlacementAnalytics />} />
                <Route path="reports" element={<Reports />} />
            </Route>

            {/* Fallback Routes */}
            <Route path="/unauthorized" element={<div className="flex items-center justify-center min-h-screen"><h1 className="text-2xl font-bold">Unauthorized Access</h1></div>} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;
