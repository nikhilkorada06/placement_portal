# CareerOS API Documentation

## Overview

CareerOS uses Firebase services for its backend, including:

- **Firebase Authentication** - User authentication
- **Cloud Firestore** - NoSQL database with real-time updates
- **Firebase Storage** - File storage
- **Cloud Functions** - Serverless backend functions

---

## Authentication

### Base URL

```
https://your-project-id.web.app
```

### Auth Methods

#### Sign Up

```javascript
import { signUp } from '@context/AuthContext';

await signUp(email, password, {
  fullName: 'John Doe',
  role: 'student',
  studentData: {
    rollNumber: 'CS2021001',
    branch: 'Computer Science'
  }
});
```

#### Sign In

```javascript
import { signIn } from '@context/AuthContext';

await signIn(email, password);
```

#### Sign Out

```javascript
import { signOut } from '@context/AuthContext';

await signOut();
```

#### Reset Password

```javascript
import { resetPassword } from '@context/AuthContext';

await resetPassword(email);
```

---

## Jobs Service API

### Get Jobs

```javascript
import { getJobs } from '@services/jobService';

const { jobs, lastDoc, hasMore } = await getJobs(
  {
    type: 'internship',
    workMode: 'remote',
    minCGPA: 7.0,
    isActive: true
  },
  {
    pageSize: 10,
    lastDoc: previousLastDoc
  }
);
```

**Parameters:**

- `filters` (object, optional)
  - `type` - Job type (internship | full_time | part_time | contract)
  - `workMode` - Work mode (remote | hybrid | onsite)
  - `minCGPA` - Minimum CGPA requirement
  - `isActive` - Filter active jobs
- `pagination` (object, optional)
  - `pageSize` - Number of items per page
  - `lastDoc` - Last document from previous page

**Returns:**

```javascript
{
  jobs: Array<Job>,
  lastDoc: DocumentSnapshot,
  hasMore: boolean
}
```

---

### Get Single Job

```javascript
import { getJob } from '@services/jobService';

const job = await getJob(jobId);
```

**Returns:** `Job` object or `null`

---

### Create Job

```javascript
import { createJob } from '@services/jobService';

const newJob = await createJob({
  recruiterId: 'user-id',
  companyName: 'Tech Corp',
  title: 'Software Engineer Intern',
  description: 'Job description...',
  type: 'internship',
  workMode: 'remote',
  location: 'Remote',
  salary: { min: 20000, max: 30000, currency: 'INR' },
  eligibility: {
    minCGPA: 7.0,
    degrees: ['B.Tech'],
    branches: ['Computer Science', 'IT'],
    graduationYears: [2024, 2025]
  },
  requiredSkills: ['React', 'Node.js'],
  applicationDeadline: new Date('2024-12-31')
});
```

**Returns:** Created `Job` object with ID

---

### Update Job

```javascript
import { updateJob } from '@services/jobService';

await updateJob(jobId, {
  title: 'Updated Title',
  description: 'Updated description'
});
```

---

### Delete Job

```javascript
import { deleteJob } from '@services/jobService';

await deleteJob(jobId);
```

---

### Get Eligible Jobs

```javascript
import { getEligibleJobs } from '@services/jobService';

const eligibleJobs = await getEligibleJobs(studentProfile);
```

**Parameters:**

- `studentProfile` - Student profile object with eligibility fields

**Returns:** Array of eligible `Job` objects

---

### Subscribe to Jobs (Real-time)

```javascript
import { subscribeToJobs } from '@services/jobService';

const unsubscribe = subscribeToJobs(
  (jobs) => {
    console.log('Jobs updated:', jobs);
  },
  { type: 'internship' }
);

// Cleanup
unsubscribe();
```

---

## Applications Service API

### Submit Application

```javascript
import { submitApplication } from '@services/applicationService';

const application = await submitApplication({
  studentId: 'student-uid',
  jobId: 'job-id',
  resumeUrl: 'https://...',
  coverLetter: 'Optional cover letter...'
});
```

**Returns:** Created `Application` object

**Throws:** Error if already applied

---

### Get Student Applications

```javascript
import { getStudentApplications } from '@services/applicationService';

const applications = await getStudentApplications(studentId);
```

