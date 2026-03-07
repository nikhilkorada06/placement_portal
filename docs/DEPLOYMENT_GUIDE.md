# CareerOS Deployment Guide

## Prerequisites

Before deploying CareerOS, ensure you have:

- ✅ Node.js 18+ installed
- ✅ Firebase CLI installed globally
- ✅ Firebase project created
- ✅ Git installed (optional)
- ✅ Code editor (VS Code recommended)

---

## Step 1: Firebase Project Setup

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Enter project name: `careeros` (or your choice)
4. Enable Google Analytics (optional)
5. Create project

### 1.2 Enable Firebase Services

#### Enable Authentication

1. Go to Build → Authentication
2. Click "Get Started"
3. Enable Email/Password provider
4. (Optional) Enable Google Sign-In

#### Enable Firestore Database

1. Go to Build → Firestore Database
2. Click "Create Database"
3. Start in **production mode**
4. Choose a location (closest to your users)

#### Enable Storage

1. Go to Build → Storage
2. Click "Get Started"
3. Start in **production mode**

#### Enable Functions

Firebase Functions will be set up via CLI.

### 1.3 Get Firebase Configuration

1. Go to Project Settings (gear icon)
2. Scroll to "Your apps"
3. Click Web icon (`</>`)
4. Register app: "CareerOS Web"
5. Copy the Firebase configuration object

---

## Step 2: Local Development Setup

### 2.1 Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2.2 Login to Firebase

```bash
firebase login
```

### 2.3 Navigate to Project

```bash
cd "/path/to/CareerOS"
```

### 2.4 Link Firebase Project

```bash
firebase use --add
```

Select your Firebase project and give it an alias (e.g., `default`)

### 2.5 Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 2.6 Configure Environment Variables

Create `.env` file in `frontend/` directory:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 2.7 Install Backend Dependencies

```bash
cd ../backend/functions
npm install
```

---

## Step 3: Deploy Firestore Rules & Indexes

### 3.1 Deploy Security Rules

```bash
cd ../../  # Back to root directory
firebase deploy --only firestore:rules
```

### 3.2 Deploy Storage Rules

```bash
firebase deploy --only storage
```

### 3.3 Deploy Firestore Indexes

```bash
firebase deploy --only firestore:indexes
```

---

## Step 4: Deploy Cloud Functions

```bash
firebase deploy --only functions
```

This will deploy all Cloud Functions:

- Application triggers
- Notification triggers
- Analytics functions
- Reports functions
- Jobs functions

**Note:** First deployment may take 3-5 minutes.

---

## Step 5: Build Frontend

```bash
cd frontend
npm run build
```

This creates optimized production build in `frontend/dist/`.

---

## Step 6: Deploy to Firebase Hosting

```bash
cd ..  # Back to root
firebase deploy --only hosting
```

Your app will be available at:

```
https://your-project-id.web.app
https://your-project-id.firebaseapp.com
```

---

## Step 7: Create Admin User (Manual)

Since admin role needs special privileges:

### Option 1: Via Firebase Console

1. Go to Authentication
2. Add a new user manually
3. Note the UID
4. Go to Firestore Database
5. Create document in `users` collection:

```json
{
  "uid": "copied-uid",
  "email": "admin@example.com",
  "fullName": "Admin Name",
  "role": "admin",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "isActive": true
}
```

### Option 2: Via Firebase Admin SDK

Create a script in `backend/functions/scripts/createAdmin.js`:

```javascript
const admin = require('firebase-admin');
admin.initializeApp();

const createAdmin = async () => {
  const email = 'admin@example.com';
  const password = 'SecurePassword123';
  
  const userRecord = await admin.auth().createUser({
    email,
    password,
    displayName: 'Admin',
  });
  
  await admin.firestore().collection('users').doc(userRecord.uid).set({
    uid: userRecord.uid,
    email,
    fullName: 'Admin',
    role: 'admin',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    isActive: true,
  });
  
  console.log('Admin created:', userRecord.uid);
};

createAdmin();
```

Run it:

```bash
node backend/functions/scripts/createAdmin.js
```

---

## Step 8: Complete Deployment

Deploy everything at once:

