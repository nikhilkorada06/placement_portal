import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@context/AuthContext';
import { subscribeToStudentInterviews, checkAndSendReminders } from '@services/interviewService';
import { INTERVIEW_STATUS } from '@config/constants';
import InterviewStatusBadge from '@components/InterviewStatusBadge';
import {
    CalendarIcon,
    ClockIcon,
    BuildingOffice2Icon,
    BriefcaseIcon,
    LinkIcon,
} from '@heroicons/react/24/outline';

const Interviews = () => {
    const { user } = useAuth();
    const [interviews, setInterviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('upcoming'); // upcoming | past
    const reminderInterval = useRef(null);

    useEffect(() => {
        if (!user?.uid) return;
        const unsub = subscribeToStudentInterviews(user.uid, (data) => {
            setInterviews(data);
            setLoading(false);
        });

        // Check for reminders now and every 5 minutes
        checkAndSendReminders(user.uid);
        reminderInterval.current = setInterval(() => {
            checkAndSendReminders(user.uid);
        }, 5 * 60 * 1000);

        return () => {
            unsub();
            if (reminderInterval.current) clearInterval(reminderInterval.current);
        };
    }, [user?.uid]);

    const now = new Date();
    const upcoming = interviews.filter((iv) => {
        const isActive = iv.status === INTERVIEW_STATUS.SCHEDULED || iv.status === INTERVIEW_STATUS.RESCHEDULED;
        try { return isActive && new Date(`${iv.date}T${iv.time}`) >= now; } catch { return isActive; }
    });
    const past = interviews.filter((iv) => !upcoming.includes(iv));

    const displayed = tab === 'upcoming' ? upcoming : past;

    const fmtDate = (d) => {
        try { return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }); }
        catch { return d; }
    };

    const fmtTime = (t) => {
        try {
            const [h, m] = t.split(':');
            const hr = parseInt(h, 10);
            return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
        } catch { return t; }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">My Interviews</h1>
                <p className="text-gray-500 mt-1">View your upcoming and past interviews</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 max-w-xs">
                {['upcoming', 'past'].map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`flex-1 text-sm font-medium px-4 py-2 rounded-md capitalize transition-colors ${tab === t ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {t} ({t === 'upcoming' ? upcoming.length : past.length})
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                </div>
            ) : displayed.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border p-10 text-center">
                    <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">{tab === 'upcoming' ? 'No upcoming interviews' : 'No past interviews'}</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {displayed.map((iv) => (
                        <div key={iv.id} className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                <div className="space-y-2 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-semibold text-gray-900 text-lg">{iv.companyName}</h3>
                                        <InterviewStatusBadge status={iv.status} />
                                    </div>

                                    <p className="flex items-center gap-1.5 text-gray-600">
                                        <BriefcaseIcon className="w-4 h-4 text-gray-400" />
                                        {iv.role}
                                    </p>

                                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <CalendarIcon className="w-4 h-4" /> {fmtDate(iv.date)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <ClockIcon className="w-4 h-4" /> {fmtTime(iv.time)}
                                        </span>
                                    </div>

                                    {iv.meetingLink && (
                                        <a
                                            href={iv.meetingLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:underline mt-1"
                                        >
                                            <LinkIcon className="w-4 h-4" />
                                            Join Meeting
                                        </a>
                                    )}
                                </div>

                                {/* Visual accent */}
                                <div className="hidden sm:flex items-center justify-center w-14 h-14 bg-primary-50 rounded-xl shrink-0">
                                    <BuildingOffice2Icon className="w-7 h-7 text-primary-600" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Interviews;
