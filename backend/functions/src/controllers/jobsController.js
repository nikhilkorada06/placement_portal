const functions = require('firebase-functions');
const admin = require('firebase-admin');

const db = admin.firestore();

// Search jobs with filters
exports.searchJobs = functions.https.onCall(async (data, context) => {
    const { filters, limit = 20 } = data;

    try {
        let jobsQuery = db.collection('jobs').where('isActive', '==', true);

        // Apply filters
        if (filters) {
            if (filters.type) {
                jobsQuery = jobsQuery.where('type', '==', filters.type);
            }
            if (filters.workMode) {
                jobsQuery = jobsQuery.where('workMode', '==', filters.workMode);
            }
        }

        jobsQuery = jobsQuery.orderBy('createdAt', 'desc').limit(limit);

        const snapshot = await jobsQuery.get();
        const jobs = [];

        snapshot.forEach((doc) => {
            jobs.push({
                id: doc.id,
                ...doc.data(),
            });
        });

        return jobs;
    } catch (error) {
        console.error('Error searching jobs:', error);
        throw new functions.https.HttpsError('internal', 'Failed to search jobs');
    }
});

// Get job recommendations for a student
exports.getJobRecommendations = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const studentId = data.studentId || context.auth.uid;

    try {
        // Get student profile
        const studentDoc = await db.collection('students').doc(studentId).get();
        if (!studentDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Student profile not found');
        }

        const studentData = studentDoc.data();

        // Get all active jobs
        const jobsSnapshot = await db.collection('jobs')
            .where('isActive', '==', true)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        const recommendations = [];

        jobsSnapshot.forEach((doc) => {
            const job = doc.data();
            let score = 0;

            // Calculate recommendation score based on eligibility
            if (job.eligibility) {
                // CGPA match
                if (!job.eligibility.minCGPA || studentData.cgpa >= job.eligibility.minCGPA) {
                    score += 30;
                }

                // Degree match
                if (!job.eligibility.degrees || job.eligibility.degrees.length === 0 ||
                    job.eligibility.degrees.includes(studentData.degree)) {
                    score += 25;
                }

                // Branch match
                if (!job.eligibility.branches || job.eligibility.branches.length === 0 ||
                    job.eligibility.branches.includes(studentData.branch)) {
                    score += 25;
                }

                // Skills match
                if (job.requiredSkills && studentData.skills) {
                    const matchingSkills = job.requiredSkills.filter(skill =>
                        studentData.skills.some(s => s.toLowerCase() === skill.toLowerCase())
                    );
                    score += (matchingSkills.length / job.requiredSkills.length) * 20;
                }
            }

            // Only recommend if eligible (score > 50)
            if (score >= 50) {
                recommendations.push({
                    id: doc.id,
                    ...job,
                    recommendationScore: score,
                });
            }
        });

        // Sort by score
        recommendations.sort((a, b) => b.recommendationScore - a.recommendationScore);

        return recommendations.slice(0, 20);
    } catch (error) {
        console.error('Error getting recommendations:', error);
        throw new functions.https.HttpsError('internal', 'Failed to get recommendations');
    }
});

module.exports = {
    searchJobs: exports.searchJobs,
    getJobRecommendations: exports.getJobRecommendations,
};
