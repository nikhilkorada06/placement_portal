import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    query,
    where,
    orderBy,
    Timestamp,
    onSnapshot,
} from 'firebase/firestore';
import { db } from '@config/firebase';
import { COLLECTIONS, INTERVIEW_STATUS } from '@config/constants';
import { createNotification } from '@services/notificationService';
import {
    sendInterviewScheduledEmail,
    sendInterviewRescheduledEmail,
    sendInterviewCancelledEmail,
    sendInterviewReminderEmail,
} from '@services/emailService';

/**
 * Resolve student name & email from students → users fallback.
 */
const resolveStudentInfo = async (studentId) => {
    const studentDoc = await getDoc(doc(db, COLLECTIONS.STUDENTS, studentId));
    let name = '';
    let email = '';
    if (studentDoc.exists()) {
        const d = studentDoc.data();
        name = d.fullName || d.name || '';
        email = d.email || '';
    }
    if (!email) {
        const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, studentId));
        if (userDoc.exists()) {
            const u = userDoc.data();
            email = u.email || '';
            if (!name) name = u.fullName || u.displayName || '';
        }
    }
    return { name, email };
};

/**
 * Format a date string for display in emails / notifications.
 */
const formatDateForDisplay = (dateStr) => {
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
        return dateStr;
    }
};

/**
 * Format time to 12-hour format.
 */
