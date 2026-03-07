import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@config/firebase';
import { COLLECTIONS, JOB_TYPE_LABELS, WORK_MODES, APPLICATION_STATUS } from '@config/constants';
import { useAuth } from '@context/AuthContext';
import ATSScoreChecker from '@components/ATSScoreChecker';
import toast from 'react-hot-toast';

const JobDetails = () => {
    const { jobId } = useParams();
    const navigate = useNavigate();
    const { user, userProfile } = useAuth();

    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [applying, setApplying] = useState(false);
    const [hasApplied, setHasApplied] = useState(false);
    const [applicationSuccess, setApplicationSuccess] = useState(false);
    const [showApplicationForm, setShowApplicationForm] = useState(false);
    const [studentData, setStudentData] = useState(null);

    // Application form state
    const [appForm, setAppForm] = useState({
        cgpa: '',
        phone: '',
        skills: '',
        linkedin: '',
        portfolio: '',
        coverLetter: '',
        whyInterested: '',
    });

    // Fetch job details and student profile data
    useEffect(() => {
        const fetchJob = async () => {
            if (!jobId) return;

            try {
                setLoading(true);
                setError(null);

                const jobDoc = await getDoc(doc(db, COLLECTIONS.JOBS, jobId));

                if (!jobDoc.exists()) {
                    setError('Job not found');
                    return;
                }

                const jobData = { id: jobDoc.id, ...jobDoc.data() };
                setJob(jobData);

                // Check if user has already applied
                if (user?.uid) {
                    const applicationsQuery = query(
                        collection(db, COLLECTIONS.APPLICATIONS),
                        where('jobId', '==', jobId),
                        where('studentId', '==', user.uid)
                    );
                    const applicationsSnapshot = await getDocs(applicationsQuery);
                    setHasApplied(!applicationsSnapshot.empty);

                    // Fetch student-specific profile data
                    const studentDoc = await getDoc(doc(db, COLLECTIONS.STUDENTS, user.uid));
                    if (studentDoc.exists()) {
                        const sData = studentDoc.data();
                        setStudentData(sData);
                        setAppForm((prev) => ({
                            ...prev,
                            cgpa: sData.cgpa || '',
                            phone: sData.phone || '',
                            skills: (sData.skills || []).join(', '),
                            linkedin: sData.linkedin || '',
                            portfolio: sData.portfolio || '',
                        }));
                    }
                }
            } catch (err) {
                console.error('Error fetching job:', err);
                setError('Failed to load job details. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchJob();
    }, [jobId, user?.uid]);

    // Open application form
    const openApplicationForm = () => {
        setShowApplicationForm(true);
    };

    // Handle form field change
    const handleFormChange = (e) => {
        setAppForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Handle apply with form data
    const handleApply = async () => {
        if (!user?.uid || !job) return;

        try {
            setApplying(true);

            // Create application document with full student details
            await addDoc(collection(db, COLLECTIONS.APPLICATIONS), {
                jobId: job.id,
                jobTitle: job.title,
                companyName: job.companyName,
                studentId: user.uid,
                studentName: userProfile?.fullName || user.displayName || 'Unknown',
                studentEmail: user.email,
                studentRollNumber: studentData?.rollNumber || userProfile?.rollNumber || '',
                studentBranch: studentData?.branch || userProfile?.branch || '',
                studentCGPA: appForm.cgpa,
                studentPhone: appForm.phone,
                studentSkills: appForm.skills ? appForm.skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
                studentLinkedin: appForm.linkedin,
                studentPortfolio: appForm.portfolio,
                coverLetter: appForm.coverLetter,
                whyInterested: appForm.whyInterested,
                resumeUrl: userProfile?.resumeUrl || null,
                status: APPLICATION_STATUS.APPLIED,
                workflowStage: job.workflowStages?.[0] || 'Applied',
                appliedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            setHasApplied(true);
            setApplicationSuccess(true);
            setShowApplicationForm(false);
            toast.success('Application submitted successfully!');
        } catch (err) {
            console.error('Error applying to job:', err);
            toast.error('Failed to submit application. Please try again.');
        } finally {
            setApplying(false);
        }
    };

    // Format date
    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    // Work mode label
    const getWorkModeLabel = (mode) => {
        const labels = {
            [WORK_MODES.REMOTE]: 'Remote',
            [WORK_MODES.HYBRID]: 'Hybrid',
            [WORK_MODES.ONSITE]: 'On-site',
        };
        return labels[mode] || mode;
    };

    // Section Component
    const Section = ({ title, children, icon }) => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    {icon}
                    {title}
                </h2>
            </div>
            <div className="p-6">{children}</div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !job) {
        return (
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
                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">{error || 'Job not found'}</h3>
                <p className="mt-2 text-gray-500">The job you're looking for doesn't exist or has been removed.</p>
                <Link
                    to="/student/jobs"
                    className="inline-flex items-center gap-2 mt-6 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Browse Jobs
                </Link>
            </div>
        );
    }

    return (
        <div className="pb-24">
            {/* Back Button */}
            <Link
                to="/student/jobs"
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Jobs
            </Link>

            {/* Success Message */}
            {applicationSuccess && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                    <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                        />
                    </svg>
                    <div>
                        <p className="font-medium text-green-800">Application Submitted Successfully!</p>
                        <p className="text-sm text-green-700">You can track your application status in the Applications section.</p>
                    </div>
                </div>
            )}

            {/* Job Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                            <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
                            <span
                                className={`px-3 py-1 rounded-full text-sm font-medium ${job.status === 'active'
                                    ? 'bg-green-100 text-green-800'
                                    : job.status === 'recruitment_completed'
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}
                            >
                                {job.status === 'active' ? 'Active' : job.status === 'recruitment_completed' ? 'Recruitment Completed' : 'Closed'}
                            </span>
                        </div>
                        <p className="text-lg text-gray-700 font-medium">{job.companyName}</p>

                        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1.5">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                {job.location || 'Location not specified'}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                    />
                                </svg>
                                {JOB_TYPE_LABELS[job.jobType] || job.jobType}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                                    />
                                </svg>
                                {getWorkModeLabel(job.workMode)}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                    />
                                </svg>
                                {job.openings || 1} Opening{(job.openings || 1) > 1 ? 's' : ''}
                            </span>
                        </div>

                        {job.salary?.amount && (
                            <p className="mt-4 text-lg text-green-600 font-semibold flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                                {job.salary.amount}
                                {job.salary.type === 'yearly' && ' per year'}
                                {job.salary.type === 'monthly' && ' per month'}
                                {job.salary.ppoAvailable && (
                                    <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                                        PPO Available
                                    </span>
                                )}
                            </p>
                        )}
                    </div>

                    {/* Quick Info */}
                    <div className="flex flex-col gap-3 lg:text-right">
                        <p className="text-sm text-gray-500">
                            Posted on {formatDate(job.createdAt)}
                        </p>
                        {job.applicationSettings?.deadline && (
                            <p className="text-sm font-medium text-orange-600">
                                Deadline: {job.applicationSettings.deadline}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Role Overview */}
                    {job.description?.roleOverview && (
                        <Section
                            title="Role Overview"
                            icon={
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            }
                        >
                            <p className="text-gray-700 whitespace-pre-wrap">{job.description.roleOverview}</p>
                        </Section>
                    )}

                    {/* Responsibilities */}
                    {job.description?.responsibilities && (
                        <Section
                            title="Key Responsibilities"
                            icon={
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                            }
                        >
                            <p className="text-gray-700 whitespace-pre-wrap">{job.description.responsibilities}</p>
                        </Section>
                    )}

                    {/* Skills */}
                    <Section
                        title="Skills Required"
                        icon={
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        }
                    >
                        <div className="space-y-4">
                            {job.description?.requiredSkills && (
                                <div>
                                    <h4 className="font-medium text-gray-800 mb-2">Required Skills</h4>
                                    <p className="text-gray-700 whitespace-pre-wrap">{job.description.requiredSkills}</p>
                                </div>
                            )}
                            {job.description?.preferredSkills && (
                                <div>
                                    <h4 className="font-medium text-gray-800 mb-2">Preferred Skills</h4>
                                    <p className="text-gray-700 whitespace-pre-wrap">{job.description.preferredSkills}</p>
                                </div>
                            )}
                            {job.description?.technologies && (
                                <div>
                                    <h4 className="font-medium text-gray-800 mb-2">Technologies</h4>
                                    <p className="text-gray-700">{job.description.technologies}</p>
                                </div>
                            )}
                        </div>
                    </Section>

                    {/* Selection Process */}
                    {job.applicationSettings?.selectionProcess && job.applicationSettings.selectionProcess.length > 0 && (
                        <Section
                            title="Selection Process"
                            icon={
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                </svg>
                            }
                        >
                            <div className="flex flex-wrap gap-2">
                                {job.applicationSettings.selectionProcess.map((step, index) => (
                                    <div key={step} className="flex items-center">
                                        <span className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm">
                                            <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                                                {index + 1}
                                            </span>
                                            {step}
                                        </span>
                                        {index < job.applicationSettings.selectionProcess.length - 1 && (
                                            <svg className="w-4 h-4 mx-1 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Eligibility */}
                    <Section
                        title="Eligibility Criteria"
                        icon={
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                        }
                    >
                        <div className="space-y-3">
                            {job.eligibility?.minCGPA > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Minimum CGPA</span>
                                    <span className="font-medium text-gray-900">{job.eligibility.minCGPA}</span>
                                </div>
                            )}
                            {job.eligibility?.passingYear && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Passing Year</span>
                                    <span className="font-medium text-gray-900">{job.eligibility.passingYear}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-gray-600">Backlogs</span>
                                <span className={`font-medium ${job.eligibility?.backlogAllowed ? 'text-green-600' : 'text-red-600'}`}>
                                    {job.eligibility?.backlogAllowed ? 'Allowed' : 'Not Allowed'}
                                </span>
                            </div>
                            {job.eligibility?.portfolioRequired && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Portfolio</span>
                                    <span className="font-medium text-orange-600">Required</span>
                                </div>
                            )}
                        </div>

                        {job.eligibility?.branches && job.eligibility.branches.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <p className="text-sm font-medium text-gray-700 mb-2">Eligible Branches</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {job.eligibility.branches.map((branch) => (
                                        <span
                                            key={branch}
                                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                                        >
                                            {branch}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Section>

                    {/* Application Requirements */}
                    <Section
                        title="Application Requirements"
                        icon={
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        }
                    >
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                {job.applicationSettings?.resumeRequired ? (
                                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                )}
                                <span className="text-gray-700">Resume</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {job.applicationSettings?.coverLetterRequired ? (
                                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                )}
                                <span className="text-gray-700">Cover Letter</span>
                            </div>
                        </div>
                    </Section>

                    {/* Attachments */}
                    {(job.attachments?.jobDescriptionPDF || job.attachments?.companyBrochure) && (
                        <Section
                            title="Attachments"
                            icon={
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                            }
                        >
                            <div className="space-y-2">
                                {job.attachments.jobDescriptionPDF && (
                                    <a
                                        href={job.attachments.jobDescriptionPDF}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-sm text-gray-700">Job Description PDF</span>
                                    </a>
                                )}
                                {job.attachments.companyBrochure && (
                                    <a
                                        href={job.attachments.companyBrochure}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-sm text-gray-700">Company Brochure</span>
                                    </a>
                                )}
                            </div>
                        </Section>
                    )}

                    {/* ATS Score Checker */}
                    <ATSScoreChecker
                        job={job}
                        studentProfile={{
                            fullName: userProfile?.fullName || '',
                            email: user?.email || '',
                            branch: studentData?.branch || userProfile?.branch || '',
                            cgpa: studentData?.cgpa || '',
                            skills: studentData?.skills || [],
                            aboutMe: studentData?.aboutMe || '',
                            projects: studentData?.projects || [],
                            achievements: studentData?.achievements || [],
                        }}
                        userId={user?.uid}
                        hasResume={!!(studentData?.resume?.url || userProfile?.resumeUrl)}
                    />
                </div>
            </div>

            {/* Sticky Apply Bar */}
            <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-gray-200 shadow-lg z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="hidden sm:block">
                            <p className="font-medium text-gray-900">{job.title}</p>
                            <p className="text-sm text-gray-500">{job.companyName}</p>
                        </div>
                        <div className="flex items-center gap-4 ml-auto">
                            {hasApplied ? (
                                <div className="flex items-center gap-2 px-6 py-2.5 bg-green-100 text-green-800 rounded-lg font-medium">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path
                                            fillRule="evenodd"
                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    Already Applied
                                </div>
                            ) : job.status !== 'active' ? (
                                <div className="px-6 py-2.5 bg-gray-100 text-gray-500 rounded-lg font-medium">
                                    Applications Closed
                                </div>
                            ) : (
                                <button
                                    onClick={openApplicationForm}
                                    className="px-8 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    Apply Now
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Application Form Modal */}
            {showApplicationForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 rounded-t-2xl flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Apply for {job.title}</h2>
                                    <p className="text-blue-100 text-sm mt-1">{job.companyName}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowApplicationForm(false)}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Modal Body — scrollable */}
                        <div className="overflow-y-auto flex-1 p-6 space-y-6">

                            {/* Non-editable Identity Section */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Your Details (non-editable)</h3>
                                <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
                                            <p className="text-sm font-medium text-gray-900 bg-gray-100 px-3 py-2 rounded-lg">{userProfile?.fullName || user?.displayName || '—'}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                                            <p className="text-sm font-medium text-gray-900 bg-gray-100 px-3 py-2 rounded-lg">{user?.email || '—'}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Roll Number</label>
                                            <p className="text-sm font-medium text-gray-900 bg-gray-100 px-3 py-2 rounded-lg">{studentData?.rollNumber || userProfile?.rollNumber || '—'}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Branch</label>
                                            <p className="text-sm font-medium text-gray-900 bg-gray-100 px-3 py-2 rounded-lg">{studentData?.branch || userProfile?.branch || '—'}</p>
                                        </div>
                                    </div>
                                    {/* Resume status */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Resume</label>
                                        {userProfile?.resumeUrl ? (
                                            <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
                                                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                <span className="text-sm text-green-800 font-medium">Resume uploaded</span>
                                                <a href={userProfile.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline ml-auto">View</a>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 px-3 py-2 rounded-lg">
                                                <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                                <span className="text-sm text-yellow-800 font-medium">No resume uploaded</span>
                                                <Link to="/student/resume" className="text-xs text-blue-600 hover:underline ml-auto">Upload now</Link>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Editable Section */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Additional Details (editable)</h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">CGPA</label>
                                            <input
                                                type="text"
                                                name="cgpa"
                                                value={appForm.cgpa}
                                                onChange={handleFormChange}
                                                placeholder="e.g., 8.5"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={appForm.phone}
                                                onChange={handleFormChange}
                                                placeholder="e.g., +91 98765 43210"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Skills <span className="text-gray-400 font-normal">(comma separated)</span></label>
                                        <input
                                            type="text"
                                            name="skills"
                                            value={appForm.skills}
                                            onChange={handleFormChange}
                                            placeholder="e.g., React, Node.js, Python"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn Profile</label>
                                            <input
                                                type="url"
                                                name="linkedin"
                                                value={appForm.linkedin}
                                                onChange={handleFormChange}
                                                placeholder="https://linkedin.com/in/..."
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Portfolio / GitHub</label>
                                            <input
                                                type="url"
                                                name="portfolio"
                                                value={appForm.portfolio}
                                                onChange={handleFormChange}
                                                placeholder="https://github.com/..."
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Why are you interested in this role?</label>
                                        <textarea
                                            name="whyInterested"
                                            value={appForm.whyInterested}
                                            onChange={handleFormChange}
                                            rows={3}
                                            placeholder="Briefly describe why you're a good fit for this position..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                        />
                                    </div>

                                    {job.applicationSettings?.coverLetterRequired && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Cover Letter <span className="text-red-500">*</span></label>
                                            <textarea
                                                name="coverLetter"
                                                value={appForm.coverLetter}
                                                onChange={handleFormChange}
                                                rows={4}
                                                placeholder="Write your cover letter here..."
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-2xl flex items-center justify-between flex-shrink-0">
                            <p className="text-xs text-gray-500">By applying, your details will be shared with <span className="font-medium">{job.companyName}</span></p>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowApplicationForm(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleApply}
                                    disabled={applying || (job.applicationSettings?.coverLetterRequired && !appForm.coverLetter.trim())}
                                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                >
                                    {applying ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Submitting...
                                        </>
                                    ) : (
                                        'Submit Application'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobDetails;
