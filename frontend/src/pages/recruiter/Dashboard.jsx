import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { subscribeToRecruiterJobs } from '@services/jobService';
import { subscribeToRecruiterApplications } from '@services/applicationService';
import { APPLICATION_STATUS, STATUS_LABELS, STATUS_COLORS } from '@config/constants';

const RecruiterDashboard = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const jobIdsRef = useRef([]);
  const appUnsubRef = useRef(null);

  // Show complete-profile modal for new recruiters whose profile isn't completed
  useEffect(() => {
    if (userProfile && userProfile.role === 'recruiter' && userProfile.profileCompleted === false) {
      setShowProfileModal(true);
    }
  }, [userProfile]);

  // Subscribe to recruiter's jobs in real-time
  useEffect(() => {
    if (!user?.uid) return;

    const unsubJobs = subscribeToRecruiterJobs(user.uid, (jobsData) => {
      setJobs(jobsData);
      setLoading(false);

      // Check if job IDs changed to re-subscribe applications
      const newJobIds = jobsData.map(j => j.id).sort();
      const oldJobIds = jobIdsRef.current.sort();
      const changed = newJobIds.length !== oldJobIds.length || newJobIds.some((id, i) => id !== oldJobIds[i]);

      if (changed) {
        jobIdsRef.current = newJobIds;
        // Unsubscribe old application listener
        if (appUnsubRef.current) {
          appUnsubRef.current();
        }
        // Subscribe to applications for all job IDs
        if (newJobIds.length > 0) {
          appUnsubRef.current = subscribeToRecruiterApplications(newJobIds, (appsData) => {
            setApplications(appsData);
          });
        } else {
          setApplications([]);
        }
      }
    });

    return () => {
      unsubJobs();
      if (appUnsubRef.current) {
        appUnsubRef.current();
      }
    };
  }, [user?.uid]);

  // Compute stats
  const activeJobs = jobs.filter(j => j.status === 'active').length;
  const totalJobs = jobs.length;
  const closedJobs = jobs.filter(j => j.status === 'closed').length;
  const totalApplications = applications.length;
  const appliedCount = applications.filter(a => a.status === APPLICATION_STATUS.APPLIED).length;
  const shortlistedCount = applications.filter(a => a.status === APPLICATION_STATUS.SHORTLISTED).length;
  const interviewCount = applications.filter(a => a.status === APPLICATION_STATUS.INTERVIEW_SCHEDULED).length;
  const selectedCount = applications.filter(a => a.status === APPLICATION_STATUS.SELECTED).length;
  const rejectedCount = applications.filter(a => a.status === APPLICATION_STATUS.REJECTED).length;

  // Recent applications (last 5)
  const recentApplications = [...applications]
    .sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      return bTime - aTime;
    })
    .slice(0, 5);

  // Top jobs by application count
  const jobAppCounts = {};
  applications.forEach(app => {
    jobAppCounts[app.jobId] = (jobAppCounts[app.jobId] || 0) + 1;
  });
  const topJobs = [...jobs]
    .map(j => ({ ...j, liveAppCount: jobAppCounts[j.id] || 0 }))
    .sort((a, b) => b.liveAppCount - a.liveAppCount)
    .slice(0, 5);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back{userProfile?.companyName ? `, ${userProfile.companyName}` : ''}!
          </h1>
          <p className="text-gray-600 mt-1">Here's an overview of your recruitment activity</p>
        </div>
        <Link
          to="/recruiter/post-job"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Post New Job
        </Link>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Jobs</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{activeJobs}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">{totalJobs} total · {closedJobs} closed</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Applications</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">{totalApplications}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">{appliedCount} pending review</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Shortlisted</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">{shortlistedCount}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">{interviewCount} interview scheduled</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Selected</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{selectedCount}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">{rejectedCount} rejected</p>
        </div>
      </div>

      {/* Application Pipeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Pipeline</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Applied', count: appliedCount, color: 'bg-blue-100 text-blue-700' },
            { label: 'Shortlisted', count: shortlistedCount, color: 'bg-yellow-100 text-yellow-700' },
            { label: 'Interview', count: interviewCount, color: 'bg-purple-100 text-purple-700' },
            { label: 'Selected', count: selectedCount, color: 'bg-green-100 text-green-700' },
            { label: 'Rejected', count: rejectedCount, color: 'bg-red-100 text-red-700' },
          ].map((stage) => (
            <div key={stage.label} className={`flex-1 min-w-[120px] rounded-lg p-3 ${stage.color}`}>
              <p className="text-2xl font-bold">{stage.count}</p>
              <p className="text-xs font-medium">{stage.label}</p>
            </div>
          ))}
        </div>
        {totalApplications > 0 && (
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2.5 flex overflow-hidden">
            {appliedCount > 0 && <div className="bg-blue-500 h-2.5" style={{ width: `${(appliedCount / totalApplications) * 100}%` }}></div>}
            {shortlistedCount > 0 && <div className="bg-yellow-500 h-2.5" style={{ width: `${(shortlistedCount / totalApplications) * 100}%` }}></div>}
            {interviewCount > 0 && <div className="bg-purple-500 h-2.5" style={{ width: `${(interviewCount / totalApplications) * 100}%` }}></div>}
            {selectedCount > 0 && <div className="bg-green-500 h-2.5" style={{ width: `${(selectedCount / totalApplications) * 100}%` }}></div>}
            {rejectedCount > 0 && <div className="bg-red-500 h-2.5" style={{ width: `${(rejectedCount / totalApplications) * 100}%` }}></div>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Applications */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Applications</h2>
            <Link to="/recruiter/jobs" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View All →
            </Link>
          </div>
          {recentApplications.length === 0 ? (
            <p className="text-gray-500 text-sm py-6 text-center">No applications yet</p>
          ) : (
            <div className="space-y-3">
              {recentApplications.map((app) => {
                const job = jobs.find(j => j.id === app.jobId);
                return (
                  <div key={app.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                        {app.studentName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{app.studentName || 'Unknown'}</p>
                        <p className="text-xs text-gray-500 truncate">{job?.title || 'Unknown Job'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[app.status] || 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_LABELS[app.status] || app.status || 'Applied'}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(app.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Jobs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Job Postings</h2>
            <Link to="/recruiter/jobs" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Manage →
            </Link>
          </div>
          {topJobs.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500 text-sm mb-3">No jobs posted yet</p>
              <Link to="/recruiter/post-job" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Post your first job →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {topJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{job.title}</p>
                    <p className="text-xs text-gray-500">{job.location || 'Remote'}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-center">
                      <p className="text-lg font-bold text-blue-600">{job.liveAppCount}</p>
                      <p className="text-xs text-gray-400">Apps</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      job.status === 'active' ? 'bg-green-100 text-green-700' :
                      job.status === 'closed' ? 'bg-gray-100 text-gray-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {job.status?.charAt(0).toUpperCase() + job.status?.slice(1) || 'Draft'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Complete Profile Modal ── */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-[modalIn_0.35s_ease-out]">
            <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Complete Your Company Profile</h2>
              <p className="text-gray-500 mt-2 text-sm leading-relaxed">
                Students look for detailed company profiles. Add your company info,
                industry, description and logo to attract top talent!
              </p>
              <div className="mt-7 flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowProfileModal(false);
                    navigate('/recruiter/profile?edit=true');
                  }}
                  className="w-full px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-200/50"
                >
                  Complete Profile Now
                </button>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="w-full px-5 py-2.5 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
                >
                  I&apos;ll do it later
                </button>
              </div>
            </div>
          </div>
          <style>{`
            @keyframes modalIn {
              0% { transform: scale(0.9) translateY(20px); opacity: 0; }
              100% { transform: scale(1) translateY(0); opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default RecruiterDashboard;
