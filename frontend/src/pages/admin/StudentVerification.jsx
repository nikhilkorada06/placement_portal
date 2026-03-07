import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '@config/firebase';
import {
    ArrowLeftIcon,
    ShieldCheckIcon,
    XMarkIcon,
    CheckIcon,
    EnvelopeIcon,
    IdentificationIcon,
    AcademicCapIcon,
    ClockIcon,
    MagnifyingGlassIcon,
    EyeIcon,
    StarIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { createAccountVerifiedNotification } from '@services/notificationService';
import { sendAccountVerifiedEmail } from '@services/emailService';

const StudentVerification = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState(null); // uid of student being processed
    const [selectedStudent, setSelectedStudent] = useState(null); // for profile modal

    // Fetch students with their verification status
    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const usersQuery = query(
                    collection(db, 'users'),
                    where('role', '==', 'student')
                );
                const usersSnapshot = await getDocs(usersQuery);
                const usersMap = {};
                usersSnapshot.forEach((d) => {
                    usersMap[d.id] = { id: d.id, ...d.data() };
                });

                const studentsSnapshot = await getDocs(collection(db, 'students'));
                const list = [];
                studentsSnapshot.forEach((d) => {
                    const sData = d.data();
                    const uData = usersMap[d.id];
                    if (uData) {
                        list.push({
                            id: d.id,
                            fullName: uData.fullName || sData.fullName || 'Unknown',
                            email: uData.email || '',
                            rollNumber: sData.rollNumber || '',
                            branch: sData.branch || '',
                            cgpa: sData.cgpa || '',
                            gender: sData.gender || '',
                            aboutMe: sData.aboutMe || '',
                            skills: sData.skills || [],
                            projects: sData.projects || [],
                            achievements: sData.achievements || [],
                            resumeUrl: sData.resumeUrl || '',
                            profilePhoto: sData.profilePhoto || '',
                            profileCompleted: sData.profileCompleted || false,
                            isAdminVerified: uData.isAdminVerified ?? true,
                            createdAt: uData.createdAt || sData.createdAt || '',
                        });
                    }
                });

                // Sort newest first
                list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
                setStudents(list);
            } catch (error) {
                console.error('Error fetching students:', error);
                toast.error('Failed to load students');
            } finally {
                setLoading(false);
            }
        };
        fetchStudents();
    }, []);

    const handleVerify = async (studentId, studentName) => {
        setActionLoading(studentId);
        try {
            await updateDoc(doc(db, 'users', studentId), {
                isAdminVerified: true,
                updatedAt: new Date().toISOString(),
            });
            setStudents((prev) =>
                prev.map((s) => (s.id === studentId ? { ...s, isAdminVerified: true } : s))
            );

            // Send email & in-app notification
            const student = students.find((s) => s.id === studentId);
            if (student?.email) {
                sendAccountVerifiedEmail({ toEmail: student.email, toName: studentName, role: 'student' });
            }
            createAccountVerifiedNotification(studentId, 'student');

            toast.success(`${studentName} has been verified`);
        } catch (error) {
            console.error('Error verifying student:', error);
            toast.error('Failed to verify student');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (studentId, studentName) => {
        setActionLoading(studentId);
        try {
            await updateDoc(doc(db, 'users', studentId), {
                isAdminVerified: false,
                updatedAt: new Date().toISOString(),
            });
            toast.success(`${studentName}'s verification was rejected`);
        } catch (error) {
            console.error('Error rejecting student:', error);
            toast.error('Failed to reject student');
        } finally {
            setActionLoading(null);
        }
    };

    // Filter logic - only show pending students
    const filtered = students.filter((s) => {
        const isPending = s.isAdminVerified === false;
        const matchSearch =
            !searchTerm.trim() ||
            (s.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.rollNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.branch || '').toLowerCase().includes(searchTerm.toLowerCase());
        return isPending && matchSearch;
    });

    const pendingCount = students.filter((s) => s.isAdminVerified === false).length;

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return dateStr;
        }
    };

    const getInitial = (name) => (name || 'S').charAt(0).toUpperCase();

    const getSkillColor = (index) => {
        const colors = [
            'bg-blue-100 text-blue-700',
            'bg-purple-100 text-purple-700',
            'bg-green-100 text-green-700',
            'bg-orange-100 text-orange-700',
            'bg-pink-100 text-pink-700',
            'bg-cyan-100 text-cyan-700',
            'bg-rose-100 text-rose-700',
            'bg-indigo-100 text-indigo-700',
        ];
        return colors[index % colors.length];
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto" />
                    <p className="mt-4 text-gray-600">Loading verification requests...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link
                        to="/admin/students"
                        className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <ShieldCheckIcon className="w-7 h-7 text-emerald-600" />
                            Student Verification
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Review and approve student account requests
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-amber-50 rounded-xl flex items-center justify-center">
                        <ClockIcon className="w-7 h-7 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-gray-900">{pendingCount}</p>
                        <p className="text-sm text-gray-500">Pending Verification Requests</p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="flex justify-end">
                <div className="relative w-full sm:w-96">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search students..."
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Student List */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckIcon className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">No pending requests</h3>
                    <p className="text-sm text-gray-500">All student accounts have been reviewed.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((student) => {
                        const initial = (student.fullName || 'S').charAt(0).toUpperCase();
                        const isProcessing = actionLoading === student.id;

                        return (
                            <div
                                key={student.id}
                                className="bg-white rounded-xl border border-amber-200 bg-amber-50/30 p-4 transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    {/* Avatar */}
                                    {student.profilePhoto ? (
                                        <img
                                            src={student.profilePhoto}
                                            alt={student.fullName}
                                            className="w-12 h-12 rounded-xl object-cover border border-gray-200 flex-shrink-0"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                                            <span className="text-lg font-bold text-white">{initial}</span>
                                        </div>
                                    )}

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-semibold text-gray-900 truncate">{student.fullName}</h3>
                                            <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                                                <ClockIcon className="w-3 h-3" />
                                                Pending
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                            {student.email && (
                                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                                    <EnvelopeIcon className="w-3 h-3" />
                                                    {student.email}
                                                </span>
                                            )}
                                            {student.rollNumber && (
                                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                                    <IdentificationIcon className="w-3 h-3" />
                                                    {student.rollNumber}
                                                </span>
                                            )}
                                            {student.branch && (
                                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                                    <AcademicCapIcon className="w-3 h-3" />
                                                    {student.branch}
                                                </span>
                                            )}
                                            {student.createdAt && (
                                                <span className="text-xs text-gray-400">
                                                    Registered {formatDate(student.createdAt)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => setSelectedStudent(student)}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                                        >
                                            <EyeIcon className="w-3.5 h-3.5" />
                                            View
                                        </button>
                                        <button
                                            onClick={() => handleVerify(student.id, student.fullName)}
                                            disabled={isProcessing}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                                        >
                                            {isProcessing ? (
                                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                                            ) : (
                                                <CheckIcon className="w-3.5 h-3.5" />
                                            )}
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleReject(student.id, student.fullName)}
                                            disabled={isProcessing}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                                        >
                                            <XMarkIcon className="w-3.5 h-3.5" />
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Profile Modal ────────────────────────────────────── */}
            {selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedStudent(null)}>
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

                    {/* Modal */}
                    <div
                        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden animate-[modalIn_0.25s_ease-out]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header - Gradient */}
                        <div className="relative h-28 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 flex-shrink-0">
                            <div className="absolute inset-0 opacity-15">
                                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                                    <defs>
                                        <pattern id="modal-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                                            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="white" strokeWidth="0.5" />
                                        </pattern>
                                    </defs>
                                    <rect width="100%" height="100%" fill="url(#modal-grid)" />
                                </svg>
                            </div>
                            {/* Close button */}
                            <button
                                onClick={() => setSelectedStudent(null)}
                                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/15 backdrop-blur-sm hover:bg-white/30 flex items-center justify-center transition-colors"
                            >
                                <XMarkIcon className="w-5 h-5 text-white" />
                            </button>
                            {/* Verification Status badge */}
                            <div className="absolute top-3 left-4">
                                {selectedStudent.isAdminVerified === false ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-amber-100 border border-amber-300/30 backdrop-blur-sm">
                                        <ClockIcon className="w-3.5 h-3.5" />
                                        Pending Verification
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-400/20 text-green-100 border border-green-300/30 backdrop-blur-sm">
                                        <CheckIcon className="w-3.5 h-3.5" />
                                        Verified
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Avatar overlapping header */}
                        <div className="px-6 -mt-10 relative z-10">
                            {selectedStudent.profilePhoto ? (
                                <img
                                    src={selectedStudent.profilePhoto}
                                    alt={selectedStudent.fullName}
                                    className="w-20 h-20 rounded-xl object-cover border-4 border-white shadow-lg bg-white"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-500 border-4 border-white shadow-lg flex items-center justify-center">
                                    <span className="text-2xl font-bold text-white">{getInitial(selectedStudent.fullName)}</span>
                                </div>
                            )}
                        </div>

                        {/* Scrollable Content */}
                        <div className="px-6 pt-3 pb-6 overflow-y-auto max-h-[calc(85vh-10rem)]">
                            <h2 className="text-xl font-bold text-gray-900">{selectedStudent.fullName}</h2>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                {selectedStudent.branch && (
                                    <span className="text-xs text-purple-600 font-medium bg-purple-50 px-2.5 py-0.5 rounded-md">
                                        {selectedStudent.branch}
                                    </span>
                                )}
                                {selectedStudent.gender && (
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-md">
                                        {selectedStudent.gender}
                                    </span>
                                )}
                                {selectedStudent.cgpa && (
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                                        <StarIcon className="w-3 h-3 text-amber-400" />
                                        {selectedStudent.cgpa} / 10
                                    </span>
                                )}
                            </div>

                            {/* Contact Info */}
                            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                                {selectedStudent.email && (
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                        <EnvelopeIcon className="w-3.5 h-3.5" />
                                        {selectedStudent.email}
                                    </div>
                                )}
                                {selectedStudent.rollNumber && (
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                        <IdentificationIcon className="w-3.5 h-3.5" />
                                        {selectedStudent.rollNumber}
                                    </div>
                                )}
                                {selectedStudent.createdAt && (
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                        <ClockIcon className="w-3.5 h-3.5" />
                                        Registered {formatDate(selectedStudent.createdAt)}
                                    </div>
                                )}
                            </div>

                            {/* Divider */}
                            <hr className="my-4 border-gray-100" />

                            {/* About */}
                            {selectedStudent.aboutMe && (
                                <div className="mb-4">
                                    <h4 className="text-xs font-semibold text-gray-900 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                        About
                                    </h4>
                                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{selectedStudent.aboutMe}</p>
                                </div>
                            )}

                            {/* Skills */}
                            {(selectedStudent.skills || []).length > 0 && (
                                <div className="mb-4">
                                    <h4 className="text-xs font-semibold text-gray-900 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                        Skills ({selectedStudent.skills.length})
                                    </h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedStudent.skills.map((skill, i) => (
                                            <span key={skill} className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${getSkillColor(i)}`}>
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Projects */}
                            {(selectedStudent.projects || []).length > 0 && (
                                <div className="mb-4">
                                    <h4 className="text-xs font-semibold text-gray-900 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                                        Projects ({selectedStudent.projects.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {selectedStudent.projects.map((proj, idx) => (
                                            <div key={proj.id || idx} className="bg-gray-50 rounded-xl p-3">
                                                <p className="text-sm font-semibold text-gray-900">{proj.title}</p>
                                                {proj.description && (
                                                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{proj.description}</p>
                                                )}
                                                {proj.link && (
                                                    <a
                                                        href={proj.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-purple-600 font-medium hover:underline mt-1 inline-flex items-center gap-1"
                                                    >
                                                        View Project
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Achievements */}
                            {(selectedStudent.achievements || []).length > 0 && (
                                <div className="mb-4">
                                    <h4 className="text-xs font-semibold text-gray-900 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                                        Achievements ({selectedStudent.achievements.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {selectedStudent.achievements.map((ach, idx) => (
                                            <div key={ach.id || idx} className="flex items-start gap-2.5">
                                                <span className="text-sm mt-0.5">🏆</span>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">{ach.title}</p>
                                                    {ach.date && <p className="text-[11px] text-gray-400">{ach.date}</p>}
                                                    {ach.description && <p className="text-xs text-gray-500 mt-0.5">{ach.description}</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Resume */}
                            {selectedStudent.resumeUrl && (
                                <a
                                    href={selectedStudent.resumeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    View Resume
                                </a>
                            )}

                            {/* Empty profile notice */}
                            {!selectedStudent.aboutMe && !(selectedStudent.skills || []).length && !(selectedStudent.projects || []).length && !(selectedStudent.achievements || []).length && (
                                <div className="text-center py-6">
                                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <IdentificationIcon className="w-7 h-7 text-gray-300" />
                                    </div>
                                    <p className="text-sm text-gray-400">This student hasn&apos;t completed their profile yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Inline animation keyframes */}
            <style>{`
                @keyframes modalIn {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default StudentVerification;
