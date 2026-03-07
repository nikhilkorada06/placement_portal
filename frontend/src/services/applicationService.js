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
    writeBatch,
    increment,
} from 'firebase/firestore';
import { db } from '@config/firebase';
import { COLLECTIONS, APPLICATION_STATUS } from '@config/constants';

// Submit application
export const submitApplication = async (applicationData) => {
    try {
        const batch = writeBatch(db);

        // Check if already applied
        const existingApp = await getApplicationByJobAndStudent(
            applicationData.jobId,
            applicationData.studentId
        );

        if (existingApp) {
            throw new Error('Already applied to this job');
        }

        // Create application
        const appRef = doc(collection(db, COLLECTIONS.APPLICATIONS));
        batch.set(appRef, {
            ...applicationData,
            status: APPLICATION_STATUS.APPLIED,
            statusHistory: [{
                status: APPLICATION_STATUS.APPLIED,
                timestamp: Timestamp.now(),
                note: 'Application submitted',
            }],
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });

        // Increment job applications count
        const jobRef = doc(db, COLLECTIONS.JOBS, applicationData.jobId);
        batch.update(jobRef, {
            applicationsCount: increment(1),
        });

        await batch.commit();

        return { id: appRef.id, ...applicationData, status: APPLICATION_STATUS.APPLIED };
    } catch (error) {
        console.error('Error submitting application:', error);
        throw error;
    }
};

// Get application by ID
export const getApplication = async (applicationId) => {
    try {
        const appDoc = await getDoc(doc(db, COLLECTIONS.APPLICATIONS, applicationId));
        if (appDoc.exists()) {
            return { id: appDoc.id, ...appDoc.data() };
        }
        return null;
    } catch (error) {
        console.error('Error fetching application:', error);
        throw error;
    }
};

// Get student applications
export const getStudentApplications = async (studentId) => {
    try {
        const q = query(
            collection(db, COLLECTIONS.APPLICATIONS),
            where('studentId', '==', studentId),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        const applications = [];

        // Fetch job details for each application
        for (const docSnap of snapshot.docs) {
            const appData = { id: docSnap.id, ...docSnap.data() };
            const jobDoc = await getDoc(doc(db, COLLECTIONS.JOBS, appData.jobId));
            if (jobDoc.exists()) {
                appData.job = { id: jobDoc.id, ...jobDoc.data() };
            }
            applications.push(appData);
        }

        return applications;
    } catch (error) {
        console.error('Error fetching student applications:', error);
        throw error;
    }
};

// Get applications for a job
export const getJobApplications = async (jobId, filters = {}) => {
    try {
        const constraints = [
            where('jobId', '==', jobId),
            orderBy('createdAt', 'desc')
        ];

        if (filters.status) {
            constraints.push(where('status', '==', filters.status));
        }

        const q = query(collection(db, COLLECTIONS.APPLICATIONS), ...constraints);
        const snapshot = await getDocs(q);

        const applications = [];

        // Fetch student details for each application
        for (const docSnap of snapshot.docs) {
            const appData = { id: docSnap.id, ...docSnap.data() };
            const studentDoc = await getDoc(doc(db, COLLECTIONS.STUDENTS, appData.studentId));
            if (studentDoc.exists()) {
                appData.student = { id: studentDoc.id, ...studentDoc.data() };
            }
            applications.push(appData);
        }

        return applications;
    } catch (error) {
        console.error('Error fetching job applications:', error);
        throw error;
    }
};

// Update application status
export const updateApplicationStatus = async (applicationId, newStatus, note = '') => {
    try {
        const appRef = doc(db, COLLECTIONS.APPLICATIONS, applicationId);
        const appDoc = await getDoc(appRef);

        if (!appDoc.exists()) {
            throw new Error('Application not found');
        }

        const currentData = appDoc.data();
        const statusHistory = currentData.statusHistory || [];

        await updateDoc(appRef, {
            status: newStatus,
            statusHistory: [
                ...statusHistory,
                {
                    status: newStatus,
                    timestamp: Timestamp.now(),
                    note,
                }
            ],
            updatedAt: Timestamp.now(),
        });

        return true;
    } catch (error) {
        console.error('Error updating application status:', error);
        throw error;
    }
};

// Bulk update application status
export const bulkUpdateApplicationStatus = async (applicationIds, newStatus, note = '') => {
    try {
        const batch = writeBatch(db);

        for (const appId of applicationIds) {
            const appRef = doc(db, COLLECTIONS.APPLICATIONS, appId);
            const appDoc = await getDoc(appRef);

            if (appDoc.exists()) {
                const currentData = appDoc.data();
                const statusHistory = currentData.statusHistory || [];

                batch.update(appRef, {
                    status: newStatus,
                    statusHistory: [
                        ...statusHistory,
                        {
                            status: newStatus,
                            timestamp: Timestamp.now(),
                            note,
                        }
                    ],
                    updatedAt: Timestamp.now(),
                });
            }
        }

        await batch.commit();
        return true;
    } catch (error) {
        console.error('Error bulk updating applications:', error);
        throw error;
    }
};

// Get application by job and student
export const getApplicationByJobAndStudent = async (jobId, studentId) => {
    try {
        const q = query(
            collection(db, COLLECTIONS.APPLICATIONS),
            where('jobId', '==', jobId),
            where('studentId', '==', studentId)
        );

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        }
        return null;
    } catch (error) {
        console.error('Error checking application:', error);
        throw error;
    }
};

