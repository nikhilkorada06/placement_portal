const functions = require('firebase-functions');
const admin = require('firebase-admin');

const db = admin.firestore();

// Get placement statistics
exports.getPlacementStats = functions.https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    try {
        const stats = {
            totalStudents: 0,
            totalApplications: 0,
            totalPlacements: 0,
            totalJobs: 0,
            avgSalary: 0,
            topRecruiters: [],
            placementsByBranch: {},
            applicationsByStatus: {},
        };

        // Get total students
        const studentsSnapshot = await db.collection('students').count().get();
        stats.totalStudents = studentsSnapshot.data().count;

        // Get total active jobs
        const jobsSnapshot = await db.collection('jobs').where('isActive', '==', true).count().get();
        stats.totalJobs = jobsSnapshot.data().count;

        // Get all applications
        const applicationsSnapshot = await db.collection('applications').get();
        stats.totalApplications = applicationsSnapshot.size;

        // Count applications by status
        applicationsSnapshot.forEach((doc) => {
            const app = doc.data();
            stats.applicationsByStatus[app.status] = (stats.applicationsByStatus[app.status] || 0) + 1;
        });

        // Count placements (selected applications)
        stats.totalPlacements = stats.applicationsByStatus['selected'] || 0;

        // Calculate average salary
        const selectedApps = applicationsSnapshot.docs.filter(doc => doc.data().status === 'selected');
        if (selectedApps.length > 0) {
            const totalSalary = selectedApps.reduce((sum, doc) => {
                const app = doc.data();
                return sum + (app.offeredSalary || 0);
            }, 0);
            stats.avgSalary = totalSalary / selectedApps.length;
        }

        return stats;
    } catch (error) {
        console.error('Error fetching placement stats:', error);
        throw new functions.https.HttpsError('internal', 'Failed to fetch statistics');
    }
});

// Get recruiter analytics
exports.getRecruiterAnalytics = functions.https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const recruiterId = data.recruiterId || context.auth.uid;

    try {
        const analytics = {
            activeJobs: 0,
            totalApplications: 0,
            shortlisted: 0,
            interviewed: 0,
            selected: 0,
            jobsBreakdown: [],
        };

        // Get recruiter's jobs
        const jobsSnapshot = await db.collection('jobs')
            .where('recruiterId', '==', recruiterId)
            .get();

        analytics.activeJobs = jobsSnapshot.size;

        // Get applications for each job
        for (const jobDoc of jobsSnapshot.docs) {
            const jobData = jobDoc.data();
            const applicationsSnapshot = await db.collection('applications')
                .where('jobId', '==', jobDoc.id)
                .get();

            const jobStats = {
                jobId: jobDoc.id,
                title: jobData.title,
                totalApps: applicationsSnapshot.size,
                shortlisted: 0,
                interviewed: 0,
                selected: 0,
            };

            applicationsSnapshot.forEach((appDoc) => {
                const app = appDoc.data();
                analytics.totalApplications++;

                if (app.status === 'shortlisted') {
                    jobStats.shortlisted++;
                    analytics.shortlisted++;
                } else if (app.status === 'interview_scheduled') {
                    jobStats.interviewed++;
                    analytics.interviewed++;
                } else if (app.status === 'selected') {
                    jobStats.selected++;
                    analytics.selected++;
                }
            });

            analytics.jobsBreakdown.push(jobStats);
        }

        return analytics;
    } catch (error) {
        console.error('Error fetching recruiter analytics:', error);
        throw new functions.https.HttpsError('internal', 'Failed to fetch analytics');
    }
});

module.exports = {
    getPlacementStats: exports.getPlacementStats,
    getRecruiterAnalytics: exports.getRecruiterAnalytics,
};
