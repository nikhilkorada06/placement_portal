import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs, doc, deleteDoc, updateDoc, serverTimestamp, onSnapshot, writeBatch, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '@config/firebase';
import { COLLECTIONS, JOB_TYPE_LABELS, STATUS_LABELS, STATUS_COLORS, APPLICATION_STATUS } from '@config/constants';
import { useAuth } from '@context/AuthContext';
import { createApplicationStatusNotification } from '@services/notificationService';
import { sendApplicationStatusEmail } from '@services/emailService';

const ManageJobs = () => {
    const navigate = useNavigate();
    const { user, userProfile } = useAuth();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ open: false, job: null });
    const [deleting, setDeleting] = useState(false);
    const [filter, setFilter] = useState('all'); // all, active, draft, closed, recruitment_completed
    const [editModal, setEditModal] = useState({ open: false, job: null });
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);

    // Applicants view state
    const [selectedJob, setSelectedJob] = useState(null);
    const [applicants, setApplicants] = useState([]);
    const [loadingApplicants, setLoadingApplicants] = useState(false);
    const [selectedApplicant, setSelectedApplicant] = useState(null);

    // Shortlisting mode state
    const [shortlistMode, setShortlistMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [shortlisting, setShortlisting] = useState(false);
    const [showShortlistWarning, setShowShortlistWarning] = useState(false);

    // Final selection mode state (for placing students after shortlisting)
    const [showShortlistedView, setShowShortlistedView] = useState(false);
    const [finalSelectionMode, setFinalSelectionMode] = useState(false);
    const [finalSelectedIds, setFinalSelectedIds] = useState(new Set());
    const [completingRecruitment, setCompletingRecruitment] = useState(false);
    const [showFinalPlacementWarning, setShowFinalPlacementWarning] = useState(false);

    // Real-time application counts per job
    const [appCounts, setAppCounts] = useState({});
    const appCountUnsubRef = useRef(null);

    // Redirect if not a recruiter
    useEffect(() => {
        if (userProfile && userProfile.role !== 'recruiter') {
            navigate('/dashboard');
        }
    }, [userProfile, navigate]);

    // Subscribe to recruiter's jobs in real-time
    useEffect(() => {
        if (!user?.uid) return;

        setLoading(true);
        setError(null);

        const q = query(
            collection(db, COLLECTIONS.JOBS),
            where('recruiterId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubJobs = onSnapshot(q, (snapshot) => {
            const jobsData = snapshot.docs.map((d) => ({
                id: d.id,
                ...d.data(),
            }));
            setJobs(jobsData);
            setLoading(false);
        }, (err) => {
            console.error('Error subscribing to jobs:', err);
            setError('Failed to load jobs. Please try again.');
            setLoading(false);
        });

        return () => unsubJobs();
    }, [user?.uid]);

    // Subscribe to real-time application counts whenever jobs change
    useEffect(() => {
        if (appCountUnsubRef.current) {
            appCountUnsubRef.current();
            appCountUnsubRef.current = null;
        }

        const jobIds = jobs.map(j => j.id);
        if (jobIds.length === 0) {
            setAppCounts({});
            return;
        }

        // Firestore 'in' queries limited to 30
        const chunks = [];
        for (let i = 0; i < jobIds.length; i += 30) {
            chunks.push(jobIds.slice(i, i + 30));
        }

        const unsubscribes = [];
        const allCounts = {};

        chunks.forEach((chunk) => {
            const q = query(
                collection(db, COLLECTIONS.APPLICATIONS),
                where('jobId', 'in', chunk)
            );

            const unsub = onSnapshot(q, (snapshot) => {
                // Reset counts for this chunk's jobs
                chunk.forEach(jid => { allCounts[jid] = { total: 0, shortlisted: 0, interview_scheduled: 0, selected: 0, rejected: 0, applied: 0 }; });

                snapshot.docs.forEach((d) => {
                    const data = d.data();
                    const jid = data.jobId;
                    if (allCounts[jid]) {
                        allCounts[jid].total++;
                        if (data.status && allCounts[jid][data.status] !== undefined) {
                            allCounts[jid][data.status]++;
                        }
                    }
                });

                setAppCounts(prev => ({ ...prev, ...allCounts }));
            });

            unsubscribes.push(unsub);
        });

        appCountUnsubRef.current = () => unsubscribes.forEach(u => u());

        return () => {
            if (appCountUnsubRef.current) {
                appCountUnsubRef.current();
            }
        };
    }, [jobs]);

    // Filter jobs based on status
    const filteredJobs = jobs.filter((job) => {
        if (filter === 'all') return true;
        return job.status === filter;
    });

    // Delete job handler
    const handleDelete = async () => {
        if (!deleteModal.job) return;

        try {
            setDeleting(true);
            await deleteDoc(doc(db, COLLECTIONS.JOBS, deleteModal.job.id));
            setJobs((prev) => prev.filter((j) => j.id !== deleteModal.job.id));
            setDeleteModal({ open: false, job: null });
        } catch (err) {
            console.error('Error deleting job:', err);
            setError('Failed to delete job. Please try again.');
        } finally {
            setDeleting(false);
        }
    };

    // Toggle job status (active/closed)
    const toggleJobStatus = async (job) => {
        const newStatus = job.status === 'active' ? 'closed' : 'active';
        try {
            await updateDoc(doc(db, COLLECTIONS.JOBS, job.id), {
                status: newStatus,
                updatedAt: serverTimestamp(),
            });
            setJobs((prev) =>
                prev.map((j) => (j.id === job.id ? { ...j, status: newStatus } : j))
            );
        } catch (err) {
            console.error('Error updating job status:', err);
            setError('Failed to update job status.');
        }
    };

    // Open edit modal
    const openEditModal = (job) => {
        setEditForm({
            title: job.title || '',
            location: job.location || '',
            openings: job.openings || 1,
            deadline: job.applicationSettings?.deadline || '',
            salaryAmount: job.salary?.amount || '',
        });
        setEditModal({ open: true, job });
    };

    // Save edit
    const handleSaveEdit = async () => {
        if (!editModal.job) return;

        try {
            setSaving(true);
            await updateDoc(doc(db, COLLECTIONS.JOBS, editModal.job.id), {
                title: editForm.title,
                location: editForm.location,
                openings: parseInt(editForm.openings, 10) || 1,
                'applicationSettings.deadline': editForm.deadline,
                'salary.amount': editForm.salaryAmount,
                updatedAt: serverTimestamp(),
            });

            setJobs((prev) =>
                prev.map((j) =>
                    j.id === editModal.job.id
                        ? {
                            ...j,
                            title: editForm.title,
                            location: editForm.location,
                            openings: parseInt(editForm.openings, 10) || 1,
                            applicationSettings: {
                                ...j.applicationSettings,
                                deadline: editForm.deadline,
                            },
                            salary: { ...j.salary, amount: editForm.salaryAmount },
                        }
                        : j
                )
            );

            setEditModal({ open: false, job: null });
        } catch (err) {
            console.error('Error updating job:', err);
            setError('Failed to update job. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    // View applicants for a job (real-time)
    const applicantUnsubRef = useRef(null);

    const viewApplicants = (job) => {
        setSelectedJob(job);
        setLoadingApplicants(true);

        // Clean up previous listener
        if (applicantUnsubRef.current) {
            applicantUnsubRef.current();
        }

        const q = query(
            collection(db, COLLECTIONS.APPLICATIONS),
            where('jobId', '==', job.id)
        );

        applicantUnsubRef.current = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            data.sort((a, b) => {
                const aTime = a.appliedAt?.toDate?.() || a.createdAt?.toDate?.() || new Date(a.appliedAt || a.createdAt || 0);
                const bTime = b.appliedAt?.toDate?.() || b.createdAt?.toDate?.() || new Date(b.appliedAt || b.createdAt || 0);
                return bTime - aTime;
            });
            setApplicants(data);
            setLoadingApplicants(false);
        }, (err) => {
            console.error('Error subscribing to applicants:', err);
            setLoadingApplicants(false);
        });
    };

    // Go back to jobs list
    const backToJobs = () => {
        if (applicantUnsubRef.current) {
            applicantUnsubRef.current();
            applicantUnsubRef.current = null;
        }
        setSelectedJob(null);
        setApplicants([]);
        setSelectedApplicant(null);
        setShortlistMode(false);
        setSelectedIds(new Set());
    };

    // Toggle shortlisting mode
    const toggleShortlistMode = () => {
        setShortlistMode((prev) => !prev);
        setSelectedIds(new Set());
    };

    // Toggle single applicant selection
    const toggleSelectApplicant = (appId) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(appId)) {
                next.delete(appId);
            } else {
                next.add(appId);
            }
            return next;
        });
    };

    // Select / deselect all applicants
    const eligibleForShortlist = applicants;
    const allEligibleSelected = eligibleForShortlist.length > 0 && eligibleForShortlist.every(a => selectedIds.has(a.id));

    const toggleSelectAll = () => {
        if (allEligibleSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(eligibleForShortlist.map(a => a.id)));
        }
    };

    // Unselected applicants (will be rejected)
    const unselectedApplicants = applicants.filter(a => !selectedIds.has(a.id));

    // Show confirmation warning before shortlisting
    const requestBatchShortlist = () => {
        if (selectedIds.size === 0) {
            setShortlistMode(false);
            return;
        }
        setShowShortlistWarning(true);
    };

    // Batch shortlist selected & reject unselected applicants
    const handleBatchShortlist = async () => {
        setShowShortlistWarning(false);

        try {
            setShortlisting(true);
            const batch = writeBatch(db);

            // Shortlist selected applicants
            for (const appId of selectedIds) {
                const appRef = doc(db, COLLECTIONS.APPLICATIONS, appId);
                const appDoc = await getDoc(appRef);
                if (appDoc.exists()) {
                    const currentData = appDoc.data();
                    const statusHistory = currentData.statusHistory || [];
                    batch.update(appRef, {
                        status: APPLICATION_STATUS.SHORTLISTED,
                        statusHistory: [
                            ...statusHistory,
                            {
                                status: APPLICATION_STATUS.SHORTLISTED,
                                timestamp: Timestamp.now(),
                                note: 'Shortlisted by recruiter',
                            },
                        ],
                        updatedAt: Timestamp.now(),
                    });
                }
            }

            // Reject all unselected applicants
            for (const applicant of unselectedApplicants) {
                const appRef = doc(db, COLLECTIONS.APPLICATIONS, applicant.id);
                const appDoc = await getDoc(appRef);
                if (appDoc.exists()) {
                    const currentData = appDoc.data();
                    const statusHistory = currentData.statusHistory || [];
                    batch.update(appRef, {
                        status: APPLICATION_STATUS.REJECTED,
                        statusHistory: [
                            ...statusHistory,
                            {
                                status: APPLICATION_STATUS.REJECTED,
                                timestamp: Timestamp.now(),
                                note: 'Automatically rejected — not shortlisted',
                            },
                        ],
                        updatedAt: Timestamp.now(),
                    });
                }
            }

            await batch.commit();

            // Send email & notification to shortlisted students
            for (const appId of selectedIds) {
                const app = applicants.find((a) => a.id === appId);
                if (app?.studentId) {
                    createApplicationStatusNotification(
                        app.studentId,
                        appId,
                        selectedJob?.title || 'a job',
                        'shortlisted'
                    );
                    if (app.studentEmail) {
                        sendApplicationStatusEmail({
                            toEmail: app.studentEmail,
                            toName: app.studentName || 'Student',
                            jobTitle: selectedJob?.title || '',
                            status: 'shortlisted',
                            companyName: selectedJob?.companyName || '',
                        });
                    }
                }
            }

            // Close the job — mark recruitment as completed
            if (selectedJob?.id) {
                await updateDoc(doc(db, COLLECTIONS.JOBS, selectedJob.id), {
                    status: 'recruitment_completed',
                    updatedAt: serverTimestamp(),
                });
                setJobs((prev) =>
                    prev.map((j) => (j.id === selectedJob.id ? { ...j, status: 'recruitment_completed' } : j))
                );
            }

            setSelectedIds(new Set());
            setShortlistMode(false);
        } catch (err) {
            console.error('Error batch shortlisting:', err);
            setError('Failed to shortlist applicants. Please try again.');
        } finally {
            setShortlisting(false);
        }
    };

    // Toggle final selection mode for placing students
    const toggleFinalSelectionMode = () => {
        setFinalSelectionMode((prev) => !prev);
        setFinalSelectedIds(new Set());
    };

    // Toggle single applicant selection for final placement
    const toggleFinalSelectApplicant = (appId) => {
        setFinalSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(appId)) {
                next.delete(appId);
            } else {
                next.add(appId);
            }
            return next;
        });
    };

    // Show confirmation before final placement
    const requestFinalPlacement = () => {
        if (finalSelectedIds.size === 0) {
            setFinalSelectionMode(false);
            return;
        }
        setShowFinalPlacementWarning(true);
    };

    // Complete recruitment - mark selected students as placed with package amount
    const handleFinalPlacement = async () => {
        setShowFinalPlacementWarning(false);

        try {
            setCompletingRecruitment(true);
            const batch = writeBatch(db);
            
            // Get the job's salary amount as the package
            const packageAmount = selectedJob?.salary?.amount || 0;
            const salaryType = selectedJob?.salary?.type || 'yearly';

            // Mark selected applicants as placed
            for (const appId of finalSelectedIds) {
                const appRef = doc(db, COLLECTIONS.APPLICATIONS, appId);
                const appDoc = await getDoc(appRef);
                if (appDoc.exists()) {
                    const currentData = appDoc.data();
                    const statusHistory = currentData.statusHistory || [];
                    batch.update(appRef, {
                        status: 'placed',
                        statusHistory: [
                            ...statusHistory,
                            {
                                status: 'placed',
                                timestamp: Timestamp.now(),
                                note: 'Selected for final placement',
                            },
                        ],
                        packageAmount: packageAmount,
                        packageType: salaryType,
                        placedAt: Timestamp.now(),
                        updatedAt: Timestamp.now(),
                    });
                }
            }

            await batch.commit();

            // Send email & notification to placed students
            for (const appId of finalSelectedIds) {
                const app = applicants.find((a) => a.id === appId);
                if (app?.studentId) {
                    createApplicationStatusNotification(
                        app.studentId,
                        appId,
                        selectedJob?.title || 'a job',
                        'placed'
                    );
                    if (app.studentEmail) {
                        sendApplicationStatusEmail({
                            toEmail: app.studentEmail,
                            toName: app.studentName || 'Student',
                            jobTitle: selectedJob?.title || '',
                            status: 'placed',
                            companyName: selectedJob?.companyName || '',
                        });
                    }
                }
            }

            // Update job status to placement_completed
            if (selectedJob?.id) {
                const jobRef = doc(db, COLLECTIONS.JOBS, selectedJob.id);
                await updateDoc(jobRef, {
                    status: 'placement_completed',
                    updatedAt: serverTimestamp(),
                });
            }

            // Refresh applicants list
            if (selectedJob?.id) {
                const appsQuery = query(
                    collection(db, COLLECTIONS.APPLICATIONS),
                    where('jobId', '==', selectedJob.id)
                );
                const snapshot = await getDocs(appsQuery);
                const updatedApplicants = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setApplicants(updatedApplicants);
            }

            setFinalSelectedIds(new Set());
            setFinalSelectionMode(false);
            setShowShortlistedView(false);
            setSelectedJob(null);
            setError(null);
        } catch (err) {
            console.error('Error completing final placement:', err);
            setError('Failed to complete placement. Please try again.');
        } finally {
            setCompletingRecruitment(false);
        }
    };

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

    // Status badge
    const StatusBadge = ({ status }) => {
        const styles = {
            active: 'bg-green-100 text-green-800',
            draft: 'bg-yellow-100 text-yellow-800',
            closed: 'bg-gray-100 text-gray-800',
            recruitment_completed: 'bg-purple-100 text-purple-800',
            placement_completed: 'bg-emerald-100 text-emerald-800',
        };
        const labels = {
            active: 'Active',
            draft: 'Draft',
            closed: 'Closed',
            recruitment_completed: 'Shortlisting Completed',
            placement_completed: 'Placement Completed',
        };
        return (
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
                {labels[status] || status?.charAt(0).toUpperCase() + status?.slice(1) || 'Draft'}
            </span>
        );
    };

    if (!userProfile) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div>
            {/* Page Header */}
            {!selectedJob ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Manage Jobs</h1>
                        <p className="text-gray-600 mt-1">View, edit, and manage your job postings</p>
                    </div>
                    <Link
                        to="/recruiter/post-job"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Post New Job
                    </Link>
                </div>
            ) : (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={backToJobs}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Applicants</h1>
                            <p className="text-gray-600 mt-0.5">
                                {selectedJob.title} &middot;{' '}
                                <span className="font-medium text-blue-600">{applicants.length} applicant{applicants.length !== 1 ? 's' : ''}</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Shortlisting Mode Toggle */}
                        {applicants.length > 0 && (
                            selectedJob?.status === 'placement_completed' ? (
                                <button
                                    disabled
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-100 text-emerald-700 border border-emerald-300 cursor-not-allowed"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                    </svg>
                                    Placement Completed
                                </button>
                            ) : selectedJob?.status === 'recruitment_completed' ? (
                                <>
                                    <button
                                        disabled
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-500 border border-gray-300 cursor-not-allowed"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Shortlisting Completed
                                    </button>
                                    
                                    {/* Show Shortlisted Students Button */}
                                    {appCounts[selectedJob.id]?.shortlisted > 0 && (
                                        <button
                                            onClick={() => setShowShortlistedView((prev) => !prev)}
                                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                                showShortlistedView
                                                    ? 'bg-blue-100 text-blue-800 border-2 border-blue-400 shadow-sm'
                                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                            }`}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            {showShortlistedView ? 'Show All Applicants' : 'Show Shortlisted Students'}
                                        </button>
                                    )}
                                </>
                            ) : (
                                <button
                                    onClick={toggleShortlistMode}
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                        shortlistMode
                                            ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-400 shadow-sm'
                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    {shortlistMode ? (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                            Exit Shortlisting Mode
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                            </svg>
                                            Enable Shortlisting Mode
                                        </>
                                    )}
                                </button>
                            )
                        )}
                        <StatusBadge status={selectedJob.status} />
                    </div>
                </div>
            )}

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
                    <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </button>
                </div>
            )}

            {!selectedJob ? (
            <>
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 mr-2">Filter:</span>
                    {['all', 'active', 'draft', 'closed', 'recruitment_completed', 'placement_completed'].map((status) => {
                        const filterLabels = { all: 'All', active: 'Active', draft: 'Draft', closed: 'Closed', recruitment_completed: 'Shortlisting Done', placement_completed: 'Placement Done' };
                        return (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === status
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {filterLabels[status]}
                                {status !== 'all' && (
                                    <span className="ml-1.5">
                                        ({jobs.filter((j) => j.status === status).length})
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Jobs List */}
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
                            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No jobs found</h3>
                    <p className="mt-2 text-gray-500">
                        {filter === 'all'
                            ? "You haven't posted any jobs yet."
                            : `No ${filter} jobs found.`}
                    </p>
                    <Link
                        to="/recruiter/post-job"
                        className="inline-flex items-center gap-2 mt-6 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Post Your First Job
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredJobs.map((job) => (
                        <div
                            key={job.id}
                            onClick={() => viewApplicants(job)}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer hover:border-blue-300"
                        >
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                {/* Job Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                                        <StatusBadge status={job.status} />
                                        {/* Admin Approval Status Badge */}
                                        {job.status !== 'draft' && (
                                            job.isAdminApproved ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                    Approved
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                                    <svg className="w-3 h-3 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                    </svg>
                                                    Pending Approval
                                                </span>
                                            )
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                                        <span className="flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                            {job.location || 'Remote'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                                />
                                            </svg>
                                            {JOB_TYPE_LABELS[job.jobType] || job.jobType}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                                />
                                            </svg>
                                            {job.openings || 1} Opening{job.openings > 1 ? 's' : ''}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                />
                                            </svg>
                                            Posted: {formatDate(job.createdAt)}
                                        </span>
                                    </div>
                                    {job.salary?.amount && (
                                        <p className="mt-2 text-sm text-green-600 font-medium">
                                            💰 {job.salary.amount}
                                            {job.salary.type === 'yearly' ? '/year' : job.salary.type === 'monthly' ? '/month' : ''}
                                        </p>
                                    )}
                                </div>

                                {/* Stats */}
                                <div className="flex items-center gap-6 text-center">
                                    <div>
                                        <p className="text-2xl font-bold text-blue-600">
                                            {appCounts[job.id]?.total ?? job.applicationsCount ?? 0}
                                        </p>
                                        <p className="text-xs text-gray-500">Applications</p>
                                    </div>
                                    {(appCounts[job.id]?.shortlisted > 0 || appCounts[job.id]?.selected > 0) && (
                                        <div className="flex items-center gap-3">
                                            {appCounts[job.id]?.shortlisted > 0 && (
                                                <div>
                                                    <p className="text-lg font-bold text-yellow-600">{appCounts[job.id].shortlisted}</p>
                                                    <p className="text-xs text-gray-500">Shortlisted</p>
                                                </div>
                                            )}
                                            {appCounts[job.id]?.selected > 0 && (
                                                <div>
                                                    <p className="text-lg font-bold text-green-600">{appCounts[job.id].selected}</p>
                                                    <p className="text-xs text-gray-500">Selected</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm text-gray-600">
                                            Deadline: {job.applicationSettings?.deadline || 'Not set'}
                                        </p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openEditModal(job);
                                        }}
                                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Edit Job"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                            />
                                        </svg>
                                    </button>
                                    {job.status === 'recruitment_completed' ? (
                                        <span
                                            className="p-2 text-purple-400 cursor-not-allowed rounded-lg"
                                            title="Shortlisting completed — cannot toggle status"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        </span>
                                    ) : (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleJobStatus(job);
                                            }}
                                            className={`p-2 rounded-lg transition-colors ${job.status === 'active'
                                                    ? 'text-yellow-600 hover:bg-yellow-50'
                                                    : 'text-green-600 hover:bg-green-50'
                                                }`}
                                            title={job.status === 'active' ? 'Close Job' : 'Activate Job'}
                                        >
                                            {job.status === 'active' ? (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                    />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                                    />
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                    />
                                                </svg>
                                            )}
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteModal({ open: true, job });
                                        }}
                                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete Job"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            </>
            ) : (
                /* Applicants List View */
                loadingApplicants ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
                    </div>
                ) : applicants.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <h3 className="mt-4 text-lg font-medium text-gray-900">No applicants yet</h3>
                        <p className="mt-2 text-gray-500">No one has applied to this job yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Shortlisting mode banner & select all */}
                        {shortlistMode && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-yellow-200 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-yellow-800">Shortlisting Mode Active</p>
                                        <p className="text-xs text-yellow-700">
                                            Select applicants to shortlist. Click on any applicant to view details.
                                        </p>
                                    </div>
                                </div>
                                {eligibleForShortlist.length > 0 && (
                                    <button
                                        onClick={toggleSelectAll}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-yellow-300 rounded-lg text-sm font-medium text-yellow-800 hover:bg-yellow-100 transition-colors whitespace-nowrap"
                                    >
                                        <span className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                            allEligibleSelected ? 'bg-yellow-500 border-yellow-500' : 'border-yellow-400 bg-white'
                                        }`}>
                                            {allEligibleSelected && (
                                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </span>
                                        {allEligibleSelected ? 'Deselect All' : `Select All (${eligibleForShortlist.length})`}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Final Selection Mode Banner for Shortlisted Students */}
                        {showShortlistedView && !shortlistMode && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-200 rounded-lg flex items-center justify-center">
                                            <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-blue-800">
                                                Shortlisted Students ({applicants.filter(a => a.status === APPLICATION_STATUS.SHORTLISTED).length})
                                            </p>
                                            <p className="text-xs text-blue-700">
                                                {finalSelectionMode 
                                                    ? 'Select students to mark as placed with package offer.'
                                                    : 'Enable selection mode to complete final recruitment process.'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {finalSelectionMode && finalSelectedIds.size > 0 && (
                                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                                {finalSelectedIds.size} selected
                                            </span>
                                        )}
                                        {!finalSelectionMode ? (
                                            <button
                                                onClick={toggleFinalSelectionMode}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                                </svg>
                                                Enable Selection Mode
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={toggleFinalSelectionMode}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={requestFinalPlacement}
                                                    disabled={finalSelectedIds.size === 0 || completingRecruitment}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {completingRecruitment ? (
                                                        <>
                                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                            Processing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            Complete Recruitment
                                                        </>
                                                    )}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Filter applicants based on view mode */}
                        {(() => {
                            const displayApplicants = showShortlistedView 
                                ? applicants.filter(a => a.status === APPLICATION_STATUS.SHORTLISTED)
                                : applicants;

                            if (displayApplicants.length === 0 && showShortlistedView) {
                                return (
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                                        <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        <h3 className="mt-4 text-lg font-medium text-gray-900">No shortlisted students</h3>
                                        <p className="mt-2 text-gray-500">No students have been shortlisted yet.</p>
                                    </div>
                                );
                            }

                            return displayApplicants.map((app) => {
                                const isSelected = shortlistMode ? selectedIds.has(app.id) : finalSelectionMode ? finalSelectedIds.has(app.id) : false;
                                const showCheckbox = shortlistMode || finalSelectionMode;

                            return (
                                <div
                                    key={app.id}
                                    className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-all cursor-pointer ${
                                        showCheckbox && isSelected
                                            ? shortlistMode 
                                                ? 'border-yellow-400 bg-yellow-50/50 ring-1 ring-yellow-300'
                                                : 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-300'
                                            : 'border-gray-200 hover:border-blue-200'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Checkbox column in selection modes */}
                                        {showCheckbox && (
                                            <div className="flex-shrink-0 pt-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (shortlistMode) {
                                                            toggleSelectApplicant(app.id);
                                                        } else if (finalSelectionMode) {
                                                            toggleFinalSelectApplicant(app.id);
                                                        }
                                                    }}
                                                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                                                        isSelected
                                                            ? shortlistMode
                                                                ? 'bg-yellow-500 border-yellow-500 shadow-sm'
                                                                : 'bg-blue-500 border-blue-500 shadow-sm'
                                                            : 'border-gray-300 bg-white hover:border-blue-400'
                                                    }`}
                                                >
                                                    {isSelected && (
                                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        )}

                                        {/* Applicant content - clicking opens detail modal */}
                                        <div
                                            className="flex-1 min-w-0"
                                            onClick={() => setSelectedApplicant(app)}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-1.5">
                                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                                                            {app.studentName?.charAt(0)?.toUpperCase() || '?'}
                                                        </div>
                                                        <div>
                                                            <h3 className="text-base font-semibold text-gray-900">{app.studentName || 'Unknown'}</h3>
                                                            <p className="text-sm text-gray-500">{app.studentEmail}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 mt-2 ml-[52px]">
                                                        {app.studentBranch && (
                                                            <span className="flex items-center gap-1">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                                {app.studentBranch}
                                                            </span>
                                                        )}
                                                        {app.studentRollNumber && (
                                                            <span className="flex items-center gap-1">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
                                                                {app.studentRollNumber}
                                                            </span>
                                                        )}
                                                        {app.studentCGPA && (
                                                            <span className="flex items-center gap-1">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                                                CGPA: {app.studentCGPA}
                                                            </span>
                                                        )}
                                                        <span className="flex items-center gap-1">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                            Applied: {formatDate(app.appliedAt)}
                                                        </span>
                                                    </div>
                                                    {app.studentSkills?.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 mt-2 ml-[52px]">
                                                            {app.studentSkills.slice(0, 5).map((skill, idx) => (
                                                                <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                                                                    {skill}
                                                                </span>
                                                            ))}
                                                            {app.studentSkills.length > 5 && (
                                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                                                                    +{app.studentSkills.length - 5} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 flex-shrink-0">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                        STATUS_COLORS[app.status] || 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                        {STATUS_LABELS[app.status] || app.status || 'Applied'}
                                                    </span>
                                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })})()}

                        {/* Floating Shortlist Action Bar */}
                        {shortlistMode && (
                            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
                                <div className="bg-gray-900 text-white rounded-2xl shadow-2xl px-6 py-3.5 flex items-center gap-4 min-w-[340px]">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-sm font-bold text-gray-900">
                                            {selectedIds.size}
                                        </div>
                                        <span className="text-sm font-medium">
                                            applicant{selectedIds.size !== 1 ? 's' : ''} selected
                                        </span>
                                    </div>
                                    <div className="w-px h-8 bg-gray-700"></div>
                                    {selectedIds.size > 0 && (
                                        <button
                                            onClick={() => setSelectedIds(new Set())}
                                            className="text-sm text-gray-400 hover:text-white transition-colors"
                                        >
                                            Clear
                                        </button>
                                    )}
                                    <button
                                        onClick={requestBatchShortlist}
                                        disabled={shortlisting}
                                        className="ml-auto inline-flex items-center gap-2 px-5 py-2 bg-yellow-500 text-gray-900 rounded-xl text-sm font-bold hover:bg-yellow-400 transition-colors disabled:opacity-50"
                                    >
                                        {shortlisting ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                Shortlisting...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Shortlist Selected
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )
            )}

            {/* Shortlist Warning Confirmation Modal */}
            {showShortlistWarning && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Confirm Shortlisting</h3>
                                <p className="text-sm text-gray-500">This action cannot be undone</p>
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-sm text-green-800">
                                    <strong>{selectedIds.size}</strong> applicant{selectedIds.size !== 1 ? 's' : ''} will be <strong>shortlisted</strong>
                                </span>
                            </div>
                            {unselectedApplicants.length > 0 && (
                                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span className="text-sm text-red-800">
                                        <strong>{unselectedApplicants.length}</strong> unselected applicant{unselectedApplicants.length !== 1 ? 's' : ''} will be <strong>automatically rejected</strong>
                                    </span>
                                </div>
                            )}
                            <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <span className="text-sm text-purple-800">
                                    This job will be <strong>closed for new applications</strong> and marked as <strong>Shortlisting Completed</strong>
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowShortlistWarning(false)}
                                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBatchShortlist}
                                className="flex-1 px-4 py-2.5 bg-yellow-500 text-gray-900 rounded-lg hover:bg-yellow-400 transition-colors font-bold text-sm"
                            >
                                Confirm &amp; Proceed
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Final Placement Confirmation Modal */}
            {showFinalPlacementWarning && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Complete Recruitment</h3>
                                <p className="text-sm text-gray-500">Finalize student placements</p>
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm text-green-800">
                                    <strong>{finalSelectedIds.size}</strong> student{finalSelectedIds.size !== 1 ? 's' : ''} will be marked as <strong>placed</strong>
                                </span>
                            </div>
                            {selectedJob?.salary?.amount && (
                                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-sm text-blue-800">
                                        Package: <strong>₹{selectedJob.salary.amount.toLocaleString()}</strong> {selectedJob.salary.type === 'yearly' ? 'per year' : 'per month'}
                                    </span>
                                </div>
                            )}
                            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                <p className="text-xs text-purple-800">
                                    <strong>Note:</strong> Package amount and placement details will be stored for analytics and reporting purposes.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowFinalPlacementWarning(false)}
                                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleFinalPlacement}
                                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold text-sm"
                            >
                                Confirm &amp; Place
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Delete Job</h3>
                                <p className="text-sm text-gray-500">This action cannot be undone.</p>
                            </div>
                        </div>
                        <p className="text-gray-700 mb-6">
                            Are you sure you want to delete <strong>&ldquo;{deleteModal.job?.title}&rdquo;</strong>? All
                            applications for this job will also be affected.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteModal({ open: false, job: null })}
                                disabled={deleting}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {deleting && (
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>
                                )}
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-gray-900">Edit Job</h3>
                            <button
                                onClick={() => setEditModal({ open: false, job: null })}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                                <input
                                    type="text"
                                    value={editForm.title}
                                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                                <input
                                    type="text"
                                    value={editForm.location}
                                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Openings</label>
                                    <input
                                        type="number"
                                        value={editForm.openings}
                                        onChange={(e) => setEditForm({ ...editForm, openings: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                                    <input
                                        type="date"
                                        value={editForm.deadline}
                                        onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Salary</label>
                                <input
                                    type="text"
                                    value={editForm.salaryAmount}
                                    onChange={(e) => setEditForm({ ...editForm, salaryAmount: e.target.value })}
                                    placeholder="e.g., ₹8,00,000/year"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setEditModal({ open: false, job: null })}
                                disabled={saving}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={saving}
                                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving && (
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>
                                )}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Applicant Detail Modal */}
            {selectedApplicant && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                                    {selectedApplicant.studentName?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">{selectedApplicant.studentName}</h2>
                                    <p className="text-sm text-gray-500">{selectedApplicant.studentEmail}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedApplicant(null)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="px-6 py-5 space-y-6">
                            {/* Status & Applied Date */}
                            <div className="flex flex-wrap items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${STATUS_COLORS[selectedApplicant.status] || 'bg-gray-100 text-gray-700'}`}>
                                    {STATUS_LABELS[selectedApplicant.status] || selectedApplicant.status || 'Applied'}
                                </span>
                                {selectedApplicant.workflowStage && (
                                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700">
                                        Stage: {selectedApplicant.workflowStage}
                                    </span>
                                )}
                                <span className="text-sm text-gray-500">
                                    Applied on {formatDate(selectedApplicant.appliedAt)}
                                </span>
                            </div>

                            {/* Personal Info Grid */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Personal Information</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <p className="text-xs text-gray-500 mb-0.5">Roll Number</p>
                                        <p className="text-sm font-medium text-gray-900">{selectedApplicant.studentRollNumber || 'N/A'}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <p className="text-xs text-gray-500 mb-0.5">Branch</p>
                                        <p className="text-sm font-medium text-gray-900">{selectedApplicant.studentBranch || 'N/A'}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <p className="text-xs text-gray-500 mb-0.5">CGPA</p>
                                        <p className="text-sm font-medium text-gray-900">{selectedApplicant.studentCGPA || 'N/A'}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <p className="text-xs text-gray-500 mb-0.5">Phone</p>
                                        <p className="text-sm font-medium text-gray-900">{selectedApplicant.studentPhone || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Skills */}
                            {selectedApplicant.studentSkills?.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Skills</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedApplicant.studentSkills.map((skill, idx) => (
                                            <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Links */}
                            {(selectedApplicant.studentLinkedin || selectedApplicant.studentPortfolio || selectedApplicant.resumeUrl) && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Links</h3>
                                    <div className="flex flex-wrap gap-3">
                                        {selectedApplicant.resumeUrl && (
                                            <a
                                                href={selectedApplicant.resumeUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                View Resume
                                            </a>
                                        )}
                                        {selectedApplicant.studentLinkedin && (
                                            <a
                                                href={selectedApplicant.studentLinkedin}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0077B5] text-white text-sm font-medium rounded-lg hover:bg-[#006097] transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                                                LinkedIn
                                            </a>
                                        )}
                                        {selectedApplicant.studentPortfolio && (
                                            <a
                                                href={selectedApplicant.studentPortfolio}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                                                Portfolio
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Why Interested */}
                            {selectedApplicant.whyInterested && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Why Interested</h3>
                                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4 leading-relaxed">
                                        {selectedApplicant.whyInterested}
                                    </p>
                                </div>
                            )}

                            {/* Cover Letter */}
                            {selectedApplicant.coverLetter && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Cover Letter</h3>
                                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4 leading-relaxed whitespace-pre-wrap">
                                        {selectedApplicant.coverLetter}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-2xl flex justify-end">
                            <button
                                onClick={() => setSelectedApplicant(null)}
                                className="px-5 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
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

export default ManageJobs;