// Subscribe to student applications (real-time)
export const subscribeToStudentApplications = (studentId, callback) => {
    const q = query(
        collection(db, COLLECTIONS.APPLICATIONS),
        where('studentId', '==', studentId),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, async (snapshot) => {
        const applications = [];

        for (const docSnap of snapshot.docs) {
            const appData = { id: docSnap.id, ...docSnap.data() };
            const jobDoc = await getDoc(doc(db, COLLECTIONS.JOBS, appData.jobId));
            if (jobDoc.exists()) {
                appData.job = { id: jobDoc.id, ...jobDoc.data() };
            }
            applications.push(appData);
        }

        callback(applications);
    });
};

// Subscribe to job applications (real-time)
export const subscribeToJobApplications = (jobId, callback) => {
    const q = query(
        collection(db, COLLECTIONS.APPLICATIONS),
        where('jobId', '==', jobId),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, async (snapshot) => {
        const applications = [];

        for (const docSnap of snapshot.docs) {
            const appData = { id: docSnap.id, ...docSnap.data() };
            const studentDoc = await getDoc(doc(db, COLLECTIONS.STUDENTS, appData.studentId));
            if (studentDoc.exists()) {
                appData.student = { id: studentDoc.id, ...studentDoc.data() };
            }
            applications.push(appData);
        }

        callback(applications);
    });
};

// Get application statistics
export const getApplicationStats = async (jobId) => {
    try {
        const q = query(
            collection(db, COLLECTIONS.APPLICATIONS),
            where('jobId', '==', jobId)
        );

        const snapshot = await getDocs(q);
        const stats = {
            total: 0,
            applied: 0,
            shortlisted: 0,
            interviewScheduled: 0,
            selected: 0,
            rejected: 0,
        };

        snapshot.forEach(doc => {
            const data = doc.data();
            stats.total++;
            stats[data.status] = (stats[data.status] || 0) + 1;
        });

        return stats;
    } catch (error) {
        console.error('Error fetching application stats:', error);
        throw error;
    }
};

// Subscribe to all applications for a recruiter's jobs (real-time)
export const subscribeToRecruiterApplications = (jobIds, callback) => {
    if (!jobIds || jobIds.length === 0) {
        callback([]);
        return () => {};
    }

    // Firestore 'in' queries support max 30 items, chunk if needed
    const chunks = [];
    for (let i = 0; i < jobIds.length; i += 30) {
        chunks.push(jobIds.slice(i, i + 30));
    }

    const unsubscribes = [];
    const allApplications = new Map();

    chunks.forEach((chunk, chunkIndex) => {
        const q = query(
            collection(db, COLLECTIONS.APPLICATIONS),
            where('jobId', 'in', chunk)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            // Update applications for this chunk
            snapshot.docs.forEach(docSnap => {
                allApplications.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
            });

            // Remove docs that no longer exist
            const currentIds = new Set(snapshot.docs.map(d => d.id));
            for (const [key, value] of allApplications) {
                if (chunk.includes(value.jobId) && !currentIds.has(key)) {
                    allApplications.delete(key);
                }
            }

            callback(Array.from(allApplications.values()));
        }, (error) => {
            console.error('Error subscribing to recruiter applications:', error);
        });

        unsubscribes.push(unsub);
    });

    return () => unsubscribes.forEach(unsub => unsub());
};

export default {
    submitApplication,
    getApplication,
    getStudentApplications,
    getJobApplications,
    updateApplicationStatus,
    bulkUpdateApplicationStatus,
    getApplicationByJobAndStudent,
    subscribeToStudentApplications,
    subscribeToJobApplications,
    getApplicationStats,
    subscribeToRecruiterApplications,
};
