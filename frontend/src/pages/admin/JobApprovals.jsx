import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '@config/firebase';
import {
    ArrowLeftIcon,
    BriefcaseIcon,
    CheckIcon,
    XMarkIcon,
    ClockIcon,
    MagnifyingGlassIcon,
    EyeIcon,
    MapPinIcon,
    CurrencyDollarIcon,
    CalendarIcon,
    BuildingOfficeIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { JOB_TYPE_LABELS, COLLECTIONS } from '@config/constants';
import { createJobApprovedNotification, createNewJobNotification } from '@services/notificationService';
import { sendJobApprovedEmail, sendNewJobEmailToStudent } from '@services/emailService';

const JobApprovals = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState(null);
    const [selectedJob, setSelectedJob] = useState(null);

    // Fetch pending jobs (not admin approved)
    useEffect(() => {
        const fetchPendingJobs = async () => {
            try {
                // Simplified query to avoid composite index requirement
                const jobsQuery = query(
                    collection(db, 'jobs'),
                    where('isAdminApproved', '==', false)
                );
                const jobsSnapshot = await getDocs(jobsQuery);
                const jobsList = [];

                // Fetch recruiter details for each job
                const recruiterIds = new Set();
                jobsSnapshot.forEach((doc) => {
                    const jobData = doc.data();
                    if (jobData.recruiterId) {
                        recruiterIds.add(jobData.recruiterId);
                    }
                });

                // Get recruiter details
                const recruitersMap = {};
                if (recruiterIds.size > 0) {
                    const recruitersSnapshot = await getDocs(collection(db, 'recruiters'));
                    recruitersSnapshot.forEach((doc) => {
                        if (recruiterIds.has(doc.id)) {
                            recruitersMap[doc.id] = doc.data();
                        }
                    });
                }

                jobsSnapshot.forEach((doc) => {
                    const jobData = doc.data();
                    // Filter only active jobs (not drafts) client-side
                    if (jobData.status === 'active') {
                        const recruiterData = recruitersMap[jobData.recruiterId] || {};
                        jobsList.push({
                            id: doc.id,
                            ...jobData,
                            recruiterName: recruiterData.fullName || 'Unknown',
                            recruiterCompany: recruiterData.companyName || jobData.companyName || 'N/A',
                            recruiterEmail: recruiterData.email || '',
                        });
                    }
                });

                // Sort by createdAt descending (newest first) client-side
                jobsList.sort((a, b) => {
                    const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                    const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                    return bTime - aTime;
                });

                setJobs(jobsList);
            } catch (error) {
                console.error('Error fetching pending jobs:', error);
                toast.error('Failed to load pending jobs');
            } finally {
                setLoading(false);
            }
        };
        fetchPendingJobs();
    }, []);

    const handleApprove = async (jobId, jobTitle) => {
        setActionLoading(jobId);
        try {
            await updateDoc(doc(db, 'jobs', jobId), {
                isAdminApproved: true,
                approvedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            // Find the job to get recruiter info
            const job = jobs.find((j) => j.id === jobId);

            // Notify recruiter: email + in-app notification
            if (job?.recruiterId) {
                createJobApprovedNotification(job.recruiterId, jobId, jobTitle);
                if (job.recruiterEmail) {
                    sendJobApprovedEmail({
                        toEmail: job.recruiterEmail,
                        toName: job.recruiterName || 'Recruiter',
                        jobTitle,
                        companyName: job.recruiterCompany || job.companyName || '',
                    });
                }
            }

            // Notify all verified students about the new job
            try {
                const studentsQuery = query(
                    collection(db, COLLECTIONS.USERS),
                    where('role', '==', 'student'),
                    where('isAdminVerified', '==', true)
                );
                const snapshot = await getDocs(studentsQuery);
                snapshot.forEach((studentDoc) => {
                    const sData = studentDoc.data();
                    createNewJobNotification(studentDoc.id, jobId, jobTitle);
                    if (sData.email) {
                        sendNewJobEmailToStudent({
                            toEmail: sData.email,
                            toName: sData.fullName || 'Student',
                            jobTitle,
                            companyName: job?.recruiterCompany || job?.companyName || '',
                        });
                    }
                });
            } catch (notifErr) {
                console.error('Error notifying students:', notifErr);
            }

            setJobs((prev) => prev.filter((j) => j.id !== jobId));
            toast.success(`"${jobTitle}" has been approved and is now live for students!`, {
                duration: 4000,
                icon: '✅',
            });
        } catch (error) {
            console.error('Error approving job:', error);
            toast.error('Failed to approve job');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (jobId, jobTitle) => {
        if (!confirm(`Are you sure you want to reject "${jobTitle}"? This will set the job status to closed.`)) {
            return;
        }
        setActionLoading(jobId);
        try {
            await updateDoc(doc(db, 'jobs', jobId), {
                status: 'closed',
                isAdminApproved: false,
                rejectedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
            setJobs((prev) => prev.filter((j) => j.id !== jobId));
            toast.success(`"${jobTitle}" has been rejected`);
        } catch (error) {
            console.error('Error rejecting job:', error);
            toast.error('Failed to reject job');
        } finally {
            setActionLoading(null);
        }
    };

    const filteredJobs = jobs.filter((job) => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
            job.title?.toLowerCase().includes(term) ||
            job.companyName?.toLowerCase().includes(term) ||
            job.recruiterName?.toLowerCase().includes(term) ||
            job.location?.toLowerCase().includes(term)
        );
    });

    const pendingCount = jobs.length;

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatSalary = (salary) => {
        if (!salary?.amount) return 'Not specified';
        const amount = parseFloat(salary.amount);
        if (salary.type === 'yearly') {
            return `₹${(amount / 100000).toFixed(2)} LPA`;
        } else if (salary.type === 'monthly') {
            return `₹${amount.toLocaleString()}/month`;
        } else if (salary.type === 'stipend') {
            return `₹${amount.toLocaleString()} stipend`;
        }
        return `₹${amount.toLocaleString()}`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto" />
                    <p className="mt-4 text-gray-600">Loading pending job requests...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link
                        to="/admin/dashboard"
                        className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <BriefcaseIcon className="w-7 h-7 text-purple-600" />
                            Job Approval Requests
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Review and approve job postings from recruiters
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                        <span className="text-sm font-semibold text-amber-700">
                            {pendingCount} Pending
                        </span>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search by job title, company, recruiter, or location..."
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all text-sm bg-white shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                    <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Jobs List */}
            {filteredJobs.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckBadgeIcon className="w-10 h-10 text-green-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {searchTerm ? 'No matching jobs found' : 'All caught up!'}
                    </h3>
                    <p className="text-gray-500 text-sm">
                        {searchTerm
                            ? 'Try adjusting your search terms'
                            : 'No pending job approval requests at the moment'}
                    </p>
                </div>
            ) : (
                <div className="grid gap-5">
                    {filteredJobs.map((job) => (
                        <div
                            key={job.id}
                            className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden"
                        >
                            {/* Job Header */}
                            <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 px-6 py-4 border-b border-gray-100">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-lg font-bold text-gray-900">{job.title}</h3>
                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                                                <ClockIcon className="w-3 h-3 inline mr-1" />
                                                Pending Approval
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-gray-600">
                                            <span className="flex items-center gap-1">
                                                <BuildingOfficeIcon className="w-4 h-4" />
                                                {job.companyName}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <MapPinIcon className="w-4 h-4" />
                                                {job.location || 'Remote'}
                                            </span>
                                            {job.jobType && (
                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">
                                                    {JOB_TYPE_LABELS[job.jobType] || job.jobType}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedJob(job)}
                                        className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                                    >
                                        <EyeIcon className="w-5 h-5 text-gray-600" />
                                    </button>
                                </div>
                            </div>

                            {/* Job Details */}
                            <div className="px-6 py-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div className="flex items-center gap-2 text-sm">
                                        <CurrencyDollarIcon className="w-4 h-4 text-gray-400" />
                                        <span className="text-gray-600">Salary:</span>
                                        <span className="font-semibold text-gray-900">
                                            {formatSalary(job.salary)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <UserGroupIcon className="w-4 h-4 text-gray-400" />
                                        <span className="text-gray-600">Openings:</span>
                                        <span className="font-semibold text-gray-900">{job.openings || 1}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <CalendarIcon className="w-4 h-4 text-gray-400" />
                                        <span className="text-gray-600">Posted:</span>
                                        <span className="font-semibold text-gray-900">
                                            {formatDate(job.createdAt)}
                                        </span>
                                    </div>
                                </div>

                                {/* Recruiter Info */}
                                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                                    <p className="text-xs text-gray-500 mb-1">Posted by</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                                            <span className="text-sm font-semibold text-purple-600">
                                                {job.recruiterName.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">
                                                {job.recruiterName}
                                            </p>
                                            <p className="text-xs text-gray-500">{job.recruiterEmail}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Role Overview */}
                                {job.description?.roleOverview && (
                                    <div className="mb-4">
                                        <p className="text-sm text-gray-600 line-clamp-2">
                                            {job.description.roleOverview}
                                        </p>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleApprove(job.id, job.title)}
                                        disabled={actionLoading === job.id}
                                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition-all shadow-sm"
                                    >
                                        {actionLoading === job.id ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                        ) : (
                                            <>
                                                <CheckIcon className="w-5 h-5" />
                                                Approve & Publish
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleReject(job.id, job.title)}
                                        disabled={actionLoading === job.id}
                                        className="px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 disabled:opacity-50 transition-colors"
                                    >
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Job Details Modal */}
            {selectedJob && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedJob(null)}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="relative h-24 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600">
                            <button
                                onClick={() => setSelectedJob(null)}
                                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/15 backdrop-blur-sm hover:bg-white/30 flex items-center justify-center transition-colors"
                            >
                                <XMarkIcon className="w-5 h-5 text-white" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="px-6 py-6 overflow-y-auto max-h-[calc(85vh-6rem)]">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedJob.title}</h2>
                            <div className="flex flex-wrap items-center gap-3 mb-4">
                                <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                                    <BuildingOfficeIcon className="w-4 h-4" />
                                    {selectedJob.companyName}
                                </span>
                                <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                                    <MapPinIcon className="w-4 h-4" />
                                    {selectedJob.location || 'Remote'}
                                </span>
                                {selectedJob.jobType && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">
                                        {JOB_TYPE_LABELS[selectedJob.jobType] || selectedJob.jobType}
                                    </span>
                                )}
                            </div>

                            <hr className="my-4 border-gray-200" />

                            {/* Role Overview */}
                            {selectedJob.description?.roleOverview && (
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Role Overview</h3>
                                    <p className="text-sm text-gray-600">{selectedJob.description.roleOverview}</p>
                                </div>
                            )}

                            {/* Responsibilities */}
                            {selectedJob.description?.responsibilities && (
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Responsibilities</h3>
                                    <p className="text-sm text-gray-600 whitespace-pre-line">
                                        {selectedJob.description.responsibilities}
                                    </p>
                                </div>
                            )}

                            {/* Skills */}
                            {selectedJob.description?.requiredSkills && (
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Required Skills</h3>
                                    <p className="text-sm text-gray-600 whitespace-pre-line">
                                        {selectedJob.description.requiredSkills}
                                    </p>
                                </div>
                            )}

                            {/* Eligibility */}
                            {selectedJob.eligibility && (
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Eligibility</h3>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        {selectedJob.eligibility.minCGPA && (
                                            <div>
                                                <span className="text-gray-500">Min CGPA:</span>{' '}
                                                <span className="font-medium text-gray-900">
                                                    {selectedJob.eligibility.minCGPA}
                                                </span>
                                            </div>
                                        )}
                                        {selectedJob.eligibility.branches?.length > 0 && (
                                            <div>
                                                <span className="text-gray-500">Branches:</span>{' '}
                                                <span className="font-medium text-gray-900">
                                                    {selectedJob.eligibility.branches.join(', ')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Salary */}
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold text-gray-900 mb-2">Compensation</h3>
                                <p className="text-lg font-bold text-green-600">{formatSalary(selectedJob.salary)}</p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        handleApprove(selectedJob.id, selectedJob.title);
                                        setSelectedJob(null);
                                    }}
                                    disabled={actionLoading === selectedJob.id}
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition-all"
                                >
                                    {actionLoading === selectedJob.id ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                    ) : (
                                        <>
                                            <CheckIcon className="w-5 h-5" />
                                            Approve & Publish
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        handleReject(selectedJob.id, selectedJob.title);
                                        setSelectedJob(null);
                                    }}
                                    disabled={actionLoading === selectedJob.id}
                                    className="px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 disabled:opacity-50 transition-colors"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobApprovals;
