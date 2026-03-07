import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@context/AuthContext';
import { uploadResumeToCloudinary } from '@services/cloudinaryService';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@config/firebase';
import { COLLECTIONS, VALIDATION } from '@config/constants';
import { analyzeResumeFile } from '@utils/resumeScore';
import { generateAndUploadResume } from '@services/resumeGeneratorService';
import ResumeTemplate from '@components/ResumeTemplate';
import toast from 'react-hot-toast';
import {
    CloudArrowUpIcon,
    DocumentTextIcon,
    TrashIcon,
    ArrowDownTrayIcon,
    EyeIcon,
    XMarkIcon,
    CheckCircleIcon,
    SparklesIcon,
    PencilSquareIcon,
} from '@heroicons/react/24/outline';

const Resume = () => {
    const { user, userProfile, refreshUserProfile } = useAuth();
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);
    const [resumeData, setResumeData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showPreview, setShowPreview] = useState(false);
    const [resumeScore, setResumeScore] = useState(0);
    const [generating, setGenerating] = useState(false);
    const [profileForResume, setProfileForResume] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editFormData, setEditFormData] = useState(null);
    const [editSkillInput, setEditSkillInput] = useState('');
    const [editProjectInput, setEditProjectInput] = useState({ title: '', description: '', link: '' });
    const [editAchievementInput, setEditAchievementInput] = useState({ title: '', description: '', date: '' });
    const resumeTemplateRef = useRef(null);

    // Fetch existing resume data
    const fetchResumeData = useCallback(async () => {
        if (!user) return;

        try {
            setLoading(true);

            const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));
            const studentDoc = await getDoc(doc(db, COLLECTIONS.STUDENTS, user.uid));
            const userData = userDoc.exists() ? userDoc.data() : {};
            const studentData = studentDoc.exists() ? studentDoc.data() : {};
            const existingResumeUrl = userData.resumeUrl || studentData?.resume?.url || null;

            if (studentData?.resume) {
                setResumeData(studentData.resume);
                // Try to analyze existing resume for score
                if (studentData.resume.url) {
                    try {
                        const response = await fetch(studentData.resume.url);
                        const blob = await response.blob();
                        const file = new File([blob], studentData.resume.name || 'resume.pdf', {
                            type: studentData.resume.type || 'application/pdf',
                        });
                        const analysis = await analyzeResumeFile(file);
                        setResumeScore(analysis.score || 0);
                    } catch (error) {
                        console.error('Error analyzing existing resume:', error);
                        setResumeScore(0);
                    }
                }
            } else if (existingResumeUrl) {
                setResumeData({
                    url: existingResumeUrl,
                    name: 'Uploaded Resume',
                    size: 0,
                    type: 'application/pdf',
                    uploadedAt: new Date().toISOString(),
                });
                setResumeScore(0);
            } else {
                setResumeData(null);
                setResumeScore(0);
            }

            // Fetch student profile data for resume generation
            const profileForGen = {
                fullName: userData.fullName || userProfile?.fullName || '',
                email: user.email || userProfile?.email || '',
                rollNumber: studentData?.rollNumber || userProfile?.rollNumber || '',
                branch: studentData?.branch || userProfile?.branch || '',
                cgpa: studentData?.cgpa || '',
                skills: studentData?.skills || [],
                aboutMe: studentData?.aboutMe || '',
                projects: studentData?.projects || [],
                achievements: studentData?.achievements || [],
            };
            setProfileForResume(profileForGen);
        } catch (error) {
            console.error('Error fetching resume:', error);
        } finally {
            setLoading(false);
        }
    }, [user, userProfile]);

    useEffect(() => {
        fetchResumeData();
    }, [fetchResumeData]);

    const validateProfileContent = (data) => {
        const hasContent = data?.fullName && (
            data.skills?.length > 0 ||
            data.projects?.length > 0 ||
            data.aboutMe
        );
        return hasContent;
    };

    const handleGenerateResume = async () => {
        if (!resumeTemplateRef.current) return;

        if (resumeData?.url) {
            toast.error('Delete your existing resume first before generating a new one.');
            return;
        }

        if (!validateProfileContent(profileForResume)) {
            toast.error('Please complete your profile first (name, skills, projects, or about me).');
            return;
        }

        setGenerating(true);
        try {
            const result = await generateAndUploadResume(
                resumeTemplateRef.current,
                user.uid,
                profileForResume.fullName,
                (progress) => setUploadProgress(progress),
            );

            setResumeData(result);
            await refreshUserProfile();
            toast.success('Resume generated and uploaded successfully!');
        } catch (error) {
            console.error('Resume generation error:', error);
            toast.error(error.message || 'Failed to generate resume');
        } finally {
            setGenerating(false);
            setUploadProgress(0);
        }
    };

    const openEditModal = () => {
        setEditFormData({ ...profileForResume });
        setEditSkillInput('');
        setEditProjectInput({ title: '', description: '', link: '' });
        setEditAchievementInput({ title: '', description: '', date: '' });
        setShowEditModal(true);
    };

    const handleEditFormChange = (field, value) => {
        setEditFormData(prev => ({ ...prev, [field]: value }));
    };

    const addEditSkill = () => {
        const skill = editSkillInput.trim();
        if (!skill) return;
        if (editFormData.skills.includes(skill)) { toast.error('Skill already added'); return; }
        setEditFormData(prev => ({ ...prev, skills: [...prev.skills, skill] }));
        setEditSkillInput('');
    };

    const removeEditSkill = (s) => {
        setEditFormData(prev => ({ ...prev, skills: prev.skills.filter(sk => sk !== s) }));
    };

    const addEditProject = () => {
        if (!editProjectInput.title.trim()) { toast.error('Project title is required'); return; }
        setEditFormData(prev => ({ ...prev, projects: [...prev.projects, { ...editProjectInput, id: Date.now() }] }));
        setEditProjectInput({ title: '', description: '', link: '' });
    };

    const removeEditProject = (id) => {
        setEditFormData(prev => ({ ...prev, projects: prev.projects.filter(p => (p.id || p.title) !== id) }));
    };

    const addEditAchievement = () => {
        if (!editAchievementInput.title.trim()) { toast.error('Achievement title is required'); return; }
        setEditFormData(prev => ({ ...prev, achievements: [...prev.achievements, { ...editAchievementInput, id: Date.now() }] }));
        setEditAchievementInput({ title: '', description: '', date: '' });
    };

    const removeEditAchievement = (id) => {
        setEditFormData(prev => ({ ...prev, achievements: prev.achievements.filter(a => (a.id || a.title) !== id) }));
    };

    const handleEditAndRegenerate = async () => {
        if (!validateProfileContent(editFormData)) {
            toast.error('Please add at least your name and some content (skills, projects, or about me).');
            return;
        }

        // Update profile data so the hidden template re-renders
        setProfileForResume({ ...editFormData });
        setShowEditModal(false);

        // Wait a tick for React to re-render the hidden template
        await new Promise(r => setTimeout(r, 100));

        if (!resumeTemplateRef.current) return;

        setGenerating(true);
        try {
            // Save updated fields to Firestore student doc
            await updateDoc(doc(db, COLLECTIONS.STUDENTS, user.uid), {
                skills: editFormData.skills,
                aboutMe: editFormData.aboutMe,
                projects: editFormData.projects,
                achievements: editFormData.achievements,
                cgpa: editFormData.cgpa || null,
                updatedAt: new Date().toISOString(),
            });

            const result = await generateAndUploadResume(
                resumeTemplateRef.current,
                user.uid,
                editFormData.fullName,
                (progress) => setUploadProgress(progress),
            );

            setResumeData(result);
            await refreshUserProfile();
            toast.success('Resume updated and regenerated successfully!');
        } catch (error) {
            console.error('Resume regeneration error:', error);
            toast.error(error.message || 'Failed to regenerate resume');
        } finally {
            setGenerating(false);
            setUploadProgress(0);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
        }
    };

    const handleFileUpload = async (file) => {
        if (resumeData?.url) {
            toast.error('Only one resume is allowed. Delete existing resume to upload a new one.');
            return;
        }

        // Validate file type
        if (!VALIDATION.ALLOWED_RESUME_TYPES.includes(file.type)) {
            toast.error('Please upload a PDF or DOC file');
            return;
        }

        // Validate file size
        if (file.size > VALIDATION.MAX_FILE_SIZE) {
            toast.error('File size must be less than 5MB');
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        try {
            // Analyze resume for score
            const analysis = await analyzeResumeFile(file);
            const score = analysis.score || 0;

            // Upload to Cloudinary
            const uploadedFile = await uploadResumeToCloudinary(file, user.uid, (progress) => {
                setUploadProgress(progress);
            });

            // Update student document with resume data
            await updateDoc(doc(db, COLLECTIONS.STUDENTS, user.uid), {
                resume: {
                    url: uploadedFile.url,
                    publicId: uploadedFile.publicId,
                    name: uploadedFile.name,
                    size: uploadedFile.size,
                    type: uploadedFile.type,
                    uploadedAt: new Date().toISOString(),
                },
                updatedAt: new Date().toISOString(),
            });

            setResumeData({
                url: uploadedFile.url,
                publicId: uploadedFile.publicId,
                name: uploadedFile.name,
                size: uploadedFile.size,
                type: uploadedFile.type,
                uploadedAt: new Date().toISOString(),
            });
            setResumeScore(score);

            await refreshUserProfile();

            toast.success('Resume uploaded successfully!');
        } catch (error) {
            console.error('Upload error:', error);
            toast.error(error.message || 'Failed to upload resume');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleDeleteResume = async () => {
        if (!window.confirm('Are you sure you want to delete this resume?')) {
            return;
        }

        try {
            // Remove resume reference from Firestore
            await updateDoc(doc(db, COLLECTIONS.STUDENTS, user.uid), {
                resume: null,
                updatedAt: new Date().toISOString(),
            });

            setResumeData(null);
            setResumeScore(0);

            await refreshUserProfile();
            toast.success('Resume deleted successfully');
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Failed to delete resume');
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getPublicIdFromUrl = (url) => {
        try {
            const parsedUrl = new URL(url);
            const uploadSegment = '/upload/';
            const uploadIndex = parsedUrl.pathname.indexOf(uploadSegment);
            if (uploadIndex === -1) return null;

            let afterUpload = parsedUrl.pathname.slice(uploadIndex + uploadSegment.length);
            afterUpload = afterUpload.replace(/^v\d+\//, '');

            return afterUpload.replace(/\.[^/.]+$/, '');
        } catch {
            return null;
        }
    };

    const getCloudinaryPdfPreviewImageUrl = () => {
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
        const publicId = resumeData?.publicId || getPublicIdFromUrl(resumeData?.url || '');

        if (!cloudName || !publicId) {
            return null;
        }

        return `https://res.cloudinary.com/${cloudName}/image/upload/pg_1,f_auto,q_auto,w_1200/${publicId}.jpg`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="page-header">Resume Management</h1>
                <p className="text-gray-600">
                    Upload and manage your resume for job applications
                </p>
            </div>

            {!resumeData ? (
                /* Upload Section */
                <div className="card p-8">
                    <div
                        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all ${dragActive
                            ? 'border-primary-600 bg-primary-50'
                            : 'border-gray-300 hover:border-gray-400'
                            } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        {uploading ? (
                            <div className="space-y-4">
                                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto"></div>
                                <div>
                                    <p className="text-lg font-medium text-gray-900">
                                        Uploading Resume...
                                    </p>
                                    <div className="mt-4 max-w-xs mx-auto">
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${uploadProgress}%` }}
                                            ></div>
                                        </div>
                                        <p className="mt-2 text-sm text-gray-600">
                                            {Math.round(uploadProgress)}%
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <CloudArrowUpIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                                <div className="space-y-2">
                                    <p className="text-xl font-semibold text-gray-900">
                                        Drop your resume here
                                    </p>
                                    <p className="text-gray-600">
                                        or click to browse from your computer
                                    </p>
                                </div>
                                <input
                                    type="file"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    accept=".pdf,.doc,.docx"
                                    onChange={handleFileChange}
                                    disabled={uploading}
                                />
                                <div className="mt-6 flex items-center justify-center gap-4 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                        PDF, DOC, DOCX
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                        Max 5MB
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Info Section */}
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h3 className="font-semibold text-blue-900 mb-2">
                            💡 Tips for a great resume:
                        </h3>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>• Keep it concise (1-2 pages)</li>
                            <li>• Use a professional format</li>
                            <li>• Highlight relevant skills and experience</li>
                            <li>• Include your contact information</li>
                            <li>• Proofread for errors</li>
                        </ul>
                    </div>

                    {/* Resume Generator Section */}
                    <div className="mt-6 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-indigo-100 rounded-lg">
                                <SparklesIcon className="h-8 w-8 text-indigo-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                    Generate ATS-Friendly Resume
                                </h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    Don&apos;t have a resume? We&apos;ll generate a professional, ATS-optimized PDF resume
                                    from your profile data — including your skills, projects, achievements, and education.
                                </p>
                                <button
                                    onClick={handleGenerateResume}
                                    disabled={generating}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed font-medium text-sm"
                                >
                                    {generating ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <SparklesIcon className="h-5 w-5" />
                                            Generate Resume from Profile
                                        </>
                                    )}
                                </button>
                                {generating && uploadProgress > 0 && (
                                    <div className="mt-3 max-w-xs">
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${uploadProgress}%` }}
                                            />
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500">Uploading {Math.round(uploadProgress)}%</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Resume Display Section */
                <div className="space-y-6">
                    {/* Resume Score Card */}
                    {resumeScore > 0 && (
                        <div className="card p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Resume Score</h3>
                                    <p className="text-sm text-gray-600">Basic analysis of your resume</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-4xl font-bold text-primary-600">{resumeScore}</div>
                                    <div className="text-sm text-gray-500">out of 100</div>
                                </div>
                            </div>
                            <div className="mt-4">
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className="bg-primary-600 h-3 rounded-full transition-all duration-500"
                                        style={{ width: `${resumeScore}%` }}
                                    />
                                </div>
                            </div>
                            <div className="mt-3 text-sm text-gray-600">
                                {resumeScore >= 80 && '🎉 Excellent resume!'}
                                {resumeScore >= 60 && resumeScore < 80 && '👍 Good resume, minor improvements possible'}
                                {resumeScore >= 40 && resumeScore < 60 && '📝 Fair resume, consider adding more details'}
                                {resumeScore < 40 && '💡 Resume needs improvement'}
                            </div>
                        </div>
                    )}

                    <div className="card p-6">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-primary-100 rounded-lg">
                                    <DocumentTextIcon className="h-8 w-8 text-primary-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                        {resumeData.name}
                                    </h3>
                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                        <span>{formatFileSize(resumeData.size)}</span>
                                        <span>•</span>
                                        <span>
                                            Uploaded on {formatDate(resumeData.uploadedAt)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                {resumeData.generatedFromProfile && (
                                    <button
                                        onClick={openEditModal}
                                        disabled={generating}
                                        className="btn-outline btn-sm flex items-center gap-2 border-indigo-300 text-indigo-600 hover:bg-indigo-50"
                                    >
                                        <PencilSquareIcon className="h-4 w-4" />
                                        Edit & Regenerate
                                    </button>
                                )}
                                {resumeData.type === 'application/pdf' && (
                                    <button
                                        onClick={() => setShowPreview(true)}
                                        className="btn-outline btn-sm flex items-center gap-2"
                                    >
                                        <EyeIcon className="h-4 w-4" />
                                        Preview
                                    </button>
                                )}
                                <a
                                    href={resumeData.url}
                                    download={resumeData.name}
                                    className="btn-primary btn-sm flex items-center gap-2"
                                >
                                    <ArrowDownTrayIcon className="h-4 w-4" />
                                    Download
                                </a>
                                <button
                                    onClick={handleDeleteResume}
                                    className="btn-error btn-sm flex items-center gap-2"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="card p-6">
                        <p className="text-sm text-gray-600">
                            {resumeData.generatedFromProfile
                                ? 'This resume was generated from your profile. Click "Edit & Regenerate" to update it.'
                                : 'Only one resume is allowed. Delete the current resume to upload a new one.'}
                        </p>
                    </div>

                    {/* Generating overlay */}
                    {generating && (
                        <div className="card p-6 border-indigo-200 bg-indigo-50">
                            <div className="flex items-center gap-3">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600" />
                                <span className="text-sm font-medium text-indigo-700">Regenerating resume...</span>
                            </div>
                            {uploadProgress > 0 && (
                                <div className="mt-3 max-w-xs">
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Preview Modal */}
            {showPreview && resumeData?.type === 'application/pdf' && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="text-lg font-semibold">Resume Preview</h3>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            {getCloudinaryPdfPreviewImageUrl() ? (
                                <div className="h-full overflow-auto bg-gray-100 p-4">
                                    <img
                                        src={getCloudinaryPdfPreviewImageUrl()}
                                        alt="Resume preview page 1"
                                        className="mx-auto max-w-full h-auto rounded-lg shadow-medium"
                                    />
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center p-6">
                                    <p className="text-gray-700">Preview unavailable for this file. Use “Open original PDF”.</p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end">
                            <a
                                href={resumeData.url}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-outline btn-sm"
                            >
                                Open original PDF
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Resume Modal */}
            {showEditModal && editFormData && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between p-5 border-b">
                            <h3 className="text-lg font-semibold">Edit Resume Content</h3>
                            <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 space-y-5">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input type="text" value={editFormData.fullName} onChange={e => handleEditFormChange('fullName', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input type="email" value={editFormData.email} disabled className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                                    <input type="text" value={editFormData.branch} onChange={e => handleEditFormChange('branch', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">CGPA</label>
                                    <input type="number" step="0.01" min="0" max="10" value={editFormData.cgpa} onChange={e => handleEditFormChange('cgpa', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                                </div>
                            </div>

                            {/* About Me */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Professional Summary</label>
                                <textarea rows={3} value={editFormData.aboutMe} onChange={e => handleEditFormChange('aboutMe', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                            </div>

                            {/* Skills */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
                                <div className="flex gap-2 mb-2">
                                    <input type="text" value={editSkillInput} onChange={e => setEditSkillInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addEditSkill())} placeholder="Add a skill" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                                    <button type="button" onClick={addEditSkill} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">Add</button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {editFormData.skills.map((skill, i) => (
                                        <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                                            {skill}
                                            <button type="button" onClick={() => removeEditSkill(skill)} className="hover:text-red-500">
                                                <XMarkIcon className="h-3.5 w-3.5" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Projects */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Projects</label>
                                {editFormData.projects.map((proj, i) => (
                                    <div key={proj.id || i} className="flex items-start justify-between bg-gray-50 rounded-lg p-3 mb-2">
                                        <div>
                                            <p className="font-medium text-sm">{proj.title}</p>
                                            {proj.description && <p className="text-xs text-gray-500 mt-0.5">{proj.description}</p>}
                                        </div>
                                        <button type="button" onClick={() => removeEditProject(proj.id || proj.title)} className="text-red-400 hover:text-red-600 ml-2 flex-shrink-0">
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                                <div className="space-y-2 border border-gray-200 rounded-lg p-3">
                                    <input type="text" placeholder="Project title" value={editProjectInput.title} onChange={e => setEditProjectInput(p => ({ ...p, title: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                                    <input type="text" placeholder="Description" value={editProjectInput.description} onChange={e => setEditProjectInput(p => ({ ...p, description: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                                    <input type="text" placeholder="Link (optional)" value={editProjectInput.link} onChange={e => setEditProjectInput(p => ({ ...p, link: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                                    <button type="button" onClick={addEditProject} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">Add Project</button>
                                </div>
                            </div>

                            {/* Achievements */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Achievements</label>
                                {editFormData.achievements.map((ach, i) => (
                                    <div key={ach.id || i} className="flex items-start justify-between bg-gray-50 rounded-lg p-3 mb-2">
                                        <div>
                                            <p className="font-medium text-sm">{ach.title}</p>
                                            {ach.description && <p className="text-xs text-gray-500 mt-0.5">{ach.description}</p>}
                                        </div>
                                        <button type="button" onClick={() => removeEditAchievement(ach.id || ach.title)} className="text-red-400 hover:text-red-600 ml-2 flex-shrink-0">
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                                <div className="space-y-2 border border-gray-200 rounded-lg p-3">
                                    <input type="text" placeholder="Achievement title" value={editAchievementInput.title} onChange={e => setEditAchievementInput(a => ({ ...a, title: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                                    <input type="text" placeholder="Description" value={editAchievementInput.description} onChange={e => setEditAchievementInput(a => ({ ...a, description: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                                    <input type="date" value={editAchievementInput.date} onChange={e => setEditAchievementInput(a => ({ ...a, date: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                                    <button type="button" onClick={addEditAchievement} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">Add Achievement</button>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
                                Cancel
                            </button>
                            <button onClick={handleEditAndRegenerate} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                                <SparklesIcon className="h-4 w-4" />
                                Save & Regenerate
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden resume template for PDF generation */}
            <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                <ResumeTemplate ref={resumeTemplateRef} profileData={profileForResume} />
            </div>
        </div>
    );
};

export default Resume;
