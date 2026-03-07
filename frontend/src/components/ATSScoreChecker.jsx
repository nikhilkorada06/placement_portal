import { useState } from 'react';
import { Link } from 'react-router-dom';
import { analyzeATSScore } from '@services/atsScoreService';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@config/firebase';
import { COLLECTIONS } from '@config/constants';

const CATEGORY_STYLES = {
    Excellent: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', bar: 'bg-green-500', badge: 'bg-green-100 text-green-800' },
    Good: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', bar: 'bg-blue-500', badge: 'bg-blue-100 text-blue-800' },
    'Needs Improvement': { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', bar: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-800' },
    Poor: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', bar: 'bg-red-500', badge: 'bg-red-100 text-red-800' },
};

const SUGGESTION_ICONS = {
    skill: (
        <svg className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
    ),
    keyword: (
        <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
    ),
    section: (
        <svg className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    ),
    quality: (
        <svg className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
    ),
};

const BreakdownBar = ({ label, score, max }) => {
    const pct = max > 0 ? (score / max) * 100 : 0;
    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{label}</span>
                <span className="font-medium text-gray-900">{score}/{max}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                    className={`h-2 rounded-full transition-all duration-500 ${pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-400'
                        }`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
};

const ATSScoreChecker = ({ job, studentProfile, userId, hasResume }) => {
    const [result, setResult] = useState(null);
    const [checking, setChecking] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const handleCheck = async () => {
        if (!hasResume) return;

        setChecking(true);
        try {
            // Small delay for UX feel
            await new Promise((r) => setTimeout(r, 300));

            const analysis = analyzeATSScore({ studentProfile, job });
            setResult(analysis);
            setShowSuggestions(false);

            // Save to history in Firestore (fire-and-forget)
            if (userId && job?.id) {
                const historyEntry = {
                    jobId: job.id,
                    jobTitle: job.title || '',
                    companyName: job.companyName || '',
                    score: analysis.score,
                    category: analysis.category,
                    checkedAt: new Date().toISOString(),
                };
                updateDoc(doc(db, COLLECTIONS.STUDENTS, userId), {
                    atsScoreHistory: arrayUnion(historyEntry),
                }).catch(() => { /* non-critical */ });
            }
        } finally {
            setChecking(false);
        }
    };

    const style = result ? CATEGORY_STYLES[result.category] || CATEGORY_STYLES.Poor : null;

    // ── No resume state ───────────────────────
    if (!hasResume) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        ATS Score Checker
                    </h2>
                </div>
                <div className="p-6 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="font-medium text-gray-700 mb-1">No Resume Found</p>
                    <p className="text-gray-500 text-sm mb-4">
                        Upload or generate a resume first to check your ATS compatibility score.
                    </p>
                    <Link to="/student/resume" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Upload or Generate Resume
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    ATS Score Checker
                </h2>
            </div>

            <div className="p-6">
                {/* Before checking */}
                {!result && (
                    <div className="text-center">
                        <p className="text-sm text-gray-600 mb-4">
                            Analyze how well your resume matches this job&apos;s requirements.
                        </p>
                        <button
                            onClick={handleCheck}
                            disabled={checking}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 font-medium text-sm"
                        >
                            {checking ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                    </svg>
                                    Check ATS Score
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Results */}
                {result && (
                    <div className="space-y-5">
                        {/* Score Card */}
                        <div className={`rounded-xl p-5 ${style.bg} ${style.border} border`}>
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">ATS Compatibility Score</p>
                                    <div className="flex items-baseline gap-2 mt-1">
                                        <span className={`text-4xl font-bold ${style.text}`}>{result.score}</span>
                                        <span className="text-gray-400 text-lg">/100</span>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${style.badge}`}>
                                    {result.category}
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                    className={`h-3 rounded-full transition-all duration-700 ${style.bar}`}
                                    style={{ width: `${result.score}%` }}
                                />
                            </div>
                        </div>

                        {/* Breakdown */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Score Breakdown</h3>
                            <BreakdownBar label="Keyword Match" score={result.breakdown.keywords.score} max={result.breakdown.keywords.max} />
                            <BreakdownBar label="Skills Match" score={result.breakdown.skills.score} max={result.breakdown.skills.max} />
                            <BreakdownBar label="Section Presence" score={result.breakdown.sections.score} max={result.breakdown.sections.max} />
                            <BreakdownBar label="Resume Quality" score={result.breakdown.quality.score} max={result.breakdown.quality.max} />
                        </div>

                        {/* Section Details */}
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(result.breakdown.sections.details).map(([name, present]) => (
                                <span
                                    key={name}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${present ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                                        }`}
                                >
                                    {present ? (
                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                    {name.charAt(0).toUpperCase() + name.slice(1)}
                                </span>
                            ))}
                        </div>

                        {/* Suggestions toggle */}
                        {result.suggestions.length > 0 && (
                            <div>
                                <button
                                    onClick={() => setShowSuggestions(!showSuggestions)}
                                    className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                                >
                                    <svg
                                        className={`w-4 h-4 transition-transform ${showSuggestions ? 'rotate-90' : ''}`}
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                    {showSuggestions ? 'Hide' : 'View'} Improvement Suggestions ({result.suggestions.length})
                                </button>

                                {showSuggestions && (
                                    <div className="mt-3 space-y-2">
                                        {result.suggestions.map((s, i) => (
                                            <div key={i} className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-lg">
                                                {SUGGESTION_ICONS[s.type] || SUGGESTION_ICONS.quality}
                                                <span className="text-sm text-gray-700">{s.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
                            <Link
                                to="/student/resume"
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit Resume
                            </Link>
                            <button
                                onClick={handleCheck}
                                disabled={checking}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Re-check Score
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ATSScoreChecker;
