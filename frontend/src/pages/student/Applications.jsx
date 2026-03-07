import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@config/firebase';
import { COLLECTIONS, APPLICATION_STATUS, STATUS_LABELS, STATUS_COLORS, JOB_TYPE_LABELS } from '@config/constants';
import { useAuth } from '@context/AuthContext';

const Applications = () => {
    const { user } = useAuth();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all');
    const [jobDescModal, setJobDescModal] = useState(null); // holds job data for the modal
    const [loadingJob, setLoadingJob] = useState(false);

    // Fetch student applications
    useEffect(() => {
        const fetchApplications = async () => {
            if (!user?.uid) return;
            try {
                setLoading(true);
                // Query without orderBy to avoid needing a composite index
                const q = query(
                    collection(db, COLLECTIONS.APPLICATIONS),
                    where('studentId', '==', user.uid)
                );
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
                // Sort client-side: newest first
                data.sort((a, b) => {
                    const aTime = a.appliedAt?.toDate?.() || new Date(a.appliedAt || 0);
                    const bTime = b.appliedAt?.toDate?.() || new Date(b.appliedAt || 0);
                    return bTime - aTime;
                });
                setApplications(data);
            } catch (err) {
                console.error('Error fetching applications:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchApplications();
    }, [user?.uid]);

    // Format date
    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    // Time ago helper
    const timeAgo = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
        return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
    };

    // Status icon mapping
    const statusIcon = (status) => {
        switch (status) {
            case APPLICATION_STATUS.APPLIED:
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case APPLICATION_STATUS.SHORTLISTED:
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                );
            case APPLICATION_STATUS.INTERVIEW_SCHEDULED:
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                );
            case APPLICATION_STATUS.SELECTED:
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case APPLICATION_STATUS.REJECTED:
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            default:
                return null;
        }
    };

    // Open job description modal
    const openJobDesc = async (jobId) => {
        if (!jobId) return;
        try {
            setLoadingJob(true);
            setJobDescModal({}); // open modal immediately with loading
            const jobDoc = await getDoc(doc(db, COLLECTIONS.JOBS, jobId));
            if (jobDoc.exists()) {
                setJobDescModal({ id: jobDoc.id, ...jobDoc.data() });
            } else {
                setJobDescModal({ notFound: true });
            }
        } catch (err) {
            console.error('Error fetching job:', err);
            setJobDescModal({ error: true });
        } finally {
            setLoadingJob(false);
        }
    };

    // Filter tabs
    const filterTabs = [
        { key: 'all', label: 'All' },
        { key: APPLICATION_STATUS.APPLIED, label: 'Applied' },
        { key: APPLICATION_STATUS.SHORTLISTED, label: 'Shortlisted' },
        { key: APPLICATION_STATUS.INTERVIEW_SCHEDULED, label: 'Interview' },
        { key: APPLICATION_STATUS.SELECTED, label: 'Selected' },
    ];

    const filteredApps = activeFilter === 'all'
        ? applications
        : applications.filter((app) => app.status === activeFilter);

    // Count per status
    const countByStatus = (status) => applications.filter((a) => a.status === status).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="pb-8">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
                <p className="text-gray-600 mt-1">Track and manage all your job applications</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                    { status: APPLICATION_STATUS.APPLIED, icon: '📨', bg: 'bg-blue-50 border-blue-200' },
                    { status: APPLICATION_STATUS.SHORTLISTED, icon: '⭐', bg: 'bg-yellow-50 border-yellow-200' },
                    { status: APPLICATION_STATUS.INTERVIEW_SCHEDULED, icon: '📅', bg: 'bg-purple-50 border-purple-200' },
                    { status: APPLICATION_STATUS.SELECTED, icon: '🎉', bg: 'bg-green-50 border-green-200' },
                ].map(({ status, icon, bg }) => (
                    <div key={status} className={`${bg} border rounded-xl p-3 text-center`}>
                        <span className="text-lg">{icon}</span>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{countByStatus(status)}</p>
                        <p className="text-xs text-gray-600">{STATUS_LABELS[status]}</p>
                    </div>
                ))}
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 bg-white rounded-xl p-2 shadow-sm border border-gray-200">
                {filterTabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveFilter(tab.key)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            activeFilter === tab.key
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        {tab.label}
                        {tab.key !== 'all' && (
                            <span className={`ml-1.5 text-xs ${activeFilter === tab.key ? 'text-blue-200' : 'text-gray-400'}`}>
                                {countByStatus(tab.key)}
                            </span>
                        )}
                        {tab.key === 'all' && (
                            <span className={`ml-1.5 text-xs ${activeFilter === 'all' ? 'text-blue-200' : 'text-gray-400'}`}>
                                {applications.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Applications List */}
            {filteredApps.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">
                        {activeFilter === 'all' ? 'No applications yet' : `No ${STATUS_LABELS[activeFilter] || ''} applications`}
                    </h3>
                    <p className="mt-2 text-gray-500">
                        {activeFilter === 'all'
                            ? 'Start applying to jobs to see your applications here.'
                            : 'Try selecting a different filter.'}
                    </p>
                    {activeFilter === 'all' && (
                        <Link
                            to="/student/jobs"
                            className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            Browse Jobs
                        </Link>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredApps.map((app) => (
                        <div
                            key={app.id}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
                        >
                            {/* Status accent stripe */}
                            <div className={`h-1 ${
                                app.status === APPLICATION_STATUS.SELECTED ? 'bg-green-500' :
                                app.status === APPLICATION_STATUS.REJECTED ? 'bg-red-500' :
                                app.status === APPLICATION_STATUS.SHORTLISTED ? 'bg-yellow-500' :
                                app.status === APPLICATION_STATUS.INTERVIEW_SCHEDULED ? 'bg-purple-500' :
                                'bg-blue-500'
                            }`} />

                            <div className="p-5 sm:p-6">
                                {/* Top row — title + status */}
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-semibold text-gray-900 truncate">{app.jobTitle}</h3>
                                        <p className="text-sm text-gray-600 mt-0.5 flex items-center gap-1.5">
                                            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                            {app.companyName}
                                        </p>
                                    </div>
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_COLORS[app.status] || 'bg-gray-100 text-gray-800'}`}>
                                        {statusIcon(app.status)}
                                        {STATUS_LABELS[app.status] || app.status}
                                    </span>
                                </div>

                                {/* Info grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                                        <p className="text-xs text-gray-500">Applied On</p>
                                        <p className="text-sm font-medium text-gray-900">{formatDate(app.appliedAt)}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                                        <p className="text-xs text-gray-500">Timeline</p>
                                        <p className="text-sm font-medium text-gray-900">{timeAgo(app.appliedAt)}</p>
                                    </div>
                                    {app.studentCGPA && (
                                        <div className="bg-gray-50 rounded-lg px-3 py-2">
                                            <p className="text-xs text-gray-500">CGPA Submitted</p>
                                            <p className="text-sm font-medium text-gray-900">{app.studentCGPA}</p>
                                        </div>
                                    )}
                                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                                        <p className="text-xs text-gray-500">Stage</p>
                                        <p className="text-sm font-medium text-gray-900">{app.workflowStage || '—'}</p>
                                    </div>
                                </div>

                                {/* Skills tags */}
                                {app.studentSkills && app.studentSkills.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                        {app.studentSkills.slice(0, 5).map((skill) => (
                                            <span key={skill} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                                                {skill}
                                            </span>
                                        ))}
                                        {app.studentSkills.length > 5 && (
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                                                +{app.studentSkills.length - 5} more
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Bottom row — actions */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-gray-100">
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                        {app.resumeUrl && (
                                            <span className="inline-flex items-center gap-1 text-green-600">
                                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                Resume attached
                                            </span>
                                        )}
                                        {app.coverLetter && (
                                            <span className="inline-flex items-center gap-1 text-green-600">
                                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                Cover letter
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Link
                                            to={`/student/jobs/${app.jobId}`}
                                            className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                        >
                                            View Job
                                        </Link>
                                        <button
                                            onClick={() => openJobDesc(app.jobId)}
                                            className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors inline-flex items-center gap-1"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Job Description
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Job Description Modal */}
            {jobDescModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[80vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
                            <h3 className="text-lg font-semibold text-gray-900">Job Description</h3>
                            <button
                                onClick={() => setJobDescModal(null)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="overflow-y-auto flex-1 p-6">
                            {loadingJob ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                                </div>
                            ) : jobDescModal.notFound ? (
                                <p className="text-center text-gray-500 py-8">Job posting not found or has been removed.</p>
                            ) : jobDescModal.error ? (
                                <p className="text-center text-red-500 py-8">Failed to load job details.</p>
                            ) : (
                                <div className="space-y-5">
                                    {/* Title & Company */}
                                    <div>
                                        <h4 className="text-xl font-bold text-gray-900">{jobDescModal.title}</h4>
                                        <p className="text-gray-600 mt-1">{jobDescModal.companyName}</p>
                                        <div className="flex flex-wrap items-center gap-2 mt-3">
                                            {jobDescModal.jobType && (
                                                <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                                    {JOB_TYPE_LABELS[jobDescModal.jobType] || jobDescModal.jobType}
                                                </span>
                                            )}
                                            {jobDescModal.location && (
                                                <span className="text-sm text-gray-500 flex items-center gap-1">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    {jobDescModal.location}
                                                </span>
                                            )}
                                            {jobDescModal.salary?.amount && (
                                                <span className="text-sm text-green-600 font-medium">{jobDescModal.salary.amount}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Role Overview */}
                                    {jobDescModal.description?.roleOverview && (
                                        <div>
                                            <h5 className="text-sm font-semibold text-gray-800 mb-1.5">Role Overview</h5>
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{jobDescModal.description.roleOverview}</p>
                                        </div>
                                    )}

                                    {/* Responsibilities */}
                                    {jobDescModal.description?.responsibilities && (
                                        <div>
                                            <h5 className="text-sm font-semibold text-gray-800 mb-1.5">Key Responsibilities</h5>
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{jobDescModal.description.responsibilities}</p>
                                        </div>
                                    )}

                                    {/* Required Skills */}
                                    {jobDescModal.description?.requiredSkills && (
                                        <div>
                                            <h5 className="text-sm font-semibold text-gray-800 mb-1.5">Required Skills</h5>
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{jobDescModal.description.requiredSkills}</p>
                                        </div>
                                    )}

                                    {/* Preferred Skills */}
                                    {jobDescModal.description?.preferredSkills && (
                                        <div>
                                            <h5 className="text-sm font-semibold text-gray-800 mb-1.5">Preferred Skills</h5>
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{jobDescModal.description.preferredSkills}</p>
                                        </div>
                                    )}

                                    {/* Technologies */}
                                    {jobDescModal.description?.technologies && (
                                        <div>
                                            <h5 className="text-sm font-semibold text-gray-800 mb-1.5">Technologies</h5>
                                            <p className="text-sm text-gray-700">{jobDescModal.description.technologies}</p>
                                        </div>
                                    )}

                                    {/* Eligibility */}
                                    {(jobDescModal.eligibility?.minCGPA > 0 || jobDescModal.eligibility?.branches?.length > 0) && (
                                        <div>
                                            <h5 className="text-sm font-semibold text-gray-800 mb-1.5">Eligibility</h5>
                                            <div className="space-y-1 text-sm text-gray-700">
                                                {jobDescModal.eligibility.minCGPA > 0 && (
                                                    <p>Min CGPA: <span className="font-medium">{jobDescModal.eligibility.minCGPA}</span></p>
                                                )}
                                                {jobDescModal.eligibility.branches?.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {jobDescModal.eligibility.branches.map((b) => (
                                                            <span key={b} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">{b}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Selection Process */}
                                    {jobDescModal.applicationSettings?.selectionProcess?.length > 0 && (
                                        <div>
                                            <h5 className="text-sm font-semibold text-gray-800 mb-1.5">Selection Process</h5>
                                            <div className="flex flex-wrap gap-1.5">
                                                {jobDescModal.applicationSettings.selectionProcess.map((step, i) => (
                                                    <span key={step} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                                                        <span className="w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                                                        {step}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Attachments */}
                                    {(jobDescModal.attachments?.jobDescriptionPDF || jobDescModal.attachments?.companyBrochure) && (
                                        <div>
                                            <h5 className="text-sm font-semibold text-gray-800 mb-1.5">Attachments</h5>
                                            <div className="space-y-2">
                                                {jobDescModal.attachments.jobDescriptionPDF && (
                                                    <a href={jobDescModal.attachments.jobDescriptionPDF} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm text-gray-700">
                                                        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
                                                        Job Description PDF
                                                    </a>
                                                )}
                                                {jobDescModal.attachments.companyBrochure && (
                                                    <a href={jobDescModal.attachments.companyBrochure} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm text-gray-700">
                                                        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
                                                        Company Brochure
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="border-t border-gray-200 px-6 py-3 bg-gray-50 rounded-b-2xl flex justify-end flex-shrink-0">
                            <button
                                onClick={() => setJobDescModal(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Applications;