```bash
firebase deploy
```

This deploys:

- Firestore rules
- Storage rules
- Cloud Functions
- Hosting

---

## Step 9: Verify Deployment

### 9.1 Test Authentication

1. Go to your deployed URL
2. Click "Register"
3. Create a student account
4. Verify email confirmation (if enabled)

### 9.2 Test Database

1. Login as student
2. Go to profile page
3. Update profile
4. Check Firestore Console for changes

### 9.3 Test Functions

1. Post a job (as recruiter)
2. Apply to job (as student)
3. Check notifications
4. Verify Cloud Functions logs:

```bash
firebase functions:log
```

---

## Step 10: Custom Domain (Optional)

### 10.1 Add Custom Domain

1. Go to Firebase Console → Hosting
2. Click "Add custom domain"
3. Enter your domain (e.g., `careeros.com`)
4. Follow verification steps

### 10.2 SSL Certificate

Firebase automatically provisions SSL certificates (takes 24-48 hours).

---

## Environment-Specific Deployments

### Development

```bash
# Use emulators for local development
firebase emulators:start
```

Access:

- Emulator UI: <http://localhost:4000>
- Hosting: <http://localhost:5000>
- Functions: <http://localhost:5001>

### Staging

Create a staging Firebase project:

```bash
firebase use --add staging-project-id
firebase use staging
firebase deploy
```

### Production

```bash
firebase use production
firebase deploy
```

---

## Continuous Integration / Deployment (CI/CD)

### Using GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Frontend Dependencies
        run: |
          cd frontend
          npm install
      
      - name: Build Frontend
        run: |
          cd frontend
          npm run build
      
      - name: Install Functions Dependencies
        run: |
          cd backend/functions
          npm install
      
      - name: Deploy to Firebase
        uses: w9jds/firebase-action@master
        with:
          args: deploy
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

Generate Firebase token:

```bash
firebase login:ci
```

Add token to GitHub Secrets as `FIREBASE_TOKEN`.

---

## Monitoring & Maintenance

### Enable Analytics

```bash
firebase analytics:enable
```

### Monitor Performance

- Go to Firebase Console → Performance
- Track page load times
- Monitor API latencies

### View Logs

```bash
# Function logs
firebase functions:log

# Specific function
firebase functions:log --only functionName

# Follow logs
firebase functions:log --follow
```

### Backup Firestore

```bash
gcloud firestore export gs://your-bucket-name
```

---

## Rollback Strategy

### Rollback Hosting

```bash
firebase hosting:rollback
```

### Rollback Functions

Deploy previous version from git history.

---

## Troubleshooting

### Issue: Functions Not Deploying

```bash
# Check billing
firebase projects:list

# Upgrade to Blaze plan
# Firebase Console → Upgrade
```

### Issue: CORS Errors

Add CORS configuration in Storage rules or Functions.

### Issue: Slow Performance

- Enable Firestore indexes
- Optimize queries
- Use pagination

### Issue: High Costs

- Review Firestore usage
- Implement rate limiting
- Optimize Cloud Functions

---

## Cost Optimization

1. **Use Firestore efficiently**
   - Minimize reads/writes
   - Use caching
   - Implement pagination

2. **Optimize Functions**
   - Use appropriate memory
   - Set timeouts
   - Avoid cold starts

3. **CDN Caching**
   - Cache static assets
   - Use Firebase Hosting CDN

4. **Monitor Usage**
   - Set up billing alerts
   - Review usage monthly

---

## Security Checklist

- ✅ Environment variables secured
- ✅ Firestore rules deployed
- ✅ Storage rules deployed
- ✅ HTTPS enforced
- ✅ Authentication enabled
- ✅ Admin users protected
- ✅ API keys restricted
- ✅ CORS configured

---

## Post-Deployment

1. **Test all user flows**
2. **Monitor error rates**
3. **Set up alerts**
4. **Document known issues**
5. **Plan regular updates**

---

## Support & Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Cloud Functions Documentation](https://firebase.google.com/docs/functions)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)

---

**Deployment Complete! 🎉**

Your CareerOS platform is now live and ready to transform campus recruitment!
