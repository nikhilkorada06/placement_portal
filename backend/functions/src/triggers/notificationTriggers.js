const functions = require('firebase-functions');
const admin = require('firebase-admin');

const db = admin.firestore();

// Trigger when a new job is posted
exports.onNewJobPosted = functions.firestore
    .document('jobs/{jobId}')
    .onCreate(async (snap, context) => {
        const job = snap.data();

        try {
            // Get eligible students based on job criteria
            let studentsQuery = db.collection('students');

            // Apply filters based on job eligibility
            if (job.eligibility && job.eligibility.minCGPA) {
                studentsQuery = studentsQuery.where('cgpa', '>=', job.eligibility.minCGPA);
            }

            const studentsSnapshot = await studentsQuery.get();

            // Create batch notifications
            const batch = db.batch();
            let notificationCount = 0;

            studentsSnapshot.forEach((doc) => {
                const studentData = doc.data();

                // Additional client-side eligibility checks
                let isEligible = true;

                if (job.eligibility) {
                    // Check degree
                    if (job.eligibility.degrees && job.eligibility.degrees.length > 0) {
                        isEligible = isEligible && job.eligibility.degrees.includes(studentData.degree);
                    }

                    // Check branch
                    if (job.eligibility.branches && job.eligibility.branches.length > 0) {
                        isEligible = isEligible && job.eligibility.branches.includes(studentData.branch);
                    }

                    // Check graduation year
                    if (job.eligibility.graduationYears && job.eligibility.graduationYears.length > 0) {
                        isEligible = isEligible && job.eligibility.graduationYears.includes(studentData.graduationYear);
                    }
                }

                if (isEligible) {
                    const notificationRef = db.collection('notifications').doc();
                    batch.set(notificationRef, {
                        userId: doc.id,
                        type: 'new_job',
                        title: 'New Job Opportunity',
                        message: `Check out: "${job.title}" at ${job.companyName}`,
                        data: {
                            jobId: context.params.jobId,
                        },
                        isRead: false,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    notificationCount++;
                }
            });

            await batch.commit();
            console.log(`Sent ${notificationCount} notifications for new job ${context.params.jobId}`);
            return null;
        } catch (error) {
            console.error('Error sending job notifications:', error);
            throw error;
        }
    });

module.exports = {
    onNewJobPosted: exports.onNewJobPosted,
};
