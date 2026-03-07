const functions = require('firebase-functions');
const admin = require('firebase-admin');

const db = admin.firestore();

// Trigger when application status changes
exports.onApplicationStatusChange = functions.firestore
    .document('applications/{applicationId}')
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();

        // Check if status actually changed
        if (before.status === after.status) {
            return null;
        }

        try {
            // Get job details
            const jobDoc = await db.collection('jobs').doc(after.jobId).get();
            const jobData = jobDoc.data();

            // Get student details
            const studentDoc = await db.collection('students').doc(after.studentId).get();
            const studentData = studentDoc.data();

            // Create notification for student
            await db.collection('notifications').add({
                userId: after.studentId,
                type: 'application_status',
                title: 'Application Status Updated',
                message: `Your application for "${jobData.title}" has been ${after.status}`,
                data: {
                    applicationId: context.params.applicationId,
                    jobId: after.jobId,
                    status: after.status,
                },
                isRead: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Create notification for recruiter
            await db.collection('notifications').add({
                userId: jobData.recruiterId,
                type: 'application_update',
                title: 'Application Updated',
                message: `${studentData.fullName}'s application status changed to ${after.status}`,
                data: {
                    applicationId: context.params.applicationId,
                    jobId: after.jobId,
                    studentId: after.studentId,
                },
                isRead: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(`Notifications sent for application ${context.params.applicationId}`);
            return null;
        } catch (error) {
            console.error('Error creating notifications:', error);
            throw error;
        }
    });

// Trigger when a new application is created
exports.onNewApplication = functions.firestore
    .document('applications/{applicationId}')
    .onCreate(async (snap, context) => {
        const application = snap.data();

        try {
            // Get job details
            const jobDoc = await db.collection('jobs').doc(application.jobId).get();
            const jobData = jobDoc.data();

            // Get student details
            const studentDoc = await db.collection('students').doc(application.studentId).get();
            const studentData = studentDoc.data();

            // Notify recruiter about new application
            await db.collection('notifications').add({
                userId: jobData.recruiterId,
                type: 'application_received',
                title: 'New Application Received',
                message: `${studentData.fullName} applied for "${jobData.title}"`,
                data: {
                    applicationId: context.params.applicationId,
                    jobId: application.jobId,
                    studentId: application.studentId,
                },
                isRead: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(`Notification sent for new application ${context.params.applicationId}`);
            return null;
        } catch (error) {
            console.error('Error notifying recruiter:', error);
            throw error;
        }
    });

module.exports = {
    onApplicationStatusChange: exports.onApplicationStatusChange,
    onNewApplication: exports.onNewApplication,
};
