import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@config/firebase';
import { COLLECTIONS, APPLICATION_STATUS, INTERVIEW_STATUS, STATUS_LABELS, STATUS_COLORS } from '@config/constants';
import { subscribeToStudentInterviews, checkAndSendReminders } from '@services/interviewService';
import { subscribeToNotifications, markAsRead } from '@services/notificationService';
import InterviewStatusBadge from '@components/InterviewStatusBadge';
import {
    BriefcaseIcon,
    DocumentTextIcon,
    CalendarIcon,
    CheckCircleIcon,
    ClockIcon,
    BuildingOffice2Icon,
    BellIcon,
    LinkIcon,
    ArrowRightIcon,
} from '@heroicons/react/24/outline';

const StudentDashboard = () => {
    const { user, userProfile } = useAuth();
    const navigate = useNavigate();
    const [showProfileModal, setShowProfileModal] = useState(false);

    // Real-time data
    const [applications, setApplications] = useState([]);
    const [interviews, setInterviews] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [jobsCount, setJobsCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const reminderRef = useRef(null);

    // Show complete-profile modal for new students whose profile isn't completed
    useEffect(() => {
        if (userProfile && userProfile.role === 'student' && userProfile.profileCompleted === false) {
            setShowProfileModal(true);
        }
    }, [userProfile]);

    // Subscribe to applications (real-time)
    useEffect(() => {
        if (!user?.uid) return;
        const q = query(
            collection(db, COLLECTIONS.APPLICATIONS),
            where('studentId', '==', user.uid),
        );
        const unsub = onSnapshot(q, (snap) => {
            const apps = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            // Sort newest first
            apps.sort((a, b) => {
                const at = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
                const bt = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
                return bt - at;
            });
            setApplications(apps);
            setLoading(false);
        });
        return unsub;
    }, [user?.uid]);

    // Subscribe to interviews (real-time)
    useEffect(() => {
        if (!user?.uid) return;
        const unsub = subscribeToStudentInterviews(user.uid, setInterviews);

        // Reminder polling
        checkAndSendReminders(user.uid);
        reminderRef.current = setInterval(() => checkAndSendReminders(user.uid), 5 * 60 * 1000);
        return () => { unsub(); clearInterval(reminderRef.current); };
    }, [user?.uid]);

    // Subscribe to notifications (real-time)
    useEffect(() => {
        if (!user?.uid) return;
        return subscribeToNotifications(user.uid, setNotifications);
    }, [user?.uid]);

    // Count active jobs
    useEffect(() => {
        const fetchJobCount = async () => {
            const q = query(collection(db, COLLECTIONS.JOBS), where('status', '==', 'active'));
            const snap = await getDocs(q);
            setJobsCount(snap.size);
        };
        fetchJobCount();
    }, []);

    // ─── computed stats ────────────────────────────────────────
    const totalApps = applications.length;
    const interviewCount = interviews.filter(
        (iv) => iv.status === INTERVIEW_STATUS.SCHEDULED || iv.status === INTERVIEW_STATUS.RESCHEDULED,
    ).length;
    const offersCount = applications.filter(
        (a) => a.status === APPLICATION_STATUS.SELECTED || a.status === APPLICATION_STATUS.PLACED,
    ).length;
    const shortlistedCount = applications.filter((a) => a.status === APPLICATION_STATUS.SHORTLISTED).length;
    const rejectedCount = applications.filter((a) => a.status === APPLICATION_STATUS.REJECTED).length;

    const stats = [
        { name: 'Applications', value: totalApps, icon: DocumentTextIcon, color: 'text-blue-600', bg: 'bg-blue-100', link: '/student/applications' },
        { name: 'Interviews', value: interviewCount, icon: CalendarIcon, color: 'text-purple-600', bg: 'bg-purple-100', link: '/student/interviews' },
        { name: 'Offers', value: offersCount, icon: CheckCircleIcon, color: 'text-green-600', bg: 'bg-green-100', link: '/student/applications' },
        { name: 'Jobs Available', value: jobsCount, icon: BriefcaseIcon, color: 'text-orange-600', bg: 'bg-orange-100', link: '/student/jobs' },
    ];

    // ─── upcoming interviews (next 3) ──────────────────────────
    const now = new Date();
    const upcomingInterviews = interviews
        .filter((iv) => {
            const isActive = iv.status === INTERVIEW_STATUS.SCHEDULED || iv.status === INTERVIEW_STATUS.RESCHEDULED;
            try { return isActive && new Date(`${iv.date}T${iv.time}`) >= now; } catch { return isActive; }
        })
        .slice(0, 3);

    // ─── recent applications (last 5) ──────────────────────────
    const recentApps = applications.slice(0, 5);

    // ─── unread notifications ──────────────────────────────────
    const unreadNotifs = notifications.filter((n) => !n.isRead).slice(0, 5);

    // ─── helpers ───────────────────────────────────────────────
    const fmtDate = (d) => {
        try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
        catch { return d; }
    };
    const fmtTime = (t) => {
        try {
            const [h, m] = t.split(':');
            const hr = parseInt(h, 10);
            return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
        } catch { return t; }
    };
    const fmtTimestamp = (ts) => {
        try {
            const d = ts?.toDate?.() || new Date(ts);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch { return ''; }
    };

    const handleMarkRead = async (id) => {
        try { await markAsRead(id); } catch { /* silent */ }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    Welcome back, {userProfile?.fullName || 'Student'}!
                </h1>
                <p className="text-gray-500 mt-1">Here&apos;s your placement dashboard overview</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <Link key={stat.name} to={stat.link} className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">{stat.name}</p>
                                <p className="text-3xl font-bold text-gray-900">{loading ? '–' : stat.value}</p>
                            </div>
                            <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center`}>
                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Application breakdown mini-bar */}
            {totalApps > 0 && (
                <div className="bg-white rounded-xl shadow-sm border p-5">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Application Pipeline</h3>
                    <div className="flex gap-4 flex-wrap text-sm">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Applied: {applications.filter((a) => a.status === APPLICATION_STATUS.APPLIED).length}</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> Shortlisted: {shortlistedCount}</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Interview: {applications.filter((a) => a.status === APPLICATION_STATUS.INTERVIEW_SCHEDULED).length}</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Selected: {offersCount}</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Rejected: {rejectedCount}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden flex">
                        {[
                            { count: applications.filter((a) => a.status === APPLICATION_STATUS.APPLIED).length, color: 'bg-blue-500' },
                            { count: shortlistedCount, color: 'bg-yellow-500' },
                            { count: applications.filter((a) => a.status === APPLICATION_STATUS.INTERVIEW_SCHEDULED).length, color: 'bg-purple-500' },
                            { count: offersCount, color: 'bg-green-500' },
                            { count: rejectedCount, color: 'bg-red-500' },
                        ].map((seg, i) => seg.count > 0 && (
                            <div key={i} className={`${seg.color} h-full`} style={{ width: `${(seg.count / totalApps) * 100}%` }} />
                        ))}
                    </div>
                </div>
            )}

            {/* Main content grid */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* ─── Upcoming Interviews ──────────────────── */}
                <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Upcoming Interviews</h3>
                        <Link to="/student/interviews" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
                            View all <ArrowRightIcon className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                    {upcomingInterviews.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <CalendarIcon className="w-10 h-10 mx-auto mb-2" />
                            <p className="text-sm">No upcoming interviews</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {upcomingInterviews.map((iv) => (
                                <div key={iv.id} className="p-3 rounded-lg border border-gray-100 hover:border-primary-200 transition-colors">
                                    <div className="flex items-center gap-2 mb-1">
                                        <BuildingOffice2Icon className="w-4 h-4 text-gray-400" />
                                        <span className="font-medium text-gray-900 text-sm truncate">{iv.companyName}</span>
                                        <InterviewStatusBadge status={iv.status} />
                                    </div>
                                    <p className="text-xs text-gray-500 ml-6 mb-1">{iv.role}</p>
                                    <div className="flex items-center gap-3 ml-6 text-xs text-gray-500">
                                        <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" /> {fmtDate(iv.date)}</span>
                                        <span className="flex items-center gap-1"><ClockIcon className="w-3.5 h-3.5" /> {fmtTime(iv.time)}</span>
                                    </div>
                                    {iv.meetingLink && (
                                        <a href={iv.meetingLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline ml-6 mt-1">
                                            <LinkIcon className="w-3.5 h-3.5" /> Join Meeting
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ─── Recent Applications ──────────────────── */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Recent Applications</h3>
                        <Link to="/student/applications" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
                            View all <ArrowRightIcon className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                    {recentApps.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <DocumentTextIcon className="w-10 h-10 mx-auto mb-2" />
                            <p className="text-sm">No applications yet</p>
                            <Link to="/student/jobs" className="text-primary-600 hover:underline text-sm mt-2 inline-block">
                                Start applying to jobs
                            </Link>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {recentApps.map((app) => (
                                <div key={app.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-gray-900 text-sm truncate">{app.jobTitle || 'Unknown Job'}</p>
                                        <p className="text-xs text-gray-500 truncate">{app.companyName || '—'} &middot; {fmtTimestamp(app.createdAt)}</p>
                                    </div>
                                    <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_COLORS[app.status] || 'bg-gray-100 text-gray-800'}`}>
                                        {STATUS_LABELS[app.status] || app.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom row */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* ─── Notifications ────────────────────────── */}
                <div className="bg-white rounded-xl shadow-sm border p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                        {unreadNotifs.length > 0 && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{unreadNotifs.length} new</span>
                        )}
                    </div>
                    {unreadNotifs.length === 0 ? (
                        <div className="text-center py-6 text-gray-400">
                            <BellIcon className="w-10 h-10 mx-auto mb-2" />
                            <p className="text-sm">All caught up!</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {unreadNotifs.map((n) => (
                                <div key={n.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-primary-50/50 hover:bg-primary-50 transition-colors">
                                    <BellIcon className="w-5 h-5 text-primary-500 mt-0.5 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-gray-900">{n.title}</p>
                                        <p className="text-xs text-gray-500 truncate">{n.message}</p>
                                    </div>
                                    <button onClick={() => handleMarkRead(n.id)} className="text-xs text-gray-400 hover:text-gray-600 shrink-0">✓</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ─── Quick Actions ────────────────────────── */}
                <div className="bg-white rounded-xl shadow-sm border p-5">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                        <Link to="/student/jobs" className="block p-3 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors">
                            <div className="flex items-center space-x-3">
                                <BriefcaseIcon className="w-5 h-5 text-primary-600" />
                                <span className="font-medium text-primary-700">Browse Available Jobs</span>
                            </div>
                        </Link>
                        <Link to="/student/resume" className="block p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                            <div className="flex items-center space-x-3">
                                <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                                <span className="font-medium text-blue-700">Update Resume</span>
                            </div>
                        </Link>
                        <Link to="/student/interviews" className="block p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                            <div className="flex items-center space-x-3">
                                <CalendarIcon className="w-5 h-5 text-purple-600" />
                                <span className="font-medium text-purple-700">View Interviews</span>
                            </div>
                        </Link>
                        <Link to="/student/profile" className="block p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                            <div className="flex items-center space-x-3">
                                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                                <span className="font-medium text-green-700">Complete Profile</span>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── Complete Profile Modal ── */}
            {showProfileModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-[modalIn_0.35s_ease-out]">
                        {/* Gradient top strip */}
                        <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                        <div className="p-8 text-center">
                            {/* Icon */}
                            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-5">
                                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">Complete Your Profile</h2>
                            <p className="text-gray-500 mt-2 text-sm leading-relaxed">
                                Recruiters prefer students with complete profiles. Add your skills,
                                projects, and achievements to stand out!
                            </p>

                            <div className="mt-7 flex flex-col gap-3">
                                <button
                                    onClick={() => {
                                        setShowProfileModal(false);
                                        navigate('/student/profile?edit=true');
                                    }}
                                    className="w-full px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-200/50"
                                >
                                    Complete Profile Now
                                </button>
                                <button
                                    onClick={() => setShowProfileModal(false)}
                                    className="w-full px-5 py-2.5 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
                                >
                                    I&apos;ll do it later
                                </button>
                            </div>
                        </div>
                    </div>

                    <style>{`
                        @keyframes modalIn {
                            0% { transform: scale(0.9) translateY(20px); opacity: 0; }
                            100% { transform: scale(1) translateY(0); opacity: 1; }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
};

export default StudentDashboard;
