import { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@config/firebase';
import { useAuth } from '@context/AuthContext';
import { COLLECTIONS, APPLICATION_STATUS, JOB_TYPE_LABELS } from '@config/constants';

/* ═══════════════════════════════════════════════════════════════
   SVG GEOMETRY HELPERS
   ═══════════════════════════════════════════════════════════════ */
const toXY = (cx, cy, r, deg) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const sectorPath = (cx, cy, r, s, e) => {
    if (e - s >= 359.99) {
        const m = toXY(cx, cy, r, s + 180), ed = toXY(cx, cy, r, s + 359.99), st = toXY(cx, cy, r, s);
        return `M${cx},${cy}L${st.x},${st.y}A${r},${r} 0 1 1 ${m.x},${m.y}A${r},${r} 0 1 1 ${ed.x},${ed.y}Z`;
    }
    const st = toXY(cx, cy, r, s), ed = toXY(cx, cy, r, e);
    return `M${cx},${cy}L${st.x},${st.y}A${r},${r} 0 ${e - s > 180 ? 1 : 0} 1 ${ed.x},${ed.y}Z`;
};

/* ═══════════════════════════════════════════════════════════════
   INTERACTIVE DONUT PIE CHART
   — hover a segment to see label, count, and percentage in center
   — legend items also trigger segment highlight
   ═══════════════════════════════════════════════════════════════ */
const InteractivePie = ({ data, size = 220, holeRatio = 0.55, centerLabel, centerSub }) => {
    const [hov, setHov] = useState(null);
    const total = data.reduce((a, d) => a + d.value, 0);
    const cx = size / 2, cy = size / 2, R = size / 2 - 8;

    let ang = 0;
    const segs = data.filter(d => d.value > 0).map(d => {
        const sweep = total > 0 ? (d.value / total) * 360 : 0;
        const seg = { ...d, s: ang, e: ang + sweep, pct: total > 0 ? (d.value / total) * 100 : 0 };
        ang += sweep;
        return seg;
    });

    const hd = hov !== null ? segs[hov] : null;

    return (
        <div className="flex flex-col items-center">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size}>
                    <circle cx={cx} cy={cy} r={R} fill="#f8fafc" />
                    {segs.map((seg, i) => (
                        <path
                            key={i}
                            d={sectorPath(cx, cy, R, seg.s, seg.e)}
                            fill={seg.color}
                            stroke="#fff"
                            strokeWidth="2.5"
                            className="cursor-pointer"
                            style={{
                                transform: hov === i ? 'scale(1.07)' : 'scale(1)',
                                transformOrigin: `${cx}px ${cy}px`,
                                opacity: hov !== null && hov !== i ? 0.4 : 1,
                                transition: 'transform .2s ease, opacity .2s ease',
                            }}
                            onMouseEnter={() => setHov(i)}
                            onMouseLeave={() => setHov(null)}
                        />
                    ))}
                    <circle cx={cx} cy={cy} r={R * holeRatio} fill="white" className="pointer-events-none" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    {hd ? (
                        <>
                            <span className="text-[11px] font-medium text-gray-500 text-center leading-tight px-6">{hd.label}</span>
                            <span className="text-[28px] font-extrabold text-gray-900 leading-none mt-0.5">{hd.value}</span>
                            <span className="text-sm font-bold mt-0.5" style={{ color: hd.color }}>{hd.pct.toFixed(1)}%</span>
                        </>
                    ) : (
                        <>
                            <span className="text-[11px] text-gray-400">{centerSub || 'Total'}</span>
                            <span className="text-[28px] font-extrabold text-gray-900 leading-none">{total}</span>
                            <span className="text-[10px] text-gray-400 mt-0.5">{centerLabel}</span>
                        </>
                    )}
                </div>
            </div>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-4 max-w-[300px]">
                {data.map((d, i) => {
                    const idx = segs.findIndex(s => s.label === d.label);
                    return (
                        <div
                            key={i}
                            className="flex items-center gap-1.5 text-xs cursor-default"
                            onMouseEnter={() => { if (idx >= 0) setHov(idx); }}
                            onMouseLeave={() => setHov(null)}
                        >
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                            <span className="text-gray-600">{d.label}</span>
                            <span className="font-bold text-gray-800">{d.value}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN ANALYTICS COMPONENT
   ═══════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════
   MOUSE-FOLLOWING TOOLTIP
   — rendered fixed at cursor position, shared across all regions
   ═══════════════════════════════════════════════════════════════ */
const FollowTooltip = ({ tooltip }) => {
    if (!tooltip.show) return null;
    return (
        <div
            className="fixed z-[9999] pointer-events-none transition-opacity duration-150"
            style={{ left: tooltip.x + 14, top: tooltip.y - 10, opacity: tooltip.show ? 1 : 0 }}
        >
            <div className="bg-gray-900 text-white text-[11px] rounded-lg px-3 py-2 shadow-xl whitespace-nowrap max-w-xs">
                {tooltip.content}
            </div>
        </div>
    );
};

const RecruiterAnalytics = () => {
    const { user } = useAuth();
    const [jobs, setJobs] = useState([]);
    const [applications, setApplications] = useState([]);
    const [allCollegeApplications, setAllCollegeApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const appUnsubRef = useRef(null);
    const collegeAppUnsubRef = useRef(null);
    const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, content: null });

    const showTip = (e, content) => setTooltip({ show: true, x: e.clientX, y: e.clientY, content });
    const moveTip = (e) => setTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }));
    const hideTip = () => setTooltip({ show: false, x: 0, y: 0, content: null });

    /* ── Subscribe to recruiter's jobs ── */
    useEffect(() => {
        if (!user?.uid) return;
        const q = query(
            collection(db, COLLECTIONS.JOBS),
            where('recruiterId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );
        const unsub = onSnapshot(q, (snap) => {
            setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, [user?.uid]);

    /* ── Subscribe to applications ── */
    useEffect(() => {
        if (appUnsubRef.current) { appUnsubRef.current(); appUnsubRef.current = null; }
        const ids = jobs.map(j => j.id);
        if (!ids.length) { setApplications([]); return; }
        const chunks = [];
        for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30));
        const unsubs = [];
        const all = new Map();
        chunks.forEach(chunk => {
            const q = query(collection(db, COLLECTIONS.APPLICATIONS), where('jobId', 'in', chunk));
            unsubs.push(onSnapshot(q, snap => {
                snap.docs.forEach(d => all.set(d.id, { id: d.id, ...d.data() }));
                const cur = new Set(snap.docs.map(d => d.id));
                for (const [k, v] of all) if (chunk.includes(v.jobId) && !cur.has(k)) all.delete(k);
                setApplications(Array.from(all.values()));
            }));
        });
        appUnsubRef.current = () => unsubs.forEach(u => u());
        return () => { if (appUnsubRef.current) appUnsubRef.current(); };
    }, [jobs]);

    /* ── Subscribe to ALL college applications for benchmarking ── */
    useEffect(() => {
        if (collegeAppUnsubRef.current) { collegeAppUnsubRef.current(); }
        const q = query(collection(db, COLLECTIONS.APPLICATIONS));
        const unsub = onSnapshot(q, (snap) => {
            setAllCollegeApplications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        collegeAppUnsubRef.current = unsub;
        return () => { if (collegeAppUnsubRef.current) collegeAppUnsubRef.current(); };
    }, []);

    /* ════════════════════════════════════════════
       COMPUTED ANALYTICS DATA
       ════════════════════════════════════════════ */
    const stats = useMemo(() => {
        const totalJobs = jobs.length;
        const activeJobs = jobs.filter(j => j.status === 'active').length;
        const closedJobs = jobs.filter(j => j.status === 'closed').length;
        const draftJobs = jobs.filter(j => j.status === 'draft').length;
        const completedJobs = jobs.filter(j => j.status === 'recruitment_completed').length;
        const totalApps = applications.length;
        const applied = applications.filter(a => a.status === APPLICATION_STATUS.APPLIED).length;
        const shortlisted = applications.filter(a => a.status === APPLICATION_STATUS.SHORTLISTED).length;
        const interview = applications.filter(a => a.status === APPLICATION_STATUS.INTERVIEW_SCHEDULED).length;
        const selected = applications.filter(a => a.status === APPLICATION_STATUS.SELECTED).length;
        const rejected = applications.filter(a => a.status === APPLICATION_STATUS.REJECTED).length;

        const shortlistRate = totalApps > 0 ? ((shortlisted / totalApps) * 100).toFixed(1) : 0;
        const conversionRate = totalApps > 0 ? ((selected / totalApps) * 100).toFixed(1) : 0;
        const interviewRate = totalApps > 0 ? ((interview / totalApps) * 100).toFixed(1) : 0;
        const avgAppsPerJob = totalJobs > 0 ? (totalApps / totalJobs).toFixed(1) : 0;

        // Per-job breakdown
        const jobBreakdown = jobs.map(job => {
            const ja = applications.filter(a => a.jobId === job.id);
            return {
                ...job,
                totalApps: ja.length,
                applied: ja.filter(a => a.status === APPLICATION_STATUS.APPLIED).length,
                shortlisted: ja.filter(a => a.status === APPLICATION_STATUS.SHORTLISTED).length,
                interview: ja.filter(a => a.status === APPLICATION_STATUS.INTERVIEW_SCHEDULED).length,
                selected: ja.filter(a => a.status === APPLICATION_STATUS.SELECTED).length,
                rejected: ja.filter(a => a.status === APPLICATION_STATUS.REJECTED).length,
            };
        });

        // Job type distribution
        const jobTypeMap = {};
        jobs.forEach(j => {
            const l = JOB_TYPE_LABELS[j.jobType] || j.jobType || 'Other';
            jobTypeMap[l] = (jobTypeMap[l] || 0) + 1;
        });

        // 7-day application timeline
        const now = new Date();
        const timeline = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dayStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const dayEnd = new Date(dayStart.getTime() + 86400000);
            const count = applications.filter(a => {
                const ad = a.createdAt?.toDate?.() || a.appliedAt?.toDate?.() || new Date(a.createdAt || a.appliedAt || 0);
                return ad >= dayStart && ad < dayEnd;
            }).length;
            timeline.push({ label: dayStr, count });
        }
        const maxTimelineCount = Math.max(...timeline.map(t => t.count), 1);

        // Branch distribution
        const branchMap = {};
        applications.forEach(a => {
            const b = a.studentBranch || 'Unknown';
            branchMap[b] = (branchMap[b] || 0) + 1;
        });
        const branchData = Object.entries(branchMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
        const maxBranch = branchData.length > 0 ? branchData[0][1] : 1;

        // Funnel conversion rates between stages
        const funnelConversions = {
            toShortlist: totalApps > 0 ? ((shortlisted / totalApps) * 100).toFixed(0) : 0,
            toInterview: shortlisted > 0 ? ((interview / shortlisted) * 100).toFixed(0) : 0,
            toSelected: interview > 0 ? ((selected / interview) * 100).toFixed(0) : 0,
        };

        // Top performing jobs
        const topJobs = [...jobBreakdown].sort((a, b) => b.totalApps - a.totalApps).slice(0, 5);
        const maxTopJob = topJobs.length > 0 ? Math.max(topJobs[0].totalApps, 1) : 1;

        // Decided ratio (resolved vs pending)
        const decided = selected + rejected;
        const pending = totalApps - decided;

        // Package Analytics - for placed students only
        const placedApps = applications.filter(a => a.status === 'placed' && a.packageAmount && a.packageAmount > 0);
        const packages = placedApps.map(a => a.packageAmount).sort((a, b) => a - b);
        const avgPackage = packages.length > 0 ? (packages.reduce((sum, p) => sum + p, 0) / packages.length) : 0;
        const medianPackage = packages.length > 0 ? 
            (packages.length % 2 === 0 ? 
                (packages[packages.length / 2 - 1] + packages[packages.length / 2]) / 2 : 
                packages[Math.floor(packages.length / 2)]) : 0;
        const highestPackage = packages.length > 0 ? packages[packages.length - 1] : 0;
        const placedCount = placedApps.length;

        // College-wide package analytics for benchmarking
        const collegePlacedApps = allCollegeApplications.filter(a => a.status === 'placed' && a.packageAmount && a.packageAmount > 0);
        const collegePackages = collegePlacedApps.map(a => a.packageAmount).sort((a, b) => a - b);
        const collegeAvgPackage = collegePackages.length > 0 ? (collegePackages.reduce((sum, p) => sum + p, 0) / collegePackages.length) : 0;
        const collegeMedianPackage = collegePackages.length > 0 ? 
            (collegePackages.length % 2 === 0 ? 
                (collegePackages[collegePackages.length / 2 - 1] + collegePackages[collegePackages.length / 2]) / 2 : 
                collegePackages[Math.floor(collegePackages.length / 2)]) : 0;
        const collegeHighestPackage = collegePackages.length > 0 ? collegePackages[collegePackages.length - 1] : 0;
        const collegePlacedCount = collegePlacedApps.length;

        return {
            totalJobs, activeJobs, closedJobs, draftJobs, completedJobs,
            totalApps, applied, shortlisted, interview, selected, rejected,
            shortlistRate, conversionRate, interviewRate, avgAppsPerJob,
            jobBreakdown, jobTypeMap, timeline, maxTimelineCount,
            branchData, maxBranch, funnelConversions, topJobs, maxTopJob,
            decided, pending,
            avgPackage, medianPackage, highestPackage, placedCount,
            collegeAvgPackage, collegeMedianPackage, collegeHighestPackage, collegePlacedCount,
        };
    }, [jobs, applications]);

    /* ── Chart data ── */
    const appStatusPieData = [
        { label: 'Pending', value: stats.applied, color: '#3b82f6' },
        { label: 'Shortlisted', value: stats.shortlisted, color: '#f59e0b' },
        { label: 'Interview', value: stats.interview, color: '#8b5cf6' },
        { label: 'Selected', value: stats.selected, color: '#10b981' },
        { label: 'Rejected', value: stats.rejected, color: '#ef4444' },
    ];

    const jobStatusPieData = [
        { label: 'Active', value: stats.activeJobs, color: '#22c55e' },
        { label: 'Closed', value: stats.closedJobs, color: '#64748b' },
        { label: 'Draft', value: stats.draftJobs, color: '#eab308' },
        { label: 'Completed', value: stats.completedJobs, color: '#a855f7' },
    ];

    const pipeline = [
        { key: 'total', label: 'Total Applications', count: stats.totalApps, grad: 'from-blue-500 to-blue-600', text: 'text-blue-700' },
        { key: 'shortlisted', label: 'Shortlisted', count: stats.shortlisted, grad: 'from-amber-400 to-amber-500', text: 'text-amber-700' },
        { key: 'interview', label: 'Interview', count: stats.interview, grad: 'from-purple-500 to-purple-600', text: 'text-purple-700' },
        { key: 'selected', label: 'Selected', count: stats.selected, grad: 'from-emerald-500 to-emerald-600', text: 'text-emerald-700' },
        { key: 'rejected', label: 'Rejected', count: stats.rejected, grad: 'from-red-400 to-red-500', text: 'text-red-700' },
    ];

    const branchColors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#6366f1', '#f97316'];

    const jobTypeGradients = [
        'from-blue-500 to-cyan-500', 'from-purple-500 to-pink-500',
        'from-emerald-500 to-teal-500', 'from-amber-500 to-orange-500',
    ];

    const funnelStages = [
        { label: 'Total Applications', count: stats.totalApps, gradient: 'from-blue-500 to-blue-600', convNext: stats.funnelConversions.toShortlist },
        { label: 'Shortlisted', count: stats.shortlisted, gradient: 'from-amber-400 to-amber-500', convNext: stats.funnelConversions.toInterview },
        { label: 'Interview', count: stats.interview, gradient: 'from-purple-500 to-purple-600', convNext: stats.funnelConversions.toSelected },
        { label: 'Selected', count: stats.selected, gradient: 'from-emerald-500 to-emerald-600' },
    ];
    const maxFunnel = Math.max(stats.totalApps, 1);

    /* ── Loading ── */
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    /* ═══════════════════════════════════════════════════════════════
       RENDER — analytics-packed layout with interactive charts
       ═══════════════════════════════════════════════════════════════ */
    return (
        <div className="space-y-6 pb-8">

            {/* ═══ HEADER ═══ */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Recruitment Analytics</h1>
                    <p className="text-gray-500 mt-1">Deep insights into your entire hiring pipeline</p>
                </div>
                <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl px-4 py-2.5">
                    <span className="text-sm text-gray-600">
                        <span className="font-bold text-blue-700">{stats.totalApps}</span> applications across{' '}
                        <span className="font-bold text-indigo-700">{stats.totalJobs}</span> jobs
                    </span>
                </div>
            </div>

            {/* ═══ ROW 1 — INTERACTIVE PIE CHARTS ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Application Status Pie */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Application Status Distribution</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Hover segments for details</p>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                            </svg>
                        </div>
                    </div>
                    <InteractivePie data={appStatusPieData} size={230} centerLabel="Applications" centerSub="Total" />
                </div>

                {/* Job Status Pie */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Job Status Distribution</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Hover segments for details</p>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                    </div>
                    <InteractivePie data={jobStatusPieData} size={230} centerLabel="Jobs" centerSub="Total" />
                </div>
            </div>

            {/* ═══ ROW 2 — BAR CHARTS WITH HOVER TOOLTIPS ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* 7-Day Application Trend */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-1">
                        <h2 className="text-lg font-semibold text-gray-900">Application Trend</h2>
                        <span className="text-[11px] text-gray-400 bg-gray-50 px-2.5 py-0.5 rounded-full font-medium">Last 7 days</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-5">Hover bars for details</p>
                    <div className="flex items-end justify-between gap-2" style={{ height: '190px' }}>
                        {stats.timeline.map((day, idx) => {
                            const hPct = stats.maxTimelineCount > 0 ? (day.count / stats.maxTimelineCount) * 100 : 0;
                            return (
                                <div key={idx} className="relative flex-1 flex flex-col items-center justify-end h-full">
                                    {/* Bar */}
                                    <div className="w-full flex-1 flex flex-col justify-end">
                                        <div
                                            className="w-full rounded-t-lg bg-gradient-to-t from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 transition-all duration-300 hover:shadow-lg hover:shadow-blue-200/50 cursor-pointer"
                                            style={{ height: `${Math.max(hPct, day.count > 0 ? 8 : 3)}%`, minHeight: '4px' }}
                                            onMouseEnter={(e) => showTip(e, <><div className="font-bold text-sm">{day.count} application{day.count !== 1 ? 's' : ''}</div><div className="text-gray-300 mt-0.5">{day.label}</div></>)}
                                            onMouseMove={moveTip}
                                            onMouseLeave={hideTip}
                                        />
                                    </div>
                                    <span className="text-[9px] text-gray-500 mt-1.5 text-center leading-tight">{day.label.split(',')[0]}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Branch Distribution */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">Applicant Branches</h2>
                    <p className="text-xs text-gray-400 mb-5">Hover bars for count &amp; percentage</p>
                    {stats.branchData.length === 0 ? (
                        <p className="text-sm text-gray-400 py-12 text-center">No branch data yet</p>
                    ) : (
                        <div className="space-y-2.5">
                            {stats.branchData.map(([branch, count], idx) => {
                                const pct = stats.maxBranch > 0 ? (count / stats.maxBranch) * 100 : 0;
                                const totalPct = stats.totalApps > 0 ? ((count / stats.totalApps) * 100).toFixed(1) : 0;
                                return (
                                    <div key={branch} className="flex items-center gap-3">
                                        <div className="w-28 shrink-0 truncate text-sm text-gray-700 font-medium">{branch}</div>
                                        <div className="flex-1 h-7 bg-gray-100 rounded-full overflow-hidden relative">
                                            <div
                                                className="h-full rounded-full transition-all duration-500 hover:brightness-110 cursor-pointer"
                                                style={{ width: `${Math.max(pct, 6)}%`, backgroundColor: branchColors[idx % branchColors.length] }}
                                                onMouseEnter={(e) => showTip(e, <>{count} applicants &middot; {totalPct}%</>)}
                                                onMouseMove={moveTip}
                                                onMouseLeave={hideTip}
                                            />
                                        </div>
                                        <span className="text-sm font-bold text-gray-700 w-8 text-right">{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ ROW 3 — CONVERSION FUNNEL ═══ */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-lg font-semibold text-gray-900">Conversion Funnel</h2>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        Stage-to-stage conversion
                    </div>
                </div>
                <p className="text-xs text-gray-400 mb-6">How candidates progress through your pipeline — hover stages for detail</p>
                <div className="flex items-center justify-center gap-0 overflow-x-auto pb-2">
                    {funnelStages.map((stage, idx) => (
                        <Fragment key={stage.label}>
                            <div className="flex flex-col items-center shrink-0 relative">
                                <div
                                    className={`rounded-2xl bg-gradient-to-b ${stage.gradient} text-white flex flex-col items-center justify-center shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-default`}
                                    style={{
                                        width: `${Math.max((stage.count / maxFunnel) * 160, 76)}px`,
                                        height: '90px',
                                    }}
                                    onMouseEnter={(e) => showTip(e, <>{stage.count} candidates at {stage.label} stage{stats.totalApps > 0 && ` (${((stage.count / stats.totalApps) * 100).toFixed(1)}% of total)`}</>)}
                                    onMouseMove={moveTip}
                                    onMouseLeave={hideTip}
                                >
                                    <span className="text-2xl font-extrabold">{stage.count}</span>
                                    <span className="text-[11px] font-medium opacity-80">{stage.label}</span>
                                </div>
                            </div>
                            {idx < funnelStages.length - 1 && (
                                <div className="flex flex-col items-center mx-2 shrink-0">
                                    <svg width="36" height="18" viewBox="0 0 36 18" className="text-gray-400">
                                        <path d="M2 9 L28 9" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
                                        <path d="M24 4 L30 9 L24 14" stroke="currentColor" strokeWidth="2" fill="none" />
                                    </svg>
                                    <span className="text-[11px] font-bold text-emerald-600 mt-1">{stage.convNext}%</span>
                                </div>
                            )}
                        </Fragment>
                    ))}
                </div>
            </div>

            {/* ═══ ROW 4 — 6 KPI STAT CARDS ═══ */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                    { label: 'Total Jobs', value: stats.totalJobs, icon: '💼', gradient: 'from-blue-500 to-blue-700' },
                    { label: 'Active Jobs', value: stats.activeJobs, icon: '🟢', gradient: 'from-emerald-500 to-emerald-700' },
                    { label: 'Applications', value: stats.totalApps, icon: '📄', gradient: 'from-purple-500 to-purple-700' },
                    { label: 'Shortlisted', value: stats.shortlisted, icon: '⭐', gradient: 'from-amber-500 to-amber-700' },
                    { label: 'Selected', value: stats.selected, icon: '✅', gradient: 'from-green-500 to-green-700' },
                    { label: 'Avg / Job', value: stats.avgAppsPerJob, icon: '📊', gradient: 'from-indigo-500 to-indigo-700' },
                ].map(kpi => (
                    <div key={kpi.label} className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${kpi.gradient}`} />
                        <span className="text-2xl">{kpi.icon}</span>
                        <p className="text-2xl font-bold text-gray-900 mt-2">{kpi.value}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{kpi.label}</p>
                    </div>
                ))}
            </div>

            {/* ═══ ROW 5 — CONVERSION RATE CARDS ═══ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    {
                        label: 'Shortlist Rate', value: stats.shortlistRate, sub: `${stats.shortlisted} of ${stats.totalApps}`,
                        gradient: 'from-blue-600 to-indigo-700', subClr: 'text-blue-200', lblClr: 'text-blue-100',
                        icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
                    },
                    {
                        label: 'Selection Rate', value: stats.conversionRate, sub: `${stats.selected} of ${stats.totalApps}`,
                        gradient: 'from-emerald-600 to-teal-700', subClr: 'text-emerald-200', lblClr: 'text-emerald-100',
                        icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
                    },
                    {
                        label: 'Interview Rate', value: stats.interviewRate, sub: `${stats.interview} of ${stats.totalApps}`,
                        gradient: 'from-purple-600 to-pink-700', subClr: 'text-purple-200', lblClr: 'text-purple-100',
                        icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
                    },
                ].map(card => (
                    <div key={card.label} className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-5 text-white hover:shadow-lg transition-shadow`}>
                        <div className="flex items-center justify-between">
                            <p className={`text-sm font-medium ${card.lblClr}`}>{card.label}</p>
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">{card.icon}</div>
                        </div>
                        <p className="text-3xl font-bold mt-2">{card.value}%</p>
                        <p className={`text-xs ${card.subClr} mt-1`}>{card.sub} applicants</p>
                    </div>
                ))}
            </div>

            {/* ═══ ROW 6 — PIPELINE + TOP PERFORMING JOBS ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Hiring Pipeline */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-5">Hiring Pipeline</h2>
                    <div className="space-y-3">
                        {pipeline.map(stage => {
                            const pct = stats.totalApps > 0 ? (stage.count / stats.totalApps) * 100 : 0;
                            return (
                                <div key={stage.key} className="flex items-center gap-4 relative">
                                    <div className="w-24 shrink-0"><span className={`text-sm font-medium ${stage.text}`}>{stage.label}</span></div>
                                    <div
                                        className="flex-1 h-9 bg-gray-100 rounded-xl overflow-hidden relative cursor-pointer"
                                        onMouseEnter={(e) => showTip(e, <>{stage.label}: {stage.count} candidates ({pct.toFixed(1)}% of {stats.totalApps} total)</>)}
                                        onMouseMove={moveTip}
                                        onMouseLeave={hideTip}
                                    >
                                        <div
                                            className={`h-full bg-gradient-to-r ${stage.grad} rounded-xl transition-all duration-700 hover:brightness-110`}
                                            style={{ width: `${Math.max(pct, stage.count > 0 ? 4 : 0)}%` }}
                                        />
                                        <span className="absolute inset-y-0 left-3 flex items-center text-sm font-bold text-gray-700">{stage.count}</span>
                                    </div>
                                    <span className="w-12 text-right text-sm font-semibold text-gray-600">{pct.toFixed(0)}%</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Top Performing Jobs */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">Top Performing Jobs</h2>
                    <p className="text-xs text-gray-400 mb-5">By application volume — hover for breakdown</p>
                    {stats.topJobs.length === 0 ? (
                        <p className="text-sm text-gray-400 py-12 text-center">No jobs yet</p>
                    ) : (
                        <div className="space-y-3">
                            {stats.topJobs.map((job, idx) => {
                                const pct = stats.maxTopJob > 0 ? (job.totalApps / stats.maxTopJob) * 100 : 0;
                                const gradients = ['from-violet-500 to-purple-600', 'from-blue-500 to-cyan-500', 'from-emerald-500 to-teal-500', 'from-amber-500 to-orange-500', 'from-rose-500 to-pink-500'];
                                return (
                                    <div
                                        key={job.id}
                                        className="flex items-center gap-3 relative cursor-pointer"
                                        onMouseEnter={(e) => showTip(e, <><div className="font-bold mb-1">{job.title}</div><div>✓ {job.selected} selected · ⭐ {job.shortlisted} shortlisted · 📋 {job.totalApps} total</div></>)}
                                        onMouseMove={moveTip}
                                        onMouseLeave={hideTip}
                                    >
                                        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-gray-800 truncate">{job.title}</div>
                                            <div className="h-5 bg-gray-100 rounded-full overflow-hidden mt-1">
                                                <div
                                                    className={`h-full rounded-full bg-gradient-to-r ${gradients[idx % gradients.length]} transition-all duration-500 hover:brightness-110`}
                                                    style={{ width: `${Math.max(pct, 8)}%` }}
                                                />
                                            </div>
                                        </div>
                                        <span className="text-sm font-bold text-gray-700 w-8 text-right shrink-0">{job.totalApps}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ ROW 7 — JOB TYPE DISTRIBUTION & DECISION SUMMARY ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Job Type Distribution</h2>
                    {Object.keys(stats.jobTypeMap).length === 0 ? (
                        <p className="text-sm text-gray-400 py-8 text-center">No jobs posted yet</p>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            {Object.entries(stats.jobTypeMap).map(([type, count], idx) => (
                                <div key={type}
                                    className={`bg-gradient-to-r ${jobTypeGradients[idx % jobTypeGradients.length]} rounded-xl p-4 text-white hover:shadow-lg hover:scale-[1.03] transition-all cursor-default`}
                                >
                                    <p className="text-2xl font-bold">{count}</p>
                                    <p className="text-sm font-medium opacity-90">{type}</p>
                                    <p className="text-[10px] opacity-70 mt-1">
                                        {stats.totalJobs > 0 ? ((count / stats.totalJobs) * 100).toFixed(0) : 0}% of all jobs
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Decision Summary */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Decision Summary</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Resolved Applications</span>
                            <span className="text-sm font-bold text-gray-900">{stats.decided}</span>
                        </div>
                        <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
                            {stats.decided > 0 && (
                                <>
                                    <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(stats.selected / (stats.decided || 1)) * 100}%` }} />
                                    <div className="h-full bg-red-400 transition-all duration-500" style={{ width: `${(stats.rejected / (stats.decided || 1)) * 100}%` }} />
                                </>
                            )}
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Selected: {stats.selected}</span>
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400"></span> Rejected: {stats.rejected}</span>
                        </div>
                        <div className="border-t border-gray-100 pt-3 mt-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Still Pending</span>
                                <span className="text-sm font-bold text-amber-600">{stats.pending}</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
                                <div className="h-full bg-amber-400 rounded-full transition-all duration-500"
                                    style={{ width: `${stats.totalApps > 0 ? (stats.pending / stats.totalApps) * 100 : 0}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">
                                {stats.totalApps > 0 ? ((stats.pending / stats.totalApps) * 100).toFixed(0) : 0}% of all applications awaiting decision
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ PACKAGE ANALYTICS SECTION ═══ */}
            {stats.placedCount > 0 && (
                <div className="space-y-6">
                <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 rounded-2xl shadow-sm border border-blue-200/50 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-200/50">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Your Package Analytics</h2>
                            <p className="text-xs text-gray-500 mt-0.5">Package statistics for candidates you recruited</p>
                        </div>
                        <div className="ml-auto px-3 py-1.5 bg-blue-100 border border-blue-300 rounded-lg">
                            <span className="text-xs font-bold text-blue-700">{stats.placedCount} placed by you</span>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {/* Highest Package */}
                        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/90 to-orange-500/90 p-6 shadow-lg">
                            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                            <div className="relative">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                        </svg>
                                    </div>
                                    <span className="text-xs font-semibold text-white/90 bg-white/15 px-2.5 py-1 rounded-lg backdrop-blur-sm">MAX</span>
                                </div>
                                <p className="text-sm text-white/90 font-medium mb-1">Highest Package</p>
                                <p className="text-3xl font-bold text-white mb-1">₹{stats.highestPackage.toLocaleString()}</p>
                                <p className="text-xs text-white/80">per year</p>
                            </div>
                        </div>

                        {/* Average Package */}
                        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/90 to-indigo-500/90 p-6 shadow-lg">
                            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                            <div className="relative">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <span className="text-xs font-semibold text-white/90 bg-white/15 px-2.5 py-1 rounded-lg backdrop-blur-sm">AVG</span>
                                </div>
                                <p className="text-sm text-white/90 font-medium mb-1">Average Package</p>
                                <p className="text-3xl font-bold text-white mb-1">₹{Math.round(stats.avgPackage).toLocaleString()}</p>
                                <p className="text-xs text-white/80">per year</p>
                            </div>
                        </div>

                        {/* Median Package */}
                        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/90 to-pink-500/90 p-6 shadow-lg">
                            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                            <div className="relative">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                                        </svg>
                                    </div>
                                    <span className="text-xs font-semibold text-white/90 bg-white/15 px-2.5 py-1 rounded-lg backdrop-blur-sm">MED</span>
                                </div>
                                <p className="text-sm text-white/90 font-medium mb-1">Median Package</p>
                                <p className="text-3xl font-bold text-white mb-1">₹{Math.round(stats.medianPackage).toLocaleString()}</p>
                                <p className="text-xs text-white/80">per year</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* College-wide Benchmark */}
                {stats.collegePlacedCount > 0 && (
                <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/80 rounded-2xl shadow-sm border border-emerald-200/50 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200/50">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">College-Wide Package Benchmark</h2>
                            <p className="text-xs text-gray-500 mt-0.5">Overall placement statistics across all recruiters</p>
                        </div>
                        <div className="ml-auto px-3 py-1.5 bg-emerald-100 border border-emerald-300 rounded-lg">
                            <span className="text-xs font-bold text-emerald-700">{stats.collegePlacedCount} total placements</span>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {/* Highest Package */}
                        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/90 to-orange-500/90 p-6 shadow-lg">
                            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                            <div className="relative">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                        </svg>
                                    </div>
                                    <span className="text-xs font-semibold text-white/90 bg-white/15 px-2.5 py-1 rounded-lg backdrop-blur-sm">MAX</span>
                                </div>
                                <p className="text-sm text-white/90 font-medium mb-1">Highest Package</p>
                                <p className="text-3xl font-bold text-white mb-1">₹{stats.collegeHighestPackage.toLocaleString()}</p>
                                <p className="text-xs text-white/80">per year</p>
                            </div>
                        </div>

                        {/* Average Package */}
                        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/90 to-indigo-500/90 p-6 shadow-lg">
                            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                            <div className="relative">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <span className="text-xs font-semibold text-white/90 bg-white/15 px-2.5 py-1 rounded-lg backdrop-blur-sm">AVG</span>
                                </div>
                                <p className="text-sm text-white/90 font-medium mb-1">Average Package</p>
                                <p className="text-3xl font-bold text-white mb-1">₹{Math.round(stats.collegeAvgPackage).toLocaleString()}</p>
                                <p className="text-xs text-white/80">per year</p>
                            </div>
                        </div>

                        {/* Median Package */}
                        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/90 to-pink-500/90 p-6 shadow-lg">
                            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                            <div className="relative">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                                        </svg>
                                    </div>
                                    <span className="text-xs font-semibold text-white/90 bg-white/15 px-2.5 py-1 rounded-lg backdrop-blur-sm">MED</span>
                                </div>
                                <p className="text-sm text-white/90 font-medium mb-1">Median Package</p>
                                <p className="text-3xl font-bold text-white mb-1">₹{Math.round(stats.collegeMedianPackage).toLocaleString()}</p>
                                <p className="text-xs text-white/80">per year</p>
                            </div>
                        </div>
                    </div>

                    {/* Comparison Note */}
                    <div className="mt-5 p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-emerald-200/50">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">Performance Benchmark</p>
                                <p className="text-xs text-gray-600 mt-1">
                                    {stats.avgPackage > stats.collegeAvgPackage 
                                        ? `Your average package (₹${Math.round(stats.avgPackage).toLocaleString()}) is ${((stats.avgPackage / stats.collegeAvgPackage - 1) * 100).toFixed(1)}% above the college average!` 
                                        : stats.avgPackage < stats.collegeAvgPackage 
                                        ? `College average is ₹${Math.round(stats.collegeAvgPackage).toLocaleString()}. Keep improving your recruitment quality!`
                                        : `Your performance matches the college average of ₹${Math.round(stats.collegeAvgPackage).toLocaleString()}.`
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </div>
            )}

            {/* ═══ ROW 8 — PER-JOB BREAKDOWN TABLE ═══ */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 pb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Per-Job Breakdown</h2>
                    <p className="text-xs text-gray-400 mt-1">Detailed application stats for each posting — with mini funnel</p>
                </div>
                {stats.jobBreakdown.length === 0 ? (
                    <p className="text-sm text-gray-400 py-8 text-center">No jobs to display</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-y border-gray-100">
                                    <th className="text-left py-3 px-6 font-semibold text-gray-600">Job Title</th>
                                    <th className="text-center py-3 px-3 font-semibold text-gray-600">Status</th>
                                    <th className="text-center py-3 px-3 font-semibold text-blue-600">Pending</th>
                                    <th className="text-center py-3 px-3 font-semibold text-amber-600">Short.</th>
                                    <th className="text-center py-3 px-3 font-semibold text-purple-600">Interview</th>
                                    <th className="text-center py-3 px-3 font-semibold text-emerald-600">Selected</th>
                                    <th className="text-center py-3 px-3 font-semibold text-red-500">Rejected</th>
                                    <th className="text-center py-3 px-3 font-semibold text-gray-600">Total</th>
                                    <th className="text-center py-3 px-4 font-semibold text-gray-600">Funnel</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {stats.jobBreakdown.map(job => {
                                    const t = job.totalApps || 1;
                                    return (
                                        <tr key={job.id} className="hover:bg-gray-50/50 transition-colors group/row">
                                            <td className="py-3 px-6">
                                                <div className="font-medium text-gray-900 truncate max-w-[200px]">{job.title}</div>
                                                <div className="text-xs text-gray-400">{job.location || 'Remote'}</div>
                                            </td>
                                            <td className="text-center py-3 px-3">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    job.status === 'active' ? 'bg-green-100 text-green-700' :
                                                    job.status === 'closed' ? 'bg-gray-100 text-gray-600' :
                                                    'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                    {job.status?.charAt(0).toUpperCase() + job.status?.slice(1) || 'Draft'}
                                                </span>
                                            </td>
                                            <td className="text-center py-3 px-3">
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold text-sm">{job.applied}</span>
                                            </td>
                                            <td className="text-center py-3 px-3">
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 text-amber-700 font-bold text-sm">{job.shortlisted}</span>
                                            </td>
                                            <td className="text-center py-3 px-3">
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-purple-50 text-purple-700 font-bold text-sm">{job.interview}</span>
                                            </td>
                                            <td className="text-center py-3 px-3">
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-sm">{job.selected}</span>
                                            </td>
                                            <td className="text-center py-3 px-3">
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-600 font-bold text-sm">{job.rejected}</span>
                                            </td>
                                            <td className="text-center py-3 px-3">
                                                <span className="font-bold text-gray-900">{job.totalApps}</span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div
                                                    className="relative cursor-pointer"
                                                    onMouseEnter={(e) => showTip(e, <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]"><span className="text-blue-300">Pending: {job.applied}</span><span className="text-amber-300">Shortlisted: {job.shortlisted}</span><span className="text-purple-300">Interview: {job.interview}</span><span className="text-emerald-300">Selected: {job.selected}</span><span className="text-red-300">Rejected: {job.rejected}</span></div>)}
                                                    onMouseMove={moveTip}
                                                    onMouseLeave={hideTip}
                                                >
                                                    <div className="flex h-3 w-28 rounded-full overflow-hidden bg-gray-100 mx-auto">
                                                        <div className="bg-blue-500 transition-all" style={{ width: `${(job.applied / t) * 100}%` }} />
                                                        <div className="bg-amber-400 transition-all" style={{ width: `${(job.shortlisted / t) * 100}%` }} />
                                                        <div className="bg-purple-500 transition-all" style={{ width: `${(job.interview / t) * 100}%` }} />
                                                        <div className="bg-emerald-500 transition-all" style={{ width: `${(job.selected / t) * 100}%` }} />
                                                        <div className="bg-red-400 transition-all" style={{ width: `${(job.rejected / t) * 100}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ═══ GLOBAL MOUSE-FOLLOWING TOOLTIP ═══ */}
            <FollowTooltip tooltip={tooltip} />

        </div>
    );
};

export default RecruiterAnalytics;
