const functions = require('firebase-functions');
const admin = require('firebase-admin');

const db = admin.firestore();

// Generate placement report
exports.generatePlacementReport = functions.https.onCall(async (data, context) => {
    // Verify authentication and admin role
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Check if user is admin
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can generate reports');
    }

    const { startDate, endDate, format = 'json' } = data;

    try {
        let applicationsQuery = db.collection('applications');

        // Filter by date if provided
        if (startDate) {
            applicationsQuery = applicationsQuery.where('createdAt', '>=', new Date(startDate));
        }
        if (endDate) {
            applicationsQuery = applicationsQuery.where('createdAt', '<=', new Date(endDate));
        }

        const applicationsSnapshot = await applicationsQuery.get();

        const report = {
            generatedAt: new Date().toISOString(),
            period: { startDate, endDate },
            summary: {
                totalApplications: applicationsSnapshot.size,
                byStatus: {},
                byCompany: {},
                byBranch: {},
            },
            applications: [],
        };

        // Process applications
        for (const appDoc of applicationsSnapshot.docs) {
            const app = appDoc.data();

            // Count by status
            report.summary.byStatus[app.status] = (report.summary.byStatus[app.status] || 0) + 1;

            // Get job and student details
            const jobDoc = await db.collection('jobs').doc(app.jobId).get();
            const studentDoc = await db.collection('students').doc(app.studentId).get();

            if (jobDoc.exists && studentDoc.exists) {
                const jobData = jobDoc.data();
                const studentData = studentDoc.data();

                // Count by company
                report.summary.byCompany[jobData.companyName] =
                    (report.summary.byCompany[jobData.companyName] || 0) + 1;

                // Count by branch
                report.summary.byBranch[studentData.branch] =
                    (report.summary.byBranch[studentData.branch] || 0) + 1;

                report.applications.push({
                    applicationId: appDoc.id,
                    studentName: studentData.fullName,
                    rollNumber: studentData.rollNumber,
                    branch: studentData.branch,
                    company: jobData.companyName,
                    jobTitle: jobData.title,
                    status: app.status,
                    appliedAt: app.createdAt,
                    offeredSalary: app.offeredSalary || null,
                });
            }
        }

        // Store report in Firestore
        const reportRef = await db.collection('reports').add({
            type: 'placement',
            ...report,
            createdBy: context.auth.uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return {
            reportId: reportRef.id,
            report,
        };
    } catch (error) {
        console.error('Error generating report:', error);
        throw new functions.https.HttpsError('internal', 'Failed to generate report');
    }
});

// Export report as CSV
exports.exportReportAsCSV = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { reportId } = data;

    try {
        const reportDoc = await db.collection('reports').doc(reportId).get();
        if (!reportDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Report not found');
        }

        const report = reportDoc.data();

        // Generate CSV content
        let csv = 'Student Name,Roll Number,Branch,Company,Job Title,Status,Applied At,Offered Salary\n';

        report.applications.forEach((app) => {
            csv += `${app.studentName},${app.rollNumber},${app.branch},${app.company},${app.jobTitle},${app.status},${app.appliedAt},${app.offeredSalary || 'N/A'}\n`;
        });

        return {
            csv,
            filename: `placement_report_${reportId}.csv`,
        };
    } catch (error) {
        console.error('Error exporting CSV:', error);
        throw new functions.https.HttpsError('internal', 'Failed to export CSV');
    }
});

module.exports = {
    generatePlacementReport: exports.generatePlacementReport,
    exportReportAsCSV: exports.exportReportAsCSV,
};
