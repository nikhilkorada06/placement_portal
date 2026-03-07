// User Roles
export const USER_ROLES = {
    STUDENT: 'student',
    RECRUITER: 'recruiter',
    ADMIN: 'admin',
};

// Application Status
export const APPLICATION_STATUS = {
    APPLIED: 'applied',
    SHORTLISTED: 'shortlisted',
    INTERVIEW_SCHEDULED: 'interview_scheduled',
    SELECTED: 'selected',
    PLACED: 'placed',
    REJECTED: 'rejected',
};

// Application Status Labels
export const STATUS_LABELS = {
    [APPLICATION_STATUS.APPLIED]: 'Applied',
    [APPLICATION_STATUS.SHORTLISTED]: 'Shortlisted',
    [APPLICATION_STATUS.INTERVIEW_SCHEDULED]: 'Interview Scheduled',
    [APPLICATION_STATUS.SELECTED]: 'Selected',
    [APPLICATION_STATUS.PLACED]: 'Placed',
    [APPLICATION_STATUS.REJECTED]: 'Rejected',
};

// Application Status Colors
export const STATUS_COLORS = {
    [APPLICATION_STATUS.APPLIED]: 'bg-blue-100 text-blue-800',
    [APPLICATION_STATUS.SHORTLISTED]: 'bg-yellow-100 text-yellow-800',
    [APPLICATION_STATUS.INTERVIEW_SCHEDULED]: 'bg-purple-100 text-purple-800',
    [APPLICATION_STATUS.SELECTED]: 'bg-green-100 text-green-800',
    [APPLICATION_STATUS.PLACED]: 'bg-emerald-100 text-emerald-800',
    [APPLICATION_STATUS.REJECTED]: 'bg-red-100 text-red-800',
};

// Job Types
export const JOB_TYPES = {
    INTERNSHIP: 'internship',
    FULL_TIME: 'full_time',
    PART_TIME: 'part_time',
    CONTRACT: 'contract',
};

// Job Type Labels
export const JOB_TYPE_LABELS = {
    [JOB_TYPES.INTERNSHIP]: 'Internship',
    [JOB_TYPES.FULL_TIME]: 'Full Time',
    [JOB_TYPES.PART_TIME]: 'Part Time',
    [JOB_TYPES.CONTRACT]: 'Contract',
};

// Work Modes
export const WORK_MODES = {
    REMOTE: 'remote',
    HYBRID: 'hybrid',
    ONSITE: 'onsite',
};

// Notification Types
export const NOTIFICATION_TYPES = {
    APPLICATION_STATUS: 'application_status',
    INTERVIEW_SCHEDULED: 'interview_scheduled',
    NEW_JOB: 'new_job',
    APPLICATION_RECEIVED: 'application_received',
    PROFILE_UPDATE: 'profile_update',
    SYSTEM: 'system',
    ACCOUNT_VERIFIED: 'account_verified',
    JOB_APPROVED: 'job_approved',
};

// Firestore Collection Names
export const COLLECTIONS = {
    USERS: 'users',
    STUDENTS: 'students',
    RECRUITERS: 'recruiters',
    JOBS: 'jobs',
    APPLICATIONS: 'applications',
    INTERVIEWS: 'interviews',
    NOTIFICATIONS: 'notifications',
    REPORTS: 'reports',
    ANALYTICS: 'analytics',
    OTP_VERIFICATION: 'otpVerification',
};

// Storage Paths
export const STORAGE_PATHS = {
    RESUMES: 'resumes',
    PROFILE_PICTURES: 'profile-pictures',
    COMPANY_LOGOS: 'company-logos',
    JOB_ATTACHMENTS: 'job-attachments',
    CERTIFICATES: 'certificates',
};

// Pagination
export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 10,
    JOBS_PER_PAGE: 12,
    APPLICATIONS_PER_PAGE: 15,
    NOTIFICATIONS_PER_PAGE: 20,
};

// Date Formats
export const DATE_FORMATS = {
    DISPLAY: 'MMM dd, yyyy',
    DISPLAY_TIME: 'MMM dd, yyyy HH:mm',
    ISO: 'yyyy-MM-dd',
    TIME: 'HH:mm',
};

// Validation Rules
export const VALIDATION = {
    MIN_CGPA: 0.0,
    MAX_CGPA: 10.0,
    MIN_PASSWORD_LENGTH: 8,
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_RESUME_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/jpg'],
};

// Education Levels
export const EDUCATION_LEVELS = {
    UNDERGRADUATE: 'undergraduate',
    POSTGRADUATE: 'postgraduate',
    DOCTORATE: 'doctorate',
};

// Degree Types
export const DEGREE_TYPES = [
    'B.Tech',
    'B.E.',
    'B.Sc',
    'B.Com',
    'B.A.',
    'BBA',
    'BCA',
    'M.Tech',
    'M.E.',
    'M.Sc',
    'M.Com',
    'M.A.',
    'MBA',
    'MCA',
    'Ph.D.',
];

// Skills Categories
export const SKILL_CATEGORIES = {
    PROGRAMMING: 'programming',
    FRAMEWORK: 'framework',
    DATABASE: 'database',
    TOOLS: 'tools',
    SOFT_SKILLS: 'soft_skills',
    OTHER: 'other',
};

// Interview Status
export const INTERVIEW_STATUS = {
    SCHEDULED: 'scheduled',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    RESCHEDULED: 'rescheduled',
};

// Company Sizes
export const COMPANY_SIZES = [
    '1-10',
    '11-50',
    '51-200',
    '201-500',
    '501-1000',
    '1000+',
];

// Experience Levels
export const EXPERIENCE_LEVELS = {
    FRESHER: 'fresher',
    JUNIOR: 'junior',
    MID: 'mid',
    SENIOR: 'senior',
};

// Branches / Departments
export const BRANCHES = [
    'Computer Science',
    'Information Technology',
    'Electronics',
    'Electrical',
    'Mechanical',
    'Civil',
    'Chemical',
    'Biotechnology',
    'MBA',
    'MCA',
];

export default {
    USER_ROLES,
    APPLICATION_STATUS,
    STATUS_LABELS,
    STATUS_COLORS,
    JOB_TYPES,
    JOB_TYPE_LABELS,
    WORK_MODES,
    NOTIFICATION_TYPES,
    COLLECTIONS,
    STORAGE_PATHS,
    PAGINATION,
    DATE_FORMATS,
    VALIDATION,
    EDUCATION_LEVELS,
    DEGREE_TYPES,
    SKILL_CATEGORIES,
    INTERVIEW_STATUS,
    COMPANY_SIZES,
    EXPERIENCE_LEVELS,
    BRANCHES,
};
