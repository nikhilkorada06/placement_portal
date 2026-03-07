import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    Timestamp,
    onSnapshot,
} from 'firebase/firestore';
import { db } from '@config/firebase';
import { COLLECTIONS, APPLICATION_STATUS } from '@config/constants';

// Get all jobs
export const getJobs = async (filters = {}, pagination = {}) => {
    try {
        let q = collection(db, COLLECTIONS.JOBS);
        const constraints = [];

        // Apply filters
        if (filters.type) {
            constraints.push(where('type', '==', filters.type));
        }
        if (filters.workMode) {
            constraints.push(where('workMode', '==', filters.workMode));
        }
        if (filters.minCGPA) {
            constraints.push(where('eligibility.minCGPA', '<=', filters.minCGPA));
        }
        if (filters.isActive !== undefined) {
            constraints.push(where('isActive', '==', filters.isActive));
        }

        // Add ordering
        constraints.push(orderBy('createdAt', 'desc'));

        // Add pagination
        if (pagination.pageSize) {
            constraints.push(limit(pagination.pageSize));
        }
        if (pagination.lastDoc) {
            constraints.push(startAfter(pagination.lastDoc));
        }

        q = query(q, ...constraints);
        const snapshot = await getDocs(q);

        const jobs = [];
        snapshot.forEach(doc => {
            jobs.push({ id: doc.id, ...doc.data() });
        });

        return {
            jobs,
            lastDoc: snapshot.docs[snapshot.docs.length - 1],
            hasMore: snapshot.docs.length === pagination.pageSize,
        };
    } catch (error) {
        console.error('Error fetching jobs:', error);
        throw error;
    }
};

// Get single job
export const getJob = async (jobId) => {
    try {
        const jobDoc = await getDoc(doc(db, COLLECTIONS.JOBS, jobId));
        if (jobDoc.exists()) {
            return { id: jobDoc.id, ...jobDoc.data() };
        }
        return null;
    } catch (error) {
        console.error('Error fetching job:', error);
        throw error;
    }
};

// Create job
export const createJob = async (jobData) => {
    try {
        const newJob = {
            ...jobData,
            isActive: true,
            applicationsCount: 0,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        const docRef = await addDoc(collection(db, COLLECTIONS.JOBS), newJob);
        return { id: docRef.id, ...newJob };
    } catch (error) {
        console.error('Error creating job:', error);
        throw error;
    }
};

// Update job
export const updateJob = async (jobId, jobData) => {
    try {
        const jobRef = doc(db, COLLECTIONS.JOBS, jobId);
        await updateDoc(jobRef, {
            ...jobData,
            updatedAt: Timestamp.now(),
        });
        return { id: jobId, ...jobData };
    } catch (error) {
        console.error('Error updating job:', error);
        throw error;
    }
};

// Delete job
export const deleteJob = async (jobId) => {
    try {
        await deleteDoc(doc(db, COLLECTIONS.JOBS, jobId));
        return true;
    } catch (error) {
        console.error('Error deleting job:', error);
        throw error;
    }
};

// Get jobs by recruiter
export const getJobsByRecruiter = async (recruiterId) => {
    try {
        const q = query(
            collection(db, COLLECTIONS.JOBS),
            where('recruiterId', '==', recruiterId),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        const jobs = [];
        snapshot.forEach(doc => {
            jobs.push({ id: doc.id, ...doc.data() });
        });

        return jobs;
    } catch (error) {
        console.error('Error fetching recruiter jobs:', error);
        throw error;
    }
};

// Get eligible jobs for student
export const getEligibleJobs = async (studentProfile) => {
    try {
        const q = query(
            collection(db, COLLECTIONS.JOBS),
            where('isActive', '==', true),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        const jobs = [];

        snapshot.forEach(doc => {
            const job = { id: doc.id, ...doc.data() };
            // Client-side filtering for eligibility
            if (isStudentEligible(studentProfile, job)) {
                jobs.push(job);
            }
        });

        return jobs;
    } catch (error) {
        console.error('Error fetching eligible jobs:', error);
        throw error;
    }
};

// Check if student is eligible for job
const isStudentEligible = (studentProfile, job) => {
    const eligibility = job.eligibility || {};

    // Check CGPA
    if (eligibility.minCGPA && studentProfile.cgpa < eligibility.minCGPA) {
        return false;
    }

    // Check degree
    if (eligibility.degrees && eligibility.degrees.length > 0) {
        if (!eligibility.degrees.includes(studentProfile.degree)) {
            return false;
        }
    }

    // Check branch
    if (eligibility.branches && eligibility.branches.length > 0) {
        if (!eligibility.branches.includes(studentProfile.branch)) {
            return false;
        }
    }

    // Check graduation year
    if (eligibility.graduationYears && eligibility.graduationYears.length > 0) {
        if (!eligibility.graduationYears.includes(studentProfile.graduationYear)) {
            return false;
        }
    }

    return true;
};

// Subscribe to jobs (real-time)
export const subscribeToJobs = (callback, filters = {}) => {
    let q = collection(db, COLLECTIONS.JOBS);
    const constraints = [where('isActive', '==', true), orderBy('createdAt', 'desc')];

    if (filters.type) {
        constraints.push(where('type', '==', filters.type));
    }

    q = query(q, ...constraints);

    return onSnapshot(q, (snapshot) => {
        const jobs = [];
        snapshot.forEach(doc => {
            jobs.push({ id: doc.id, ...doc.data() });
        });
        callback(jobs);
    });
};

// Subscribe to recruiter's jobs (real-time)
export const subscribeToRecruiterJobs = (recruiterId, callback) => {
    const q = query(
        collection(db, COLLECTIONS.JOBS),
        where('recruiterId', '==', recruiterId),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const jobs = [];
        snapshot.forEach(docSnap => {
            jobs.push({ id: docSnap.id, ...docSnap.data() });
        });
        callback(jobs);
    }, (error) => {
        console.error('Error subscribing to recruiter jobs:', error);
    });
};

export default {
    getJobs,
    getJob,
    createJob,
    updateJob,
    deleteJob,
    getJobsByRecruiter,
    getEligibleJobs,
    subscribeToJobs,
    subscribeToRecruiterJobs,
};
