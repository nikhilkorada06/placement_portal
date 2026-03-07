import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@config/firebase';
import { 
    ChartBarIcon, 
    UserGroupIcon, 
    BuildingOfficeIcon,
    BriefcaseIcon,
    CheckCircleIcon,
    ClockIcon,
    AcademicCapIcon,
    TrophyIcon,
    ArrowTrendingUpIcon,
    UsersIcon,
    DocumentTextIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const PlacementAnalytics = () => {
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [students, setStudents] = useState([]);
    const [recruiters, setRecruiters] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [applications, setApplications] = useState([]);

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                setLoading(true);
                
                // Fetch all collections in parallel
                const [usersSnap, studentsSnap, recruitersSnap, jobsSnap, applicationsSnap] = await Promise.all([
                    getDocs(collection(db, 'users')),
                    getDocs(collection(db, 'students')),
                    getDocs(collection(db, 'recruiters')),
                    getDocs(collection(db, 'jobs')),
                    getDocs(collection(db, 'applications'))
                ]);

                const usersData = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const studentsData = studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const recruitersData = recruitersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const jobsData = jobsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const applicationsData = applicationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                setUsers(usersData);
                setStudents(studentsData);
                setRecruiters(recruitersData);
                setJobs(jobsData);
                setApplications(applicationsData);
            } catch (error) {
                console.error('Error fetching analytics data:', error);
                toast.error('Failed to load analytics data');
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, []);

    // Calculate all analytics
    const analytics = useMemo(() => {
        // User stats
        const totalUsers = users.length;
        const verifiedUsers = users.filter(u => u.isAdminVerified === true).length;
        const pendingUsers = users.filter(u => u.isAdminVerified === false).length;
        
        // Student stats
        const totalStudents = students.length;
        const verifiedStudents = users.filter(u => u.role === 'student' && u.isAdminVerified === true).length;
        const profileCompleteStudents = students.filter(s => s.profileCompleted === true).length;
        
        // CGPA Analysis
        const cgpaRanges = {
            '9.0+': students.filter(s => parseFloat(s.cgpa) >= 9.0).length,
            '8.0-8.9': students.filter(s => parseFloat(s.cgpa) >= 8.0 && parseFloat(s.cgpa) < 9.0).length,
            '7.0-7.9': students.filter(s => parseFloat(s.cgpa) >= 7.0 && parseFloat(s.cgpa) < 8.0).length,
            'Below 7.0': students.filter(s => parseFloat(s.cgpa) < 7.0).length,
        };
        const avgCGPA = students.length > 0 
            ? (students.reduce((sum, s) => sum + (parseFloat(s.cgpa) || 0), 0) / students.length).toFixed(2)
            : '0.00';

        // Branch Distribution
        const branchCounts = {};
        students.forEach(s => {
            if (s.branch) {
                branchCounts[s.branch] = (branchCounts[s.branch] || 0) + 1;
            }
        });
        const topBranch = Object.entries(branchCounts).sort((a, b) => b[1] - a[1])[0] || ['N/A', 0];

        // Recruiter stats
        const totalRecruiters = recruiters.length;
        const verifiedRecruiters = users.filter(u => u.role === 'recruiter' && u.isAdminVerified === true).length;
        
        // Industry Distribution
        const industryCounts = {};
        recruiters.forEach(r => {
            if (r.industry) {
                industryCounts[r.industry] = (industryCounts[r.industry] || 0) + 1;
            }
        });
        const topIndustry = Object.entries(industryCounts).sort((a, b) => b[1] - a[1])[0] || ['N/A', 0];

        // Job stats
        const totalJobs = jobs.length;
        const activeJobs = jobs.filter(j => j.status === 'active').length;
        const closedJobs = jobs.filter(j => j.status === 'closed').length;

        // Application stats
        const totalApplications = applications.length;
        const acceptedApplications = applications.filter(a => a.status === 'accepted').length;
        const pendingApplications = applications.filter(a => a.status === 'pending').length;
        const rejectedApplications = applications.filter(a => a.status === 'rejected').length;
        
        const placementRate = totalApplications > 0 
            ? ((acceptedApplications / totalApplications) * 100).toFixed(1) 
            : '0.0';

        // Package Analytics - derive package from job's salary.amount for placed students
        const jobsMap = jobs.reduce((map, j) => { map[j.id] = j; return map; }, {});
        const placedApps = applications.filter(a => a.status === 'placed');
        const packages = placedApps
            .map(a => {
                const amount = a.packageAmount || jobsMap[a.jobId]?.salary?.amount || 0;
                return parseFloat(amount) || 0;
            })
            .filter(p => p > 0)
            .sort((a, b) => a - b);
        const avgPackage = packages.length > 0 ? packages.reduce((sum, p) => sum + p, 0) / packages.length : 0;
        const medianPackage = packages.length > 0
            ? (packages.length % 2 === 0
                ? (packages[packages.length / 2 - 1] + packages[packages.length / 2]) / 2
                : packages[Math.floor(packages.length / 2)])
            : 0;
        const highestPackage = packages.length > 0 ? packages[packages.length - 1] : 0;
        const placedCount = placedApps.length;

        return {
            totalUsers,
            verifiedUsers,
            pendingUsers,
            totalStudents,
            verifiedStudents,
            profileCompleteStudents,
            cgpaRanges,
            avgCGPA,
            branchCounts,
            topBranch,
            totalRecruiters,
            verifiedRecruiters,
            industryCounts,
            topIndustry,
            totalJobs,
            activeJobs,
            closedJobs,
            totalApplications,
            acceptedApplications,
            pendingApplications,
            rejectedApplications,
            placementRate,
            avgPackage,
            medianPackage,
            highestPackage,
            placedCount,
        };
    }, [users, students, recruiters, jobs, applications]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto" />
                    <p className="mt-4 text-gray-600 font-medium">Loading analytics data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <ChartBarIcon className="w-8 h-8 text-purple-600" />
                        Placement Analytics
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Comprehensive overview of placement activities and trends</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200/50">
                    <SparklesIcon className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-semibold text-purple-700">Live Data</span>
                </div>
            </div>

            {/* Top Level Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                {/* Total Users */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/90 to-purple-700/90 p-6 shadow-lg shadow-purple-200/50 backdrop-blur-sm">
                    <div className="absolute inset-0 bg-black/5"></div>
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                <UsersIcon className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xs font-semibold text-white/80 bg-white/10 px-2 py-1 rounded-lg">
                                Total
                            </span>
                        </div>
                        <p className="text-4xl font-bold text-white mb-1">{analytics.totalUsers}</p>
                        <p className="text-purple-100 text-sm font-medium">Registered Users</p>
                        <div className="mt-3 flex items-center gap-2 text-xs text-purple-100">
                            <CheckCircleIcon className="w-4 h-4" />
                            <span>{analytics.verifiedUsers} verified</span>
                        </div>
                    </div>
                </div>

                {/* Total Students */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/90 to-blue-700/90 p-6 shadow-lg shadow-blue-200/50 backdrop-blur-sm">
                    <div className="absolute inset-0 bg-black/5"></div>
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                <AcademicCapIcon className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xs font-semibold text-white/80 bg-white/10 px-2 py-1 rounded-lg">
                                {analytics.avgCGPA} CGPA
                            </span>
                        </div>
                        <p className="text-4xl font-bold text-white mb-1">{analytics.totalStudents}</p>
                        <p className="text-blue-100 text-sm font-medium">Total Students</p>
                        <div className="mt-3 flex items-center gap-2 text-xs text-blue-100">
                            <DocumentTextIcon className="w-4 h-4" />
                            <span>{analytics.profileCompleteStudents} profiles complete</span>
                        </div>
                    </div>
                </div>

                {/* Total Recruiters */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/90 to-emerald-700/90 p-6 shadow-lg shadow-emerald-200/50 backdrop-blur-sm">
                    <div className="absolute inset-0 bg-black/5"></div>
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                <BuildingOfficeIcon className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xs font-semibold text-white/80 bg-white/10 px-2 py-1 rounded-lg">
                                Active
                            </span>
                        </div>
                        <p className="text-4xl font-bold text-white mb-1">{analytics.totalRecruiters}</p>
                        <p className="text-emerald-100 text-sm font-medium">Total Recruiters</p>
                        <div className="mt-3 flex items-center gap-2 text-xs text-emerald-100">
                            <CheckCircleIcon className="w-4 h-4" />
                            <span>{analytics.verifiedRecruiters} verified</span>
                        </div>
                    </div>
                </div>

                {/* Placement Rate */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/90 to-orange-600/90 p-6 shadow-lg shadow-orange-200/50 backdrop-blur-sm">
                    <div className="absolute inset-0 bg-black/5"></div>
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                <TrophyIcon className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xs font-semibold text-white/80 bg-white/10 px-2 py-1 rounded-lg">
                                Success
                            </span>
                        </div>
                        <p className="text-4xl font-bold text-white mb-1">{analytics.placementRate}%</p>
                        <p className="text-orange-100 text-sm font-medium">Placement Rate</p>
                        <div className="mt-3 flex items-center gap-2 text-xs text-orange-100">
                            <ArrowTrendingUpIcon className="w-4 h-4" />
                            <span>{analytics.acceptedApplications} placed</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Jobs & Applications Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Jobs Overview */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 border-b border-gray-100/50">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <BriefcaseIcon className="w-5 h-5 text-indigo-600" />
                            Job Postings Overview
                        </h3>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-indigo-50/80 to-indigo-100/50 border border-indigo-200/30">
                                <p className="text-3xl font-bold text-indigo-600">{analytics.totalJobs}</p>
                                <p className="text-xs text-gray-600 mt-1 font-medium">Total Jobs</p>
                            </div>
                            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-green-50/80 to-green-100/50 border border-green-200/30">
                                <p className="text-3xl font-bold text-green-600">{analytics.activeJobs}</p>
                                <p className="text-xs text-gray-600 mt-1 font-medium">Active</p>
                            </div>
                            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-gray-50/80 to-gray-100/50 border border-gray-200/30">
                                <p className="text-3xl font-bold text-gray-600">{analytics.closedJobs}</p>
                                <p className="text-xs text-gray-600 mt-1 font-medium">Closed</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Applications Overview */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-b border-gray-100/50">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                            Applications Overview
                        </h3>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-4 gap-3">
                            <div className="text-center p-3 rounded-xl bg-gradient-to-br from-blue-50/80 to-blue-100/50 border border-blue-200/30">
                                <p className="text-2xl font-bold text-blue-600">{analytics.totalApplications}</p>
                                <p className="text-[10px] text-gray-600 mt-0.5 font-medium">Total</p>
                            </div>
                            <div className="text-center p-3 rounded-xl bg-gradient-to-br from-emerald-50/80 to-emerald-100/50 border border-emerald-200/30">
                                <p className="text-2xl font-bold text-emerald-600">{analytics.acceptedApplications}</p>
                                <p className="text-[10px] text-gray-600 mt-0.5 font-medium">Accepted</p>
                            </div>
                            <div className="text-center p-3 rounded-xl bg-gradient-to-br from-amber-50/80 to-amber-100/50 border border-amber-200/30">
                                <p className="text-2xl font-bold text-amber-600">{analytics.pendingApplications}</p>
                                <p className="text-[10px] text-gray-600 mt-0.5 font-medium">Pending</p>
                            </div>
                            <div className="text-center p-3 rounded-xl bg-gradient-to-br from-red-50/80 to-red-100/50 border border-red-200/30">
                                <p className="text-2xl font-bold text-red-600">{analytics.rejectedApplications}</p>
                                <p className="text-[10px] text-gray-600 mt-0.5 font-medium">Rejected</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Student Analytics Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* CGPA Distribution */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-gradient-to-r from-purple-50/80 to-pink-50/80 border-b border-gray-100/50">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <ChartBarIcon className="w-5 h-5 text-purple-600" />
                            CGPA Distribution
                        </h3>
                    </div>
                    <div className="p-6 space-y-3">
                        {Object.entries(analytics.cgpaRanges).map(([range, count]) => {
                            const percentage = analytics.totalStudents > 0 ? (count / analytics.totalStudents) * 100 : 0;
                            const colors = {
                                '9.0+': 'bg-gradient-to-r from-green-500/80 to-emerald-500/80',
                                '8.0-8.9': 'bg-gradient-to-r from-blue-500/80 to-cyan-500/80',
                                '7.0-7.9': 'bg-gradient-to-r from-amber-500/80 to-orange-500/80',
                                'Below 7.0': 'bg-gradient-to-r from-red-500/80 to-pink-500/80'
                            };
                            return (
                                <div key={range}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-sm font-semibold text-gray-700">{range}</span>
                                        <span className="text-sm font-bold text-gray-900">{count} students</span>
                                    </div>
                                    <div className="w-full bg-gray-100/80 rounded-full h-3 overflow-hidden border border-gray-200/50">
                                        <div 
                                            className={`h-full ${colors[range]} transition-all duration-500 shadow-sm`}
                                            style={{ width: `${percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Branch Distribution */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-gradient-to-r from-cyan-50/80 to-blue-50/80 border-b border-gray-100/50">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <AcademicCapIcon className="w-5 h-5 text-cyan-600" />
                            Branch Distribution
                        </h3>
                    </div>
                    <div className="p-6">
                        {Object.keys(analytics.branchCounts).length > 0 ? (
                            <div className="space-y-3">
                                {Object.entries(analytics.branchCounts)
                                    .sort((a, b) => b[1] - a[1])
                                    .slice(0, 6)
                                    .map(([branch, count], idx) => {
                                        const percentage = analytics.totalStudents > 0 ? (count / analytics.totalStudents) * 100 : 0;
                                        const gradients = [
                                            'bg-gradient-to-r from-purple-500/80 to-indigo-500/80',
                                            'bg-gradient-to-r from-blue-500/80 to-cyan-500/80',
                                            'bg-gradient-to-r from-emerald-500/80 to-green-500/80',
                                            'bg-gradient-to-r from-amber-500/80 to-orange-500/80',
                                            'bg-gradient-to-r from-pink-500/80 to-rose-500/80',
                                            'bg-gradient-to-r from-indigo-500/80 to-purple-500/80'
                                        ];
                                        return (
                                            <div key={branch}>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-sm font-semibold text-gray-700 truncate flex-1">{branch}</span>
                                                    <span className="text-sm font-bold text-gray-900 ml-2">{count}</span>
                                                </div>
                                                <div className="w-full bg-gray-100/80 rounded-full h-3 overflow-hidden border border-gray-200/50">
                                                    <div 
                                                        className={`h-full ${gradients[idx % gradients.length]} transition-all duration-500 shadow-sm`}
                                                        style={{ width: `${percentage}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        ) : (
                            <p className="text-center text-gray-400 py-4">No branch data available</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Package Analytics Section */}
            <div className="bg-gradient-to-br from-emerald-50/90 to-teal-50/90 rounded-2xl border border-emerald-200/50 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200/50">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                College-Wide Package Analytics
                            </h3>
                            <p className="text-sm text-gray-600 mt-0.5">Running placement statistics across all recruiters till date</p>
                        </div>
                        <div className="px-4 py-2 bg-emerald-100 border border-emerald-300 rounded-xl">
                            <span className="text-sm font-bold text-emerald-700">{analytics.placedCount} Students Placed</span>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Highest Package */}
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/95 to-orange-600/95 p-7 shadow-xl shadow-orange-200/50">
                            <div className="absolute inset-0 bg-black/5"></div>
                            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                            <div className="relative">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                        </svg>
                                    </div>
                                    <span className="text-xs font-bold text-white/95 bg-white/20 px-3 py-1.5 rounded-xl backdrop-blur-sm shadow-sm">HIGHEST</span>
                                </div>
                                <p className="text-sm text-white/95 font-semibold mb-2">Highest Package</p>
                                <p className="text-4xl font-extrabold text-white mb-2 tracking-tight">{analytics.highestPackage > 0 ? `₹${analytics.highestPackage.toLocaleString()}` : 'N/A'}</p>
                                <p className="text-xs text-white/90 font-medium">per annum</p>
                            </div>
                        </div>

                        {/* Average Package */}
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/95 to-indigo-600/95 p-7 shadow-xl shadow-blue-200/50">
                            <div className="absolute inset-0 bg-black/5"></div>
                            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                            <div className="relative">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <span className="text-xs font-bold text-white/95 bg-white/20 px-3 py-1.5 rounded-xl backdrop-blur-sm shadow-sm">AVERAGE</span>
                                </div>
                                <p className="text-sm text-white/95 font-semibold mb-2">Average Package</p>
                                <p className="text-4xl font-extrabold text-white mb-2 tracking-tight">{analytics.avgPackage > 0 ? `₹${Math.round(analytics.avgPackage).toLocaleString()}` : 'N/A'}</p>
                                <p className="text-xs text-white/90 font-medium">per annum</p>
                            </div>
                        </div>

                        {/* Median Package */}
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/95 to-pink-600/95 p-7 shadow-xl shadow-purple-200/50">
                            <div className="absolute inset-0 bg-black/5"></div>
                            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                            <div className="relative">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                                        </svg>
                                    </div>
                                    <span className="text-xs font-bold text-white/95 bg-white/20 px-3 py-1.5 rounded-xl backdrop-blur-sm shadow-sm">MEDIAN</span>
                                </div>
                                <p className="text-sm text-white/95 font-semibold mb-2">Median Package</p>
                                <p className="text-4xl font-extrabold text-white mb-2 tracking-tight">{analytics.medianPackage > 0 ? `₹${Math.round(analytics.medianPackage).toLocaleString()}` : 'N/A'}</p>
                                <p className="text-xs text-white/90 font-medium">per annum</p>
                            </div>
                        </div>
                    </div>

                    {/* Additional Info */}
                    <div className="mt-5 p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-emerald-200/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                                <TrophyIcon className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">College Placement Performance</p>
                                <p className="text-xs text-gray-600 mt-0.5">
                                    {analytics.placedCount} students placed till date with a running average package of ₹{Math.round(analytics.avgPackage).toLocaleString()} per annum
                                </p>
                            </div>
                        </div>
                    </div>
            </div>

            {/* Bottom Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-purple-50/90 to-purple-100/70 backdrop-blur-sm rounded-xl p-5 border border-purple-200/50 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                            <UserGroupIcon className="w-5 h-5 text-purple-600" />
                        </div>
                        <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Top Branch</p>
                    </div>
                    <p className="text-2xl font-bold text-purple-900">{analytics.topBranch[0]}</p>
                    <p className="text-xs text-purple-600 mt-1">{analytics.topBranch[1]} students</p>
                </div>

                <div className="bg-gradient-to-br from-blue-50/90 to-blue-100/70 backdrop-blur-sm rounded-xl p-5 border border-blue-200/50 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                            <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Top Industry</p>
                    </div>
                    <p className="text-xl font-bold text-blue-900 truncate">{analytics.topIndustry[0]}</p>
                    <p className="text-xs text-blue-600 mt-1">{analytics.topIndustry[1]} recruiters</p>
                </div>

                <div className="bg-gradient-to-br from-amber-50/90 to-amber-100/70 backdrop-blur-sm rounded-xl p-5 border border-amber-200/50 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                            <ClockIcon className="w-5 h-5 text-amber-600" />
                        </div>
                        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Pending Verify</p>
                    </div>
                    <p className="text-2xl font-bold text-amber-900">{analytics.pendingUsers}</p>
                    <p className="text-xs text-amber-600 mt-1">awaiting approval</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-50/90 to-emerald-100/70 backdrop-blur-sm rounded-xl p-5 border border-emerald-200/50 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                            <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                        </div>
                        <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Verified</p>
                    </div>
                    <p className="text-2xl font-bold text-emerald-900">{analytics.verifiedUsers}</p>
                    <p className="text-xs text-emerald-600 mt-1">total verified</p>
                </div>
            </div>
        </div>
    );
};

export default PlacementAnalytics;
