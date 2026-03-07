const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();

// Export all function modules
exports.notifications = require('./triggers/notificationTriggers');
exports.applications = require('./triggers/applicationTriggers');
exports.analytics = require('./controllers/analyticsController');
exports.reports = require('./controllers/reportsController');
exports.jobs = require('./controllers/jobsController');