**Returns:** Array of `Application` objects with embedded job data

---

### Get Job Applications

```javascript
import { getJobApplications } from '@services/applicationService';

const applications = await getJobApplications(
  jobId,
  { status: 'shortlisted' }
);
```

**Parameters:**

- `jobId` - Job ID
- `filters` (optional)
  - `status` - Filter by application status

**Returns:** Array of `Application` objects with embedded student data

---

### Update Application Status

```javascript
import { updateApplicationStatus } from '@services/applicationService';

await updateApplicationStatus(
  applicationId,
  'shortlisted',
  'Excellent profile'
);
```

**Parameters:**

- `applicationId` - Application ID
- `newStatus` - New status value
- `note` - Optional note/reason

---

### Bulk Update Status

```javascript
import { bulkUpdateApplicationStatus } from '@services/applicationService';

await bulkUpdateApplicationStatus(
  [appId1, appId2, appId3],
  'shortlisted',
  'Batch shortlist'
);
```

---

### Get Application Statistics

```javascript
import { getApplicationStats } from '@services/applicationService';

const stats = await getApplicationStats(jobId);

// Returns:
// {
//   total: 50,
//   applied: 30,
//   shortlisted: 15,
//   interview_scheduled: 3,
//   selected: 2,
//   rejected: 0
// }
```

---

### Subscribe to Applications (Real-time)

```javascript
import { subscribeToStudentApplications } from '@services/applicationService';

const unsubscribe = subscribeToStudentApplications(
  studentId,
  (applications) => {
    console.log('Applications updated:', applications);
  }
);
```

---

## Storage Service API

### Upload Resume

```javascript
import { uploadResume } from '@services/storageService';

const { url, path, name } = await uploadResume(
  file,
  userId,
  (progress) => {
    console.log(`Upload progress: ${progress}%`);
  }
);
```

**Validation:**

- File types: PDF, DOC, DOCX
- Max size: 5MB

---

### Upload Profile Picture

```javascript
import { uploadProfilePicture } from '@services/storageService';

const { url, path } = await uploadProfilePicture(
  file,
  userId,
  (progress) => console.log(progress)
);
```

**Validation:**

- File types: JPEG, PNG
- Max size: 5MB

---

### Upload Company Logo

```javascript
import { uploadCompanyLogo } from '@services/storageService';

const { url } = await uploadCompanyLogo(file, recruiterId);
```

---

### Delete File

```javascript
import { deleteFile } from '@services/storageService';

await deleteFile(filePath);
```

---

### Get User Resumes

```javascript
import { getUserResumes } from '@services/storageService';

const resumes = await getUserResumes(userId);

// Returns array of:
// [{ name, path, url }, ...]
```

---

## Notification Service API

### Create Notification

```javascript
import { createNotification } from '@services/notificationService';

await createNotification({
  userId: 'user-id',
  type: 'application_status',
  title: 'Application Update',
  message: 'Your application has been shortlisted',
  data: { applicationId: 'app-id' }
});
```

---

### Get User Notifications

```javascript
import { getUserNotifications } from '@services/notificationService';

const notifications = await getUserNotifications(userId, 50);
```

---

### Mark as Read

```javascript
import { markAsRead } from '@services/notificationService';

await markAsRead(notificationId);
```

---

### Mark All as Read

```javascript
import { markAllAsRead } from '@services/notificationService';

await markAllAsRead(userId);
```

---

### Subscribe to Notifications (Real-time)

```javascript
import { subscribeToNotifications } from '@services/notificationService';

const unsubscribe = subscribeToNotifications(
  userId,
  (notifications) => {
    console.log('New notifications:', notifications);
  }
);
```

---

### Subscribe to Unread Count

```javascript
import { subscribeToUnreadCount } from '@services/notificationService';

const unsubscribe = subscribeToUnreadCount(
  userId,
  (count) => {
    console.log('Unread count:', count);
  }
);
```

---

## Cloud Functions API

### Get Placement Statistics

```javascript
import { httpsCallable } from 'firebase/functions';
import { functions } from '@config/firebase';

const getStats = httpsCallable(functions, 'analytics-getPlacementStats');
const { data } = await getStats();

// Returns comprehensive placement stats
```

