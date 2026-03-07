import { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@config/firebase';
import { COLLECTIONS, APPLICATION_STATUS, INTERVIEW_STATUS } from '@config/constants';
import { useAuth } from '@context/AuthContext';
import { scheduleInterview, rescheduleInterview, cancelInterview, completeInterview, subscribeToRecruiterInterviews } from '@services/interviewService';
import InterviewStatusBadge from '@components/InterviewStatusBadge';
import toast from 'react-hot-toast';
import {
    CalendarIcon,
    ClockIcon,
    LinkIcon,
    UserGroupIcon,
    BriefcaseIcon,
    PlusIcon,
    XMarkIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowPathIcon,
} from '@heroicons/react/24/outline';

const ScheduleInterview = () => {
    const { user, userProfile } = useAuth();

    // ─── form state ────────────────────────────────────────────
    const [jobs, setJobs] = useState([]);
    const [selectedJobId, setSelectedJobId] = useState('');
    const [candidates, setCandidates] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [meetingLink, setMeetingLink] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);

    // ─── existing interviews ───────────────────────────────────
    const [interviews, setInterviews] = useState([]);
    const [loadingInterviews, setLoadingInterviews] = useState(true);
    const [studentNames, setStudentNames] = useState({}); // map sid → name
    const studentNamesRef = useRef(studentNames);
    studentNamesRef.current = studentNames;

    // ─── reschedule modal ──────────────────────────────────────
    const [rescheduleModal, setRescheduleModal] = useState({ open: false, interview: null });
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [rescheduleTime, setRescheduleTime] = useState('');
    const [rescheduleMeetingLink, setRescheduleMeetingLink] = useState('');
    const [rescheduling, setRescheduling] = useState(false);

    // ─── loading state for candidates ──────────────────────────
    const [loadingCandidates, setLoadingCandidates] = useState(false);

    // Fetch recruiter's jobs
    useEffect(() => {
        if (!user?.uid) return;
        const fetchJobs = async () => {
            const q = query(
                collection(db, COLLECTIONS.JOBS),
                where('recruiterId', '==', user.uid),
            );
            const snap = await getDocs(q);
            setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        };
        fetchJobs();
    }, [user?.uid]);

    // Subscribe to recruiter interviews
    useEffect(() => {
        if (!user?.uid) return;
        setLoadingInterviews(true);
        const unsub = subscribeToRecruiterInterviews(user.uid, (data) => {
            setInterviews(data);
            setLoadingInterviews(false);

            // Collect all student IDs and resolve names
            const allIds = new Set();
            data.forEach((iv) => iv.students?.forEach((s) => allIds.add(s)));
            allIds.forEach((sid) => {
                if (!studentNamesRef.current[sid]) {
                    getDoc(doc(db, COLLECTIONS.STUDENTS, sid)).then((snap) => {
                        if (snap.exists()) {
                            setStudentNames((prev) => ({ ...prev, [sid]: snap.data().fullName || snap.data().name || sid }));
                        } else {
                            getDoc(doc(db, COLLECTIONS.USERS, sid)).then((uSnap) => {
                                if (uSnap.exists()) {
                                    setStudentNames((prev) => ({ ...prev, [sid]: uSnap.data().fullName || uSnap.data().displayName || sid }));
                                }
                            });
                        }
                    });
                }
            });
        });
        return unsub;
    }, [user?.uid]);

    // Fetch shortlisted/interview_scheduled candidates when job changes
    useEffect(() => {
        if (!selectedJobId) { setCandidates([]); return; }
        const fetchCandidates = async () => {
            setLoadingCandidates(true);
            const q = query(
                collection(db, COLLECTIONS.APPLICATIONS),
                where('jobId', '==', selectedJobId),
                where('status', 'in', [APPLICATION_STATUS.SHORTLISTED, APPLICATION_STATUS.INTERVIEW_SCHEDULED]),
            );
            const snap = await getDocs(q);
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setCandidates(list);
            setSelectedStudents([]);
            setLoadingCandidates(false);
        };
        fetchCandidates();
    }, [selectedJobId]);

    // ─── handlers ──────────────────────────────────────────────

    const toggleStudent = (sid) => {
        setSelectedStudents((prev) =>
            prev.includes(sid) ? prev.filter((id) => id !== sid) : [...prev, sid],
        );
    };

    const selectedJob = jobs.find((j) => j.id === selectedJobId);

    const handleSchedule = async () => {
        if (!selectedJobId || selectedStudents.length === 0 || !date || !time) {
            toast.error('Please fill all required fields');
            return;
        }

        try {
            setSubmitting(true);
            await scheduleInterview({
                recruiterId: user.uid,
                jobId: selectedJobId,
                students: selectedStudents,
                companyName: selectedJob?.companyName || userProfile?.companyName || '',
                role: selectedJob?.title || '',
                date,
                time,
                meetingLink,
            });
            toast.success('Interview scheduled successfully!');
            resetForm();
        } catch (err) {
            console.error(err);
            toast.error('Failed to schedule interview');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setSelectedJobId('');
        setCandidates([]);
        setSelectedStudents([]);
        setDate('');
        setTime('');
        setMeetingLink('');
        setShowForm(false);
    };

    const openReschedule = (interview) => {
        setRescheduleModal({ open: true, interview });
        setRescheduleDate(interview.date);
        setRescheduleTime(interview.time);
        setRescheduleMeetingLink(interview.meetingLink || '');
    };

    const handleReschedule = async () => {
        if (!rescheduleDate || !rescheduleTime) { toast.error('Pick date & time'); return; }
        try {
            setRescheduling(true);
            await rescheduleInterview(rescheduleModal.interview.id, {
                date: rescheduleDate,
                time: rescheduleTime,
                meetingLink: rescheduleMeetingLink,
            });
            toast.success('Interview rescheduled');
            setRescheduleModal({ open: false, interview: null });
        } catch (err) {
            console.error(err);
            toast.error('Failed to reschedule');
        } finally {
            setRescheduling(false);
        }
    };

    const handleCancel = async (id) => {
        if (!window.confirm('Are you sure you want to cancel this interview?')) return;
        try {
            await cancelInterview(id);
            toast.success('Interview cancelled');
        } catch (err) {
            console.error(err);
            toast.error('Failed to cancel');
        }
    };

    const handleComplete = async (id) => {
        try {
            await completeInterview(id);
            toast.success('Interview marked as completed');
        } catch (err) {
            console.error(err);
            toast.error('Failed to update');
        }
    };

    // ─── helpers ───────────────────────────────────────────────

    const fmtDate = (d) => {
        try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
        catch { return d; }
    };

    const fmtTime = (t) => {
        try {
            const [h, m] = t.split(':');
            const hr = parseInt(h, 10);
            return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
        } catch { return t; }
    };

    // ─── render ────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Interview Scheduling</h1>
                    <p className="text-gray-500 mt-1">Schedule and manage candidate interviews</p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Schedule Interview
                    </button>
                )}
            </div>

            {/* ─── Schedule Form ─────────────────────────────── */}
            {showForm && (
                <div className="bg-white rounded-xl shadow-sm border p-6 space-y-5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">New Interview</h2>
                        <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Job select */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <BriefcaseIcon className="w-4 h-4 inline mr-1" />
                            Select Job Posting
                        </label>
                        <select
                            value={selectedJobId}
                            onChange={(e) => setSelectedJobId(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                            <option value="">— Choose a job —</option>
                            {jobs.map((j) => (
                                <option key={j.id} value={j.id}>
                                    {j.title} — {j.companyName}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Candidates */}
                    {selectedJobId && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <UserGroupIcon className="w-4 h-4 inline mr-1" />
                                Select Candidates ({selectedStudents.length} selected)
                            </label>
                            {loadingCandidates ? (
                                <p className="text-sm text-gray-400">Loading candidates…</p>
                            ) : candidates.length === 0 ? (
                                <p className="text-sm text-gray-400">No shortlisted candidates for this job.</p>
                            ) : (
                                <div className="grid sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                                    {candidates.map((c) => (
                                        <label
                                            key={c.studentId}
                                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedStudents.includes(c.studentId) ? 'bg-primary-50 border border-primary-300' : 'hover:bg-gray-50 border border-transparent'}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedStudents.includes(c.studentId)}
                                                onChange={() => toggleStudent(c.studentId)}
                                                className="h-4 w-4 text-primary-600 rounded border-gray-300"
                                            />
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{c.studentName || 'Unknown'}</p>
                                                <p className="text-xs text-gray-500 truncate">{c.studentEmail || ''}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Date + Time */}
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <CalendarIcon className="w-4 h-4 inline mr-1" />
                                Date
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <ClockIcon className="w-4 h-4 inline mr-1" />
                                Time
                            </label>
                            <input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                    </div>

                    {/* Meeting link */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <LinkIcon className="w-4 h-4 inline mr-1" />
                            Meeting Link <span className="text-gray-400">(optional)</span>
                        </label>
                        <input
                            type="url"
                            value={meetingLink}
                            onChange={(e) => setMeetingLink(e.target.value)}
                            placeholder="https://meet.google.com/..."
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={resetForm} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                            Cancel
                        </button>
                        <button
                            onClick={handleSchedule}
                            disabled={submitting}
                            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                        >
                            {submitting ? 'Scheduling…' : 'Schedule Interview'}
                        </button>
                    </div>
                </div>
            )}

            {/* ─── Existing Interviews ──────────────────────── */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">All Interviews</h2>
                {loadingInterviews ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                    </div>
                ) : interviews.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border p-10 text-center">
                        <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No interviews scheduled yet</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {interviews.map((iv) => (
                            <div key={iv.id} className="bg-white rounded-xl shadow-sm border p-5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-gray-900">{iv.companyName}</h3>
                                            <InterviewStatusBadge status={iv.status} />
                                        </div>
                                        <p className="text-sm text-gray-600">{iv.role}</p>
                                        <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-1">
                                            <span className="flex items-center gap-1">
                                                <CalendarIcon className="w-4 h-4" /> {fmtDate(iv.date)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <ClockIcon className="w-4 h-4" /> {fmtTime(iv.time)}
                                            </span>
                                        </div>
                                        {iv.meetingLink && (
                                            <a href={iv.meetingLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline mt-1">
                                                <LinkIcon className="w-4 h-4" /> Meeting Link
                                            </a>
                                        )}
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {iv.students?.map((sid) => (
                                                <span key={sid} className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                                                    {studentNames[sid] || sid.slice(0, 8)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    {(iv.status === INTERVIEW_STATUS.SCHEDULED || iv.status === INTERVIEW_STATUS.RESCHEDULED) && (
                                        <div className="flex gap-2 shrink-0">
                                            <button
                                                onClick={() => openReschedule(iv)}
                                                title="Reschedule"
                                                className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                                            >
                                                <ArrowPathIcon className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleComplete(iv.id)}
                                                title="Mark Completed"
                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                            >
                                                <CheckCircleIcon className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleCancel(iv.id)}
                                                title="Cancel"
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <XCircleIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── Reschedule Modal ─────────────────────────── */}
            {rescheduleModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">Reschedule Interview</h3>
                            <button onClick={() => setRescheduleModal({ open: false, interview: null })} className="text-gray-400 hover:text-gray-600">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Date</label>
                            <input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Time</label>
                            <input type="time" value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Link (optional)</label>
                            <input type="url" value={rescheduleMeetingLink} onChange={(e) => setRescheduleMeetingLink(e.target.value)} placeholder="https://meet.google.com/..." className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={() => setRescheduleModal({ open: false, interview: null })} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                            <button onClick={handleReschedule} disabled={rescheduling} className="px-5 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50">
                                {rescheduling ? 'Saving…' : 'Reschedule'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScheduleInterview;
