# CareerOS Database Schema

## Overview

CareerOS uses Cloud Firestore as its NoSQL database with real-time synchronization capabilities.

---

## Collections

### 1. **users**

Master collection for all user accounts

```
users/{userId}
  - uid: string (Firebase Auth UID)
  - email: string
  - fullName: string
  - role: string (student | recruiter | admin)
  - createdAt: timestamp
  - updatedAt: timestamp
  - lastLoginAt: timestamp?
  - isActive: boolean
```

**Indexes:**

- `role` (ascending)
- `email` (ascending)

---

### 2. **students**

Student-specific profile data

```
students/{studentId}
  - uid: string (references users)
  - rollNumber: string
  - branch: string
  - degree: string (B.Tech, M.Tech, etc.)
  - graduationYear: number
  - cgpa: number
  - skills: array<string>
  - certifications: array<{
      name: string,
      issuer: string,
      issueDate: date,
      credentialUrl?: string
    }>
  - projects: array<{
      title: string,
      description: string,
      technologies: array<string>,
      githubUrl?: string,
      liveUrl?: string
    }>
  - experience: array<{
      company: string,
      position: string,
      duration: string,
      description: string
    }>
  - resumeUrl?: string
  - profilePictureUrl?: string
  - linkedinUrl?: string
  - githubUrl?: string
  - createdAt: timestamp
  - updatedAt: timestamp
```

**Indexes:**

- `cgpa` (ascending)
- `branch` (ascending)
- `graduationYear` (ascending)

**Use Cases:**

- Student profile management
- Eligibility filtering
- Resume building
- Candidate search

---

### 3. **recruiters**

Recruiter/Company profile data

```
recruiters/{recruiterId}
  - uid: string (references users)
  - companyName: string
  - designation: string
  - companyWebsite?: string
  - companySize?: string
  - industry?: string
  - companyLogoUrl?: string
  - description?: string
  - location?: string
  - contactNumber?: string
  - isVerified: boolean
  - verifiedBy?: string (admin UID)
  - verificationDate?: timestamp
  - createdAt: timestamp
  - updatedAt: timestamp
```

**Indexes:**

- `isVerified` (ascending)
- `companyName` (ascending)

**Use Cases:**

- Recruiter profile management
- Company verification
- Job posting authorization

---

### 4. **jobs**

Job and internship postings

```
jobs/{jobId}
  - recruiterId: string (references recruiters)
  - companyName: string
  - title: string
  - description: string
  - type: string (internship | full_time | part_time | contract)
  - workMode: string (remote | hybrid | onsite)
  - location?: string
  - duration?: string
  - salary: {
      min: number,
      max: number,
      currency: string
    }
  - eligibility: {
      minCGPA?: number,
      degrees?: array<string>,
      branches?: array<string>,
      graduationYears?: array<number>
    }
  - requiredSkills: array<string>
  - responsibilities: array<string>
  - benefits?: array<string>
  - applicationDeadline: timestamp
  - attachmentUrls?: array<string>
  - isActive: boolean
  - applicationsCount: number
  - createdAt: timestamp
  - updatedAt: timestamp
```

**Indexes:**

- `isActive`, `createdAt` (compound)
- `recruiterId`, `createdAt` (compound)
- `type` (ascending)

**Use Cases:**

- Job listings
- Job search and filtering
- Eligibility checking
- Application tracking

---

### 5. **applications**

Student job applications

```
applications/{applicationId}
  - studentId: string (references students)
  - jobId: string (references jobs)
  - status: string (applied | shortlisted | interview_scheduled | selected | rejected)
  - statusHistory: array<{
      status: string,
      timestamp: timestamp,
      note?: string
    }>
  - appliedAt: timestamp (derived from createdAt)
  - resumeUrl: string
  - coverLetter?: string
  - offeredSalary?: number
  - joiningDate?: timestamp
  - feedback?: string
  - createdAt: timestamp
  - updatedAt: timestamp
```

**Indexes:**

- `studentId`, `createdAt` (compound)
- `jobId`, `createdAt` (compound)
- `jobId`, `status`, `createdAt` (compound)
- `status` (ascending)