const formatTimeForDisplay = (timeStr) => {
    try {
        const [h, m] = timeStr.split(':');
        const hour = parseInt(h, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const h12 = hour % 12 || 12;
        return `${h12}:${m} ${ampm}`;
    } catch {
        return timeStr;
    }
};

// ─── Schedule a new interview ──────────────────────────────────
export const scheduleInterview = async ({
    recruiterId,
    jobId,
    students, // array of student IDs
    companyName,
    role,
    date,     // "YYYY-MM-DD"
    time,     // "HH:mm"
    meetingLink,
}) => {
    const interviewRef = await addDoc(collection(db, COLLECTIONS.INTERVIEWS), {
        recruiterId,
        jobId,
        students,
        companyName,
        role,
        date,
        time,
        meetingLink: meetingLink || '',
        status: INTERVIEW_STATUS.SCHEDULED,
        createdAt: Timestamp.now(),
    });

    const displayDate = formatDateForDisplay(date);
    const displayTime = formatTimeForDisplay(time);

    // Notify + email each student (fire-and-forget)
    for (const sid of students) {
        resolveStudentInfo(sid).then(({ name, email }) => {
            createNotification({
                userId: sid,
                type: 'interview_scheduled',
                title: 'Interview Scheduled',
                message: `Interview for "${role}" at ${companyName} on ${displayDate} at ${displayTime}`,
                data: { interviewId: interviewRef.id, jobId },
            });
            if (email) {
                sendInterviewScheduledEmail(email, name, companyName, role, displayDate, displayTime, meetingLink);
            }
        });
    }

    return interviewRef.id;
};

// ─── Reschedule an interview ───────────────────────────────────
export const rescheduleInterview = async (interviewId, { date, time, meetingLink }) => {
    const ref = doc(db, COLLECTIONS.INTERVIEWS, interviewId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Interview not found');

    const prev = snap.data();
    await updateDoc(ref, {
        date,
        time,
        meetingLink: meetingLink ?? prev.meetingLink,
        status: INTERVIEW_STATUS.RESCHEDULED,
    });

    const displayDate = formatDateForDisplay(date);
    const displayTime = formatTimeForDisplay(time);

    for (const sid of prev.students) {
        resolveStudentInfo(sid).then(({ name, email }) => {
            createNotification({
                userId: sid,
                type: 'interview_scheduled',
                title: 'Interview Rescheduled',
                message: `Interview for "${prev.role}" at ${prev.companyName} rescheduled to ${displayDate} at ${displayTime}`,
                data: { interviewId, jobId: prev.jobId },
            });
            if (email) {
                sendInterviewRescheduledEmail(email, name, prev.companyName, prev.role, displayDate, displayTime, meetingLink ?? prev.meetingLink);
            }
        });
    }
};

// ─── Cancel an interview ───────────────────────────────────────
export const cancelInterview = async (interviewId) => {
    const ref = doc(db, COLLECTIONS.INTERVIEWS, interviewId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Interview not found');

    const prev = snap.data();
    await updateDoc(ref, { status: INTERVIEW_STATUS.CANCELLED });

    for (const sid of prev.students) {
        resolveStudentInfo(sid).then(({ name, email }) => {
            createNotification({
                userId: sid,
                type: 'interview_cancelled',
                title: 'Interview Cancelled',
                message: `Interview for "${prev.role}" at ${prev.companyName} has been cancelled`,
                data: { interviewId, jobId: prev.jobId },
            });
            if (email) {
                sendInterviewCancelledEmail(email, name, prev.companyName, prev.role);
            }
        });
    }
};

// ─── Mark an interview as completed ────────────────────────────
export const completeInterview = async (interviewId) => {
    const ref = doc(db, COLLECTIONS.INTERVIEWS, interviewId);
    await updateDoc(ref, { status: INTERVIEW_STATUS.COMPLETED });
};

// ─── Fetch interviews for a recruiter ──────────────────────────
export const getRecruiterInterviews = async (recruiterId) => {
    const q = query(
        collection(db, COLLECTIONS.INTERVIEWS),
        where('recruiterId', '==', recruiterId),
        orderBy('date', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ─── Subscribe (real-time) to student interviews ───────────────
export const subscribeToStudentInterviews = (studentId, callback) => {
    const q = query(
        collection(db, COLLECTIONS.INTERVIEWS),
        where('students', 'array-contains', studentId),
    );
    return onSnapshot(q, (snap) => {
        const interviews = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Sort newest date first
        interviews.sort((a, b) => (b.date > a.date ? 1 : -1));
        callback(interviews);
    });
};

// ─── Subscribe (real-time) to recruiter interviews ─────────────
export const subscribeToRecruiterInterviews = (recruiterId, callback) => {
    const q = query(
        collection(db, COLLECTIONS.INTERVIEWS),
        where('recruiterId', '==', recruiterId),
    );
    return onSnapshot(q, (snap) => {
        const interviews = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        interviews.sort((a, b) => (b.date > a.date ? 1 : -1));
        callback(interviews);
    });
};

// ─── Interview reminder check ──────────────────────────────────
// Call this periodically (e.g. every 5 minutes) from the student dashboard.
// Sends a reminder notification + email 1 hour before interview.
const REMINDER_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const sentReminders = new Set(); // in-memory guard to avoid duplicate reminders in one session

export const checkAndSendReminders = async (studentId) => {
    const q = query(
        collection(db, COLLECTIONS.INTERVIEWS),
        where('students', 'array-contains', studentId),
        where('status', 'in', [INTERVIEW_STATUS.SCHEDULED, INTERVIEW_STATUS.RESCHEDULED]),
    );
    const snap = await getDocs(q);

    const now = Date.now();

    for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const key = `${docSnap.id}_${studentId}`;
        if (sentReminders.has(key)) continue;

        try {
            const interviewTime = new Date(`${data.date}T${data.time}`).getTime();
            const diff = interviewTime - now;

            if (diff > 0 && diff <= REMINDER_WINDOW_MS) {
                sentReminders.add(key);
                const displayDate = formatDateForDisplay(data.date);
                const displayTime = formatTimeForDisplay(data.time);

                createNotification({
                    userId: studentId,
                    type: 'interview_reminder',
                    title: 'Interview Reminder',
                    message: `Your interview with ${data.companyName} for "${data.role}" starts in about 1 hour`,
                    data: { interviewId: docSnap.id, jobId: data.jobId },
                });

                const { name, email } = await resolveStudentInfo(studentId);
                if (email) {
                    sendInterviewReminderEmail(email, name, data.companyName, data.role, displayDate, displayTime);
                }
            }
        } catch {
            // ignore parse errors
        }
    }
};
