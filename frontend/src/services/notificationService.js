import {
    collection,
    doc,
    addDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    onSnapshot,
    Timestamp,
    writeBatch,
} from 'firebase/firestore';
import { db } from '@config/firebase';
import { COLLECTIONS, NOTIFICATION_TYPES } from '@config/constants';

// Create notification
export const createNotification = async (notificationData) => {
    try {
        const notification = {
            ...notificationData,
            isRead: false,
            createdAt: Timestamp.now(),
        };

        const docRef = await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), notification);
        return { id: docRef.id, ...notification };
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
};

// Create application status notification
export const createApplicationStatusNotification = async (
    userId,
    applicationId,
    jobTitle,
    newStatus
) => {
    return await createNotification({
        userId,
        type: NOTIFICATION_TYPES.APPLICATION_STATUS,
        title: 'Application Status Updated',
        message: `Your application for "${jobTitle}" has been ${newStatus}`,
        data: {
            applicationId,
            status: newStatus,
        },
    });
};

// Create interview scheduled notification
export const createInterviewNotification = async (
    userId,
    interviewId,
    jobTitle,
    interviewDate
) => {
    return await createNotification({
        userId,
        type: NOTIFICATION_TYPES.INTERVIEW_SCHEDULED,
        title: 'Interview Scheduled',
        message: `Interview scheduled for "${jobTitle}" on ${interviewDate}`,
        data: {
            interviewId,
        },
    });
};

// Create new job notification
export const createNewJobNotification = async (userId, jobId, jobTitle) => {
    return await createNotification({
        userId,
        type: NOTIFICATION_TYPES.NEW_JOB,
        title: 'New Job Posted',
        message: `Check out the new opportunity: "${jobTitle}"`,
        data: {
            jobId,
        },
    });
};

// Create application received notification (for recruiters)
export const createApplicationReceivedNotification = async (
    recruiterId,
    applicationId,
    studentName,
    jobTitle
) => {
    return await createNotification({
        userId: recruiterId,
        type: NOTIFICATION_TYPES.APPLICATION_RECEIVED,
        title: 'New Application Received',
        message: `${studentName} applied for "${jobTitle}"`,
        data: {
            applicationId,
        },
    });
};

// Create account verified notification
export const createAccountVerifiedNotification = async (userId, role) => {
    return await createNotification({
        userId,
        type: NOTIFICATION_TYPES.ACCOUNT_VERIFIED,
        title: 'Account Verified',
        message: `Your ${role} account has been verified by the admin. Welcome to CareerOS!`,
        data: { role },
    });
};

// Create job approved notification (for recruiter)
export const createJobApprovedNotification = async (recruiterId, jobId, jobTitle) => {
    return await createNotification({
        userId: recruiterId,
        type: NOTIFICATION_TYPES.JOB_APPROVED,
        title: 'Job Posting Approved',
        message: `Your job posting "${jobTitle}" has been approved and is now live for students.`,
        data: { jobId },
    });
};

// Get user notifications
export const getUserNotifications = async (userId, limitCount = 50) => {
    try {
        const q = query(
            collection(db, COLLECTIONS.NOTIFICATIONS),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );

        const snapshot = await getDocs(q);
        const notifications = [];

        snapshot.forEach(doc => {
            notifications.push({ id: doc.id, ...doc.data() });
        });

        return notifications;
    } catch (error) {
        console.error('Error fetching notifications:', error);
        throw error;
    }
};

// Get unread notifications count
export const getUnreadCount = async (userId) => {
    try {
        const q = query(
            collection(db, COLLECTIONS.NOTIFICATIONS),
            where('userId', '==', userId),
            where('isRead', '==', false)
        );

        const snapshot = await getDocs(q);
        return snapshot.size;
    } catch (error) {
        console.error('Error fetching unread count:', error);
        throw error;
    }
};

// Mark notification as read
export const markAsRead = async (notificationId) => {
    try {
        const notificationRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId);
        await updateDoc(notificationRef, {
            isRead: true,
            readAt: Timestamp.now(),
        });
        return true;
    } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error;
    }
};

// Mark all notifications as read
export const markAllAsRead = async (userId) => {
    try {
        const q = query(
            collection(db, COLLECTIONS.NOTIFICATIONS),
            where('userId', '==', userId),
            where('isRead', '==', false)
        );

        const snapshot = await getDocs(q);
        const batch = writeBatch(db);

        snapshot.forEach(doc => {
            batch.update(doc.ref, {
                isRead: true,
                readAt: Timestamp.now(),
            });
        });

        await batch.commit();
        return true;
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        throw error;
    }
};

// Subscribe to notifications (real-time)
export const subscribeToNotifications = (userId, callback) => {
    const q = query(
        collection(db, COLLECTIONS.NOTIFICATIONS),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
    );

    return onSnapshot(q, (snapshot) => {
        const notifications = [];
        snapshot.forEach(doc => {
            notifications.push({ id: doc.id, ...doc.data() });
        });
        callback(notifications);
    });
};

// Subscribe to unread count (real-time)
export const subscribeToUnreadCount = (userId, callback) => {
    const q = query(
        collection(db, COLLECTIONS.NOTIFICATIONS),
        where('userId', '==', userId),
        where('isRead', '==', false)
    );

    return onSnapshot(q, (snapshot) => {
        callback(snapshot.size);
    });
};

export default {
    createNotification,
    createApplicationStatusNotification,
    createInterviewNotification,
    createNewJobNotification,
    createApplicationReceivedNotification,
    createAccountVerifiedNotification,
    createJobApprovedNotification,
    getUserNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    subscribeToNotifications,
    subscribeToUnreadCount,
};