**Use Cases:**

- Application tracking
- Status management
- Recruiter shortlisting
- Placement statistics

---

### 6. **interviews**

Interview scheduling and management

```
interviews/{interviewId}
  - applicationId: string (references applications)
  - studentId: string
  - recruiterId: string
  - jobId: string
  - scheduledAt: timestamp
  - duration: number (minutes)
  - mode: string (video | phone | in-person)
  - meetingLink?: string
  - location?: string
  - status: string (scheduled | completed | cancelled | rescheduled)
  - feedback?: string
  - rating?: number
  - notes?: string
  - createdAt: timestamp
  - updatedAt: timestamp
```

**Indexes:**

- `studentId`, `scheduledAt` (compound)
- `recruiterId`, `scheduledAt` (compound)
- `status` (ascending)

**Use Cases:**

- Interview scheduling
- Calendar management
- Interview feedback
- Rescheduling

---

### 7. **notifications**

User notifications

```
notifications/{notificationId}
  - userId: string
  - type: string (application_status | interview_scheduled | new_job | application_received | system)
  - title: string
  - message: string
  - data?: object (contextual data)
  - isRead: boolean
  - readAt?: timestamp
  - createdAt: timestamp
```

**Indexes:**

- `userId`, `createdAt` (compound)
- `userId`, `isRead` (compound)

**Use Cases:**

- Real-time notifications
- User alerts
- Status updates
- System announcements

---

### 8. **reports**

Generated placement reports

```
reports/{reportId}
  - type: string (placement | recruitment | analytics)
  - period: {
      startDate: timestamp,
      endDate: timestamp
    }
  - summary: object (statistics)
  - applications: array<object>
  - generatedAt: timestamp
  - createdBy: string (admin UID)
  - createdAt: timestamp
```

**Indexes:**

- `type`, `createdAt` (compound)
- `createdBy` (ascending)

**Use Cases:**

- Placement reports
- Data export
- Analytics generation
- Historical tracking

---

### 9. **analytics**

Aggregated analytics data

```
analytics/{metricId}
  - type: string (daily | weekly | monthly)
  - date: timestamp
  - metrics: {
      totalApplications: number,
      totalPlacements: number,
      avgSalary: number,
      topCompanies: array<object>,
      branchWiseStats: object
    }
  - updatedAt: timestamp
```

**Indexes:**

- `type`, `date` (compound)

**Use Cases:**

- Dashboard analytics
- Trend analysis
- Performance metrics
- Admin insights

---

## Relationships

### One-to-One

- `users` ↔ `students`
- `users` ↔ `recruiters`

### One-to-Many

- `students` → `applications`
- `recruiters` → `jobs`
- `jobs` → `applications`
- `users` → `notifications`

### Many-to-Many (through applications)

- `students` ↔ `jobs` (through `applications`)

---

## Security Rules

All collections are protected by Firestore Security Rules:

- **Role-based access control**
- **Owner-based permissions**
- **Read/Write restrictions by user role**
- **Validation of data integrity**

See `firestore.rules` for detailed security implementation.

---

## Data Flow

```
1. Student Registration
   ├─ Create user document
   └─ Create student profile

2. Job Application
   ├─ Check eligibility
   ├─ Create application document
   ├─ Increment job applicationsCount
   └─ Trigger notification to recruiter

3. Status Update
   ├─ Update application status
   ├─ Add to statusHistory
   └─ Trigger notification to student

4. Interview Scheduling
   ├─ Create interview document
   └─ Trigger notifications to both parties
```

---

## Best Practices

1. **Use transactions** for operations affecting multiple documents
2. **Implement pagination** for large collections
3. **Use compound queries** with proper indexes
4. **Leverage real-time listeners** for live updates
5. **Implement proper error handling**
6. **Validate data on client and server**
7. **Use batch operations** for bulk updates

---

## Future Extensions

1. **Chat/Messaging** collection for recruiter-student communication
2. **Events** collection for placement drives and workshops
3. **Feedback** collection for platform improvements
4. **AuditLogs** collection for compliance tracking