---

### Get Recruiter Analytics

```javascript
const getAnalytics = httpsCallable(functions, 'analytics-getRecruiterAnalytics');
const { data } = await getAnalytics({ recruiterId: 'user-id' });

// Returns recruiter-specific analytics
```

---

### Generate Placement Report

```javascript
const generateReport = httpsCallable(functions, 'reports-generatePlacementReport');

const { data } = await generateReport({
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  format: 'json'
});

// Returns report with ID and data
```

---

### Export Report as CSV

```javascript
const exportCSV = httpsCallable(functions, 'reports-exportReportAsCSV');

const { data } = await exportCSV({ reportId: 'report-id' });

// Returns CSV string
```

---

### Search Jobs

```javascript
const searchJobs = httpsCallable(functions, 'jobs-searchJobs');

const { data } = await searchJobs({
  filters: { type: 'internship' },
  limit: 20
});
```

---

### Get Job Recommendations

```javascript
const getRecommendations = httpsCallable(functions, 'jobs-getJobRecommendations');

const { data } = await getRecommendations({ studentId: 'user-id' });

// Returns recommended jobs with scores
```

---

## Error Handling

All service methods throw errors that should be caught:

```javascript
try {
  await submitApplication(data);
  toast.success('Application submitted!');
} catch (error) {
  console.error('Error:', error);
  toast.error(error.message || 'Failed to submit application');
}
```

---

## Common Error Codes

| Code | Description |
|------|-------------|
| `auth/user-not-found` | User doesn't exist |
| `auth/wrong-password` | Incorrect password |
| `auth/email-already-in-use` | Email already registered |
| `permission-denied` | Insufficient permissions |
| `not-found` | Document not found |
| `already-exists` | Duplicate entry |
| `unauthenticated` | User not logged in |

---

## Rate Limits

Firebase has the following limits:

- **Firestore Reads:** Free tier - 50K/day
- **Firestore Writes:** Free tier - 20K/day
- **Storage:** Free tier - 5GB
- **Functions Invocations:** Free tier - 125K/month

For production, upgrade to Blaze (pay-as-you-go) plan.

---

## Security

All API calls are secured by:

1. **Firebase Authentication** - User must be authenticated
2. **Firestore Security Rules** - Role-based access control
3. **Storage Rules** - File access restrictions
4. **HTTPS** - All traffic encrypted

---

## Testing

### Using Emulators

```bash
firebase emulators:start
```

Access:

- Auth: `http://localhost:9099`
- Firestore: `http://localhost:8080`
- Functions: `http://localhost:5001`
- Storage: `http://localhost:9199`

---

## Best Practices

1. **Always handle errors** - Use try-catch blocks
2. **Implement loading states** - Show spinners during API calls
3. **Use real-time listeners** - For live data updates
4. **Implement pagination** - For large datasets
5. **Cache data** - Reduce unnecessary reads
6. **Validate input** - Both client and server-side
7. **Clean up listeners** - Unsubscribe when component unmounts

---

## Example: Complete Job Application Flow

```javascript
import { useState } from 'react';
import { useAuth } from '@context/AuthContext';
import { submitApplication } from '@services/applicationService';
import { uploadResume } from '@services/storageService';
import toast from 'react-hot-toast';

const ApplyButton = ({ jobId }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleApply = async (resumeFile) => {
    setLoading(true);
    
    try {
      // 1. Upload resume
      const { url } = await uploadResume(
        resumeFile,
        user.uid,
        (progress) => console.log(`Uploading: ${progress}%`)
      );

      // 2. Submit application
      await submitApplication({
        studentId: user.uid,
        jobId: jobId,
        resumeUrl: url
      });

      toast.success('Application submitted successfully!');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={() => /* select file and call handleApply */}>
      {loading ? 'Applying...' : 'Apply Now'}
    </button>
  );
};
```

---

For more details, refer to:

- [Firebase Documentation](https://firebase.google.com/docs)
- [Database Schema](./DATABASE_SCHEMA.md)
- [Implementation Plan](./IMPLEMENTATION_PLAN.md)
