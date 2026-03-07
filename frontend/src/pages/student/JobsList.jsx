import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@config/firebase';
import { COLLECTIONS, JOB_TYPES, JOB_TYPE_LABELS, WORK_MODES } from '@config/constants';
import { useAuth } from '@context/AuthContext';

const JobsList = () => {
    const { userProfile } = useAuth();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [filters, setFilters] = useState({
        jobType: '',
        workMode: '',
        search: '',
    });

    // Fetch active jobs
    const fetchJobs = async () => {
        try {
            setLoading(true);
            setError(null);

            // Query for active jobs only
            const q = query(
                collection(db, COLLECTIONS.JOBS),
                where('status', '==', 'active'),
                where('isAdminApproved', '==', true), // Only show admin-approved jobs
                orderBy('createdAt', 'desc')
            );

            const snapshot = await getDocs(q);
            const jobsData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));

            setJobs(jobsData);
        } catch (err) {
            console.error('Error fetching jobs:', err);
            setError('Failed to load jobs. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    // Apply client-side filters
    const filteredJobs = jobs.filter((job) => {
        // Branch eligibility filter — hide jobs the student's branch is not eligible for
        const eligibleBranches = job.eligibility?.branches;
        if (eligibleBranches && eligibleBranches.length > 0 && userProfile?.branch) {
            if (!eligibleBranches.includes(userProfile.branch)) {
                return false;
            }
        }

        // Job type filter
        if (filters.jobType && job.jobType !== filters.jobType) {
            return false;
        }

        // Work mode filter
        if (filters.workMode && job.workMode !== filters.workMode) {
            return false;
        }

        // Search filter (title, company, location)
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            const matchesTitle = job.title?.toLowerCase().includes(searchLower);
            const matchesCompany = job.companyName?.toLowerCase().includes(searchLower);
            const matchesLocation = job.location?.toLowerCase().includes(searchLower);
            if (!matchesTitle && !matchesCompany && !matchesLocation) {
                return false;
            }
        }

        return true;
    });

    // Format date
    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // Get days remaining until deadline
    const getDaysRemaining = (deadline) => {
        if (!deadline) return null;
        const deadlineDate = new Date(deadline);
        const today = new Date();
        const diffTime = deadlineDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    // Work mode badge
    const WorkModeBadge = ({ mode }) => {
        const styles = {
            [WORK_MODES.REMOTE]: 'bg-green-100 text-green-800',
            [WORK_MODES.HYBRID]: 'bg-purple-100 text-purple-800',
            [WORK_MODES.ONSITE]: 'bg-blue-100 text-blue-800',
        };
        const labels = {
            [WORK_MODES.REMOTE]: 'Remote',
            [WORK_MODES.HYBRID]: 'Hybrid',
            [WORK_MODES.ONSITE]: 'On-site',
        };
        return (
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[mode] || 'bg-gray-100 text-gray-800'}`}>
                {labels[mode] || mode}
            </span>
        );
    };

    return (
        <div>
            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Browse Jobs & Internships</h1>
                <p className="text-gray-600 mt-1">Explore opportunities and find your perfect role</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="md:col-span-2">
                        <div className="relative">
                            <svg
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search by job title, company, or location..."
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Job Type Filter */}
                    <select
                        value={filters.jobType}
                        onChange={(e) => setFilters({ ...filters, jobType: e.target.value })}
                        className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                        <option value="">All Job Types</option>
                        <option value={JOB_TYPES.FULL_TIME}>{JOB_TYPE_LABELS[JOB_TYPES.FULL_TIME]}</option>
                        <option value={JOB_TYPES.INTERNSHIP}>{JOB_TYPE_LABELS[JOB_TYPES.INTERNSHIP]}</option>
                        <option value={JOB_TYPES.PART_TIME}>{JOB_TYPE_LABELS[JOB_TYPES.PART_TIME]}</option>
                        <option value={JOB_TYPES.CONTRACT}>{JOB_TYPE_LABELS[JOB_TYPES.CONTRACT]}</option>
                    </select>

                    {/* Work Mode Filter */}
                    <select
                        value={filters.workMode}
                        onChange={(e) => setFilters({ ...filters, workMode: e.target.value })}
                        className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                        <option value="">All Work Modes</option>
                        <option value={WORK_MODES.REMOTE}>Remote</option>
                        <option value={WORK_MODES.HYBRID}>Hybrid</option>
                        <option value={WORK_MODES.ONSITE}>On-site</option>
                    </select>
                </div>

                {/* Active Filters */}
                {(filters.jobType || filters.workMode || filters.search) && (
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                        <span className="text-sm text-gray-500">Active filters:</span>
                        {filters.search && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                Search: "{filters.search}"
                                <button
                                    onClick={() => setFilters({ ...filters, search: '' })}
                                    className="hover:text-blue-600"
                                >
                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path
                                            fillRule="evenodd"
                                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </button>
                            </span>
                        )}
                        {filters.jobType && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                {JOB_TYPE_LABELS[filters.jobType]}
                                <button
                                    onClick={() => setFilters({ ...filters, jobType: '' })}
                                    className="hover:text-blue-600"
                                >
                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path
                                            fillRule="evenodd"
                                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </button>
                            </span>
                        )}
                        {filters.workMode && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                {filters.workMode.charAt(0).toUpperCase() + filters.workMode.slice(1)}
                                <button
                                    onClick={() => setFilters({ ...filters, workMode: '' })}
                                    className="hover:text-blue-600"
                                >
                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path
                                            fillRule="evenodd"
                                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </button>
                            </span>
                        )}
                        <button
                            onClick={() => setFilters({ jobType: '', workMode: '', search: '' })}
                            className="text-sm text-gray-500 hover:text-gray-700 ml-2"
                        >
                            Clear all
                        </button>
                    </div>
                )}
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                    Showing <span className="font-medium">{filteredJobs.length}</span> job
                    {filteredJobs.length !== 1 ? 's' : ''}
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                        />
                    </svg>
                    <span className="text-red-800">{error}</span>
                </div>
            )}

            {/* Jobs Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
                </div>
            ) : filteredJobs.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <svg
                        className="mx-auto h-16 w-16 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No jobs found</h3>
                    <p className="mt-2 text-gray-500">
                        {filters.search || filters.jobType || filters.workMode
                            ? 'Try adjusting your filters to see more results.'
                            : 'No jobs are currently available. Check back later!'}
                    </p>
                    {(filters.search || filters.jobType || filters.workMode) && (
                        <button
                            onClick={() => setFilters({ jobType: '', workMode: '', search: '' })}
                            className="mt-4 px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Clear all filters
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredJobs.map((job) => {
                        const daysRemaining = getDaysRemaining(job.applicationSettings?.deadline);

                        return (
                            <Link
                                key={job.id}
                                to={`/student/jobs/${job.id}`}
                                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all group"
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                                            {job.title}
                                        </h3>
                                        <p className="text-sm text-gray-600 mt-1">{job.companyName}</p>
                                    </div>
                                    <WorkModeBadge mode={job.workMode} />
                                </div>

                                {/* Details */}
                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                            />
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                            />
                                        </svg>
                                        <span className="line-clamp-1">{job.location || 'Location not specified'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                            />
                                        </svg>
                                        <span>{JOB_TYPE_LABELS[job.jobType] || job.jobType}</span>
                                    </div>
                                    {job.salary?.amount && (
                                        <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                            <span>{job.salary.amount}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Tags */}
                                {job.eligibility?.branches && job.eligibility.branches.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                        {job.eligibility.branches.slice(0, 3).map((branch) => (
                                            <span
                                                key={branch}
                                                className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                                            >
                                                {branch}
                                            </span>
                                        ))}
                                        {job.eligibility.branches.length > 3 && (
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                                +{job.eligibility.branches.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                    <span className="text-xs text-gray-500">
                                        Posted {formatDate(job.createdAt)}
                                    </span>
                                    {daysRemaining !== null && (
                                        <span
                                            className={`text-xs font-medium ${daysRemaining <= 3
                                                    ? 'text-red-600'
                                                    : daysRemaining <= 7
                                                        ? 'text-yellow-600'
                                                        : 'text-gray-600'
                                                }`}
                                        >
                                            {daysRemaining > 0
                                                ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left`
                                                : daysRemaining === 0
                                                    ? 'Last day!'
                                                    : 'Expired'}
                                        </span>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default JobsList;
