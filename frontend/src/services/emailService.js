import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

// General-purpose notification template (everything except OTP)
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_NOTIFICATION;

export const initEmailJS = () => {
    if (PUBLIC_KEY) {
        emailjs.init({ publicKey: PUBLIC_KEY });
    }
};

/**
 * Send an email using the general content template.
 * Mirrors the working OTP email pattern from AuthContext.
 */
const sendContentEmail = async (toEmail, content) => {
    if (!SERVICE_ID || !PUBLIC_KEY || !TEMPLATE_ID) {
        console.warn('EmailJS not configured — skipping email send');
        return null;
    }

    const recipientEmail = (toEmail || '').trim().toLowerCase();
    if (!recipientEmail) {
        console.error('Recipient email is missing');
        return null;
    }

    try {
        const result = await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
            to_email: recipientEmail,
            email: recipientEmail,
            user_email: recipientEmail,
            recipient_email: recipientEmail,
            content: content,
            from_name: 'CareerOS',
        });
        return result;
    } catch (error) {
        console.error('EmailJS send error:', error?.status, error?.text || error);
        return null;
    }
};

// Account verified by admin
export const sendAccountVerifiedEmail = async ({ toEmail, toName, role }) => {
    const content = `Hi ${toName},\n\nYour ${role} account on CareerOS has been verified by the admin. You can now log in and access your dashboard.\n\nWelcome aboard!`;
    return sendContentEmail(toEmail, content);
};

// Job approved by admin → sent to recruiter
export const sendJobApprovedEmail = async ({ toEmail, toName, jobTitle, companyName }) => {
    const content = `Hi ${toName},\n\nYour job posting "${jobTitle}" at ${companyName} has been approved by the admin and is now live for students.\n\nYou can track applications from your recruiter dashboard.`;
    return sendContentEmail(toEmail, content);
};

// New job notification → sent to students
export const sendNewJobEmailToStudent = async ({ toEmail, toName, jobTitle, companyName }) => {
    const content = `Hi ${toName},\n\nA new job "${jobTitle}" from ${companyName} has been posted on CareerOS.\n\nLog in to your dashboard to check it out and apply!`;
    return sendContentEmail(toEmail, content);
};

// Application status update (shortlisted / selected / placed / rejected)
export const sendApplicationStatusEmail = async ({ toEmail, toName, jobTitle, status, companyName }) => {
    const statusMessages = {
        shortlisted: `Congratulations ${toName}!\n\nYou have been shortlisted for "${jobTitle}" at ${companyName}.\n\nStay tuned for the next steps.`,
        selected: `Great news ${toName}!\n\nYou have been selected for "${jobTitle}" at ${companyName}.`,
        placed: `Congratulations ${toName}!\n\nYou have been placed at ${companyName} for the position "${jobTitle}".\n\nWishing you all the best!`,
        rejected: `Hi ${toName},\n\nWe regret to inform you that your application for "${jobTitle}" at ${companyName} was not selected this time.\n\nKeep applying — new opportunities are posted regularly!`,
    };

    const content = statusMessages[status] || `Hi ${toName},\n\nYour application status for "${jobTitle}" has been updated to: ${status}.`;
    return sendContentEmail(toEmail, content);
};

// Interview scheduled
export const sendInterviewScheduledEmail = async (studentEmail, studentName, companyName, role, date, time, meetingLink) => {
    const content = `Hello ${studentName},\n\nYou have been scheduled for an interview.\n\nCompany: ${companyName}\nRole: ${role}\nDate: ${date}\nTime: ${time}${meetingLink ? `\nMeeting Link: ${meetingLink}` : ''}\n\nPlease check your CareerOS dashboard for details.\n\nBest regards,\nCareerOS Team`;
    return sendContentEmail(studentEmail, content);
};

// Interview rescheduled
export const sendInterviewRescheduledEmail = async (studentEmail, studentName, companyName, role, date, time, meetingLink) => {
    const content = `Hello ${studentName},\n\nYour interview has been rescheduled.\n\nCompany: ${companyName}\nRole: ${role}\nNew Date: ${date}\nNew Time: ${time}${meetingLink ? `\nMeeting Link: ${meetingLink}` : ''}\n\nPlease check your CareerOS dashboard for the updated details.\n\nBest regards,\nCareerOS Team`;
    return sendContentEmail(studentEmail, content);
};

// Interview cancelled
export const sendInterviewCancelledEmail = async (studentEmail, studentName, companyName, role) => {
    const content = `Hello ${studentName},\n\nYour interview with ${companyName} for the ${role} position has been cancelled.\n\nPlease check your CareerOS dashboard for more details.\n\nBest regards,\nCareerOS Team`;
    return sendContentEmail(studentEmail, content);
};

// Interview reminder (1 hour before)
export const sendInterviewReminderEmail = async (studentEmail, studentName, companyName, role, date, time) => {
    const content = `Hello ${studentName},\n\nThis is a reminder that your interview with ${companyName} starts in 1 hour.\n\nRole: ${role}\nDate: ${date}\nTime: ${time}\n\nPlease be prepared.\n\nBest regards,\nCareerOS Team`;
    return sendContentEmail(studentEmail, content);
};

export default {
    initEmailJS,
    sendAccountVerifiedEmail,
    sendJobApprovedEmail,
    sendNewJobEmailToStudent,
    sendApplicationStatusEmail,
    sendInterviewScheduledEmail,
    sendInterviewRescheduledEmail,
    sendInterviewCancelledEmail,
    sendInterviewReminderEmail,
};
