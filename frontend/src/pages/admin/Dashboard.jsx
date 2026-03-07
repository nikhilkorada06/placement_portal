import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@config/firebase';
import {
    UserGroupIcon,
    AcademicCapIcon,
    BuildingOfficeIcon,
    BriefcaseIcon,
    ClockIcon,
    CheckBadgeIcon,
    ArrowTrendingUpIcon,
    ChartBarIcon,
    ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        totalStudents: 0,
        verifiedStudents: 0,
        pendingStudents: 0,
        totalRecruiters: 0,
        verifiedRecruiters: 0,
        pendingRecruiters: 0,
        totalJobs: 0,
        activeJobs: 0,
        pendingJobApprovals: 0,
        totalApplications: 0,
        placedStudents: 0,
    });
    const [loading, setLoading] = useState(true);
    const [recentActivity, setRecentActivity] = useState([]);

    useEffect(() => {
        const unsubscribers = [];

        // Real-time listener for students
        const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
        const unsubStudents = onSnapshot(studentsQuery, (snapshot) => {
            const total = snapshot.size;
            const verified = snapshot.docs.filter(doc => doc.data().isAdminVerified === true).length;
            const pending = snapshot.docs.filter(doc => doc.data().isAdminVerified === false).length;
            
            setStats(prev => ({
                ...prev,
                totalStudents: total,
                verifiedStudents: verified,
                pendingStudents: pending,
            }));
        });
        unsubscribers.push(unsubStudents);

        // Real-time listener for recruiters
        const recruitersQuery = query(collection(db, 'users'), where('role', '==', 'recruiter'));
        const unsubRecruiters = onSnapshot(recruitersQuery, (snapshot) => {
            const total = snapshot.size;
            const verified = snapshot.docs.filter(doc => doc.data().isAdminVerified === true).length;
            const pending = snapshot.docs.filter(doc => doc.data().isAdminVerified === false).length;
            
            setStats(prev => ({
                ...prev,
                totalRecruiters: total,
                verifiedRecruiters: verified,
                pendingRecruiters: pending,
            }));
        });
        unsubscribers.push(unsubRecruiters);

        // Real-time listener for jobs
        const unsubJobs = onSnapshot(collection(db, 'jobs'), (snapshot) => {
            const total = snapshot.size;
            const active = snapshot.docs.filter(doc => 
                doc.data().status === 'active' && doc.data().isAdminApproved === true
            ).length;
            const pendingApprovals = snapshot.docs.filter(doc => 
                doc.data().status === 'active' && doc.data().isAdminApproved === false
            ).length;
            
            setStats(prev => ({
                ...prev,
                totalJobs: total,
                activeJobs: active,
                pendingJobApprovals: pendingApprovals,
            }));
        });
        unsubscribers.push(unsubJobs);

        // Real-time listener for applications
        const unsubApplications = onSnapshot(collection(db, 'applications'), (snapshot) => {
            const total = snapshot.size;
            const placed = snapshot.docs.filter(doc => 
                doc.data().status === 'selected' || doc.data().status === 'placed'
            ).length;
            
            setStats(prev => ({
                ...prev,
                totalApplications: total,
                placedStudents: placed,
            }));
        });
        unsubscribers.push(unsubApplications);

        setLoading(false);

        // Cleanup listeners on unmount
        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
                    <p className="mt-4 text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    const placementRate = stats.verifiedStudents > 0 
        ? ((stats.placedStudents / stats.verifiedStudents) * 100).toFixed(1)
        : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
                    <p className="text-sm text-gray-500 mt-1">Real-time platform statistics and insights</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        to="/admin/analytics"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm"
                    >
                        <ChartBarIcon className="w-4 h-4" />
                        Full Analytics
                    </Link>
                </div>
            </div>

            {/* Pending Actions Alert */}
            {(stats.pendingStudents > 0 || stats.pendingRecruiters > 0 || stats.pendingJobApprovals > 0) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <ExclamationCircleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-amber-900">Pending Actions Required</h3>
                            <div className="mt-2 flex flex-wrap gap-3 text-sm">
                                {stats.pendingStudents > 0 && (
                                    <Link 
                                        to="/admin/students/verification"
                                        className="text-amber-700 hover:text-amber-900 underline"
                                    >
                                        {stats.pendingStudents} student{stats.pendingStudents !== 1 ? 's' : ''} awaiting verification
                                    </Link>
                                )}
                                {stats.pendingRecruiters > 0 && (
                                    <Link 
                                        to="/admin/recruiters/verification"
                                        className="text-amber-700 hover:text-amber-900 underline"
                                    >
                                        {stats.pendingRecruiters} recruiter{stats.pendingRecruiters !== 1 ? 's' : ''} awaiting verification
                                    </Link>
                                )}
                                {stats.pendingJobApprovals > 0 && (
                                    <Link 
                                        to="/admin/jobs/approvals"
                                        className="text-amber-700 hover:text-amber-900 underline"
                                    >
                                        {stats.pendingJobApprovals} job{stats.pendingJobApprovals !== 1 ? 's' : ''} awaiting approval
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Students */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                                <AcademicCapIcon className="w-6 h-6 text-blue-600" />
                            </div>
                            <Link 
                                to="/admin/students"
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                                View →
                            </Link>
                        </div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Total Students</h3>
                        <p className="text-3xl font-bold text-gray-900">{stats.totalStudents}</p>
                        <div className="mt-3 flex items-center gap-3 text-xs">
                            <span className="text-green-600 font-medium">
                                ✓ {stats.verifiedStudents} verified
                            </span>
                            {stats.pendingStudents > 0 && (
                                <span className="text-amber-600 font-medium">
                                    ⏳ {stats.pendingStudents} pending
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Total Recruiters */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                                <BuildingOfficeIcon className="w-6 h-6 text-purple-600" />
                            </div>
                            <Link 
                                to="/admin/recruiters"
                                className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                            >
                                View →
                            </Link>
                        </div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Total Recruiters</h3>
                        <p className="text-3xl font-bold text-gray-900">{stats.totalRecruiters}</p>
                        <div className="mt-3 flex items-center gap-3 text-xs">
                            <span className="text-green-600 font-medium">
                                ✓ {stats.verifiedRecruiters} verified
                            </span>
                            {stats.pendingRecruiters > 0 && (
                                <span className="text-amber-600 font-medium">
                                    ⏳ {stats.pendingRecruiters} pending
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Active Jobs */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                                <BriefcaseIcon className="w-6 h-6 text-emerald-600" />
                            </div>
                            <Link 
                                to="/admin/jobs/approvals"
                                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                            >
                                View →
                            </Link>
                        </div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Active Jobs</h3>
                        <p className="text-3xl font-bold text-gray-900">{stats.activeJobs}</p>
                        <div className="mt-3 flex items-center gap-3 text-xs">
                            <span className="text-gray-600 font-medium">
                                {stats.totalJobs} total posted
                            </span>
                            {stats.pendingJobApprovals > 0 && (
                                <span className="text-amber-600 font-medium">
                                    ⏳ {stats.pendingJobApprovals} pending
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Placement Rate */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                                <ArrowTrendingUpIcon className="w-6 h-6 text-indigo-600" />
                            </div>
                            <Link 
                                to="/admin/analytics"
                                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                                View →
                            </Link>
                        </div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Placement Rate</h3>
                        <p className="text-3xl font-bold text-gray-900">{placementRate}%</p>
                        <div className="mt-3 text-xs text-gray-600">
                            {stats.placedStudents} of {stats.verifiedStudents} students placed
                        </div>
                    </div>
                </div>
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Verification Queue */}
                <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                            <ClockIcon className="w-5 h-5 text-gray-600" />
                        </div>
                        <h3 className="text-base font-semibold text-gray-900">Verification Queue</h3>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Pending Students</span>
                            <Link 
                                to="/admin/students/verification"
                                className="text-sm font-bold text-amber-600 hover:text-amber-700"
                            >
                                {stats.pendingStudents}
                            </Link>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Pending Recruiters</span>
                            <Link 
                                to="/admin/recruiters/verification"
                                className="text-sm font-bold text-amber-600 hover:text-amber-700"
                            >
                                {stats.pendingRecruiters}
                            </Link>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Pending Job Approvals</span>
                            <Link 
                                to="/admin/jobs/approvals"
                                className="text-sm font-bold text-amber-600 hover:text-amber-700"
                            >
                                {stats.pendingJobApprovals}
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Applications Overview */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                            <UserGroupIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <h3 className="text-base font-semibold text-gray-900">Applications</h3>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Total Applications</span>
                            <span className="text-lg font-bold text-blue-600">
                                {stats.totalApplications}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Students Placed</span>
                            <span className="text-lg font-bold text-green-600">
                                {stats.placedStudents}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Success Rate</span>
                            <span className="text-lg font-bold text-indigo-600">
                                {stats.totalApplications > 0 
                                    ? ((stats.placedStudents / stats.totalApplications) * 100).toFixed(1)
                                    : 0}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                            <CheckBadgeIcon className="w-5 h-5 text-purple-600" />
                        </div>
                        <h3 className="text-base font-semibold text-gray-900">Quick Actions</h3>
                    </div>
                    <div className="space-y-2">
                        <Link
                            to="/admin/students/verification"
                            className="block w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-colors text-center shadow-sm border border-gray-200"
                        >
                            Verify Students
                        </Link>
                        <Link
                            to="/admin/recruiters/verification"
                            className="block w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-colors text-center shadow-sm border border-gray-200"
                        >
                            Verify Recruiters
                        </Link>
                        <Link
                            to="/admin/jobs/approvals"
                            className="block w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-colors text-center shadow-sm border border-gray-200"
                        >
                            Approve Jobs
                        </Link>
                    </div>
                </div>
            </div>

            {/* Platform Health Indicators */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Health</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{stats.verifiedStudents}</div>
                        <div className="text-xs text-gray-500 mt-1">Verified Students</div>
                        <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-green-500 rounded-full transition-all"
                                style={{ width: `${stats.totalStudents > 0 ? (stats.verifiedStudents / stats.totalStudents) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{stats.verifiedRecruiters}</div>
                        <div className="text-xs text-gray-500 mt-1">Verified Recruiters</div>
                        <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-purple-500 rounded-full transition-all"
                                style={{ width: `${stats.totalRecruiters > 0 ? (stats.verifiedRecruiters / stats.totalRecruiters) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{stats.activeJobs}</div>
                        <div className="text-xs text-gray-500 mt-1">Active Jobs</div>
                        <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-emerald-500 rounded-full transition-all"
                                style={{ width: `${stats.totalJobs > 0 ? (stats.activeJobs / stats.totalJobs) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{stats.placedStudents}</div>
                        <div className="text-xs text-gray-500 mt-1">Successful Placements</div>
                        <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-indigo-500 rounded-full transition-all"
                                style={{ width: `${stats.verifiedStudents > 0 ? (stats.placedStudents / stats.verifiedStudents) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
