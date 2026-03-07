import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@config/firebase';
import { uploadResumeToCloudinary } from '@services/cloudinaryService';
import { BRANCHES } from '@config/constants';
import toast from 'react-hot-toast';

const StudentProfile = () => {
    const { user, userProfile, refreshUserProfile } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [isEditMode, setIsEditMode] = useState(false);
    const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
    const [loading, setLoading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileData, setProfileData] = useState(null);
    const [skillInput, setSkillInput] = useState('');
    const [profilePhoto, setProfilePhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [showPhotoAdjust, setShowPhotoAdjust] = useState(false);
    const [photoZoom, setPhotoZoom] = useState(1);
    const [photoPosition, setPhotoPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const [formData, setFormData] = useState({
        fullName: '',
        rollNumber: '',
        branch: '',
        cgpa: '',
        skills: [],
        profilePhoto: '', // URL of profile photo
        aboutMe: '',
        projects: [],
        achievements: [],
    });

    const [projectInput, setProjectInput] = useState({ title: '', description: '', link: '' });
    const [achievementInput, setAchievementInput] = useState({ title: '', description: '', date: '' });

    // Auto-enter edit mode if ?edit=true is in URL
    useEffect(() => {
        if (searchParams.get('edit') === 'true') {
            setIsEditMode(true);
            // Clean up the URL param so it doesn't persist
            setSearchParams({}, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    // Fetch student profile data
    useEffect(() => {
        const fetchProfile = async () => {
            if (!user?.uid) return;
            try {
                const docRef = doc(db, 'students', user.uid);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setProfileData(data);
                    setFormData({
                        fullName: userProfile?.fullName || '',
                        rollNumber: data.rollNumber || '',
                        branch: data.branch || '',
                        cgpa: data.cgpa || '',
                        skills: data.skills || [],
                        profilePhoto: data.profilePhoto || '',
                        aboutMe: data.aboutMe || '',
                        projects: data.projects || [],
                        achievements: data.achievements || [],
                    });
                    if (data.profilePhoto) {
                        setPhotoPreview(data.profilePhoto);
                    }
                } else {
                    // First time - set basic info from userProfile
                    setFormData(prev => ({
                        ...prev,
                        fullName: userProfile?.fullName || '',
                        rollNumber: userProfile?.rollNumber || '',
                        branch: userProfile?.branch || '',
                    }));
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
                toast.error('Failed to load profile');
            } finally {
                setProfileLoading(false);
            }
        };

        fetchProfile();
    }, [user, userProfile]);

    // Handle input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    // Handle profile photo selection
    const handlePhotoSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('File size must be less than 5MB');
                return;
            }
            setProfilePhoto(file);
            const reader = new FileReader();
            reader.onload = (event) => {
                setPhotoPreview(event.target.result);
                setShowPhotoAdjust(true);
                setPhotoZoom(1);
                setPhotoPosition({ x: 0, y: 0 });
            };
            reader.readAsDataURL(file);
        }
    };

    // Handle photo drag
    const handlePhotoDragStart = (e) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - photoPosition.x, y: e.clientY - photoPosition.y });
    };

    const handlePhotoDragMove = (e) => {
        if (!isDragging) return;
        if (e.buttons !== 1) {
            setIsDragging(false);
            return;
        }
        setPhotoPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y,
        });
    };

    const handlePhotoDragEnd = () => {
        setIsDragging(false);
    };

    // Handle photo zoom
    const handlePhotoZoom = (e) => {
        setPhotoZoom(parseFloat(e.target.value));
    };

    // Apply photo adjustment and close modal
    const applyPhotoAdjustment = () => {
        setShowPhotoAdjust(false);
    };

    // Cancel photo adjustment
    const cancelPhotoAdjustment = () => {
        setProfilePhoto(null);
        setPhotoPreview(null);
        setShowPhotoAdjust(false);
        setPhotoZoom(1);
        setPhotoPosition({ x: 0, y: 0 });
    };

    // Add skill
    const addSkill = () => {
        if (skillInput.trim() === '') {
            toast.error('Skill cannot be empty');
            return;
        }
        if (formData.skills.includes(skillInput.trim())) {
            toast.error('Skill already added');
            return;
        }
        setFormData(prev => ({
            ...prev,
            skills: [...prev.skills, skillInput.trim()],
        }));
        setSkillInput('');
    };

    // Remove skill
    const removeSkill = (skillToRemove) => {
        setFormData(prev => ({
            ...prev,
            skills: prev.skills.filter(skill => skill !== skillToRemove),
        }));
    };

    // Add project
    const addProject = () => {
        if (!projectInput.title.trim()) {
            toast.error('Project title is required');
            return;
        }
        setFormData(prev => ({
            ...prev,
            projects: [...prev.projects, { ...projectInput, id: Date.now() }],
        }));
        setProjectInput({ title: '', description: '', link: '' });
    };

    // Remove project
    const removeProject = (projectId) => {
        setFormData(prev => ({
            ...prev,
            projects: prev.projects.filter(p => p.id !== projectId),
        }));
    };

    // Add achievement
    const addAchievement = () => {
        if (!achievementInput.title.trim()) {
            toast.error('Achievement title is required');
            return;
        }
        setFormData(prev => ({
            ...prev,
            achievements: [...prev.achievements, { ...achievementInput, id: Date.now() }],
        }));
        setAchievementInput({ title: '', description: '', date: '' });
    };

    // Remove achievement
    const removeAchievement = (achievementId) => {
        setFormData(prev => ({
            ...prev,
            achievements: prev.achievements.filter(a => a.id !== achievementId),
        }));
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        
        if (!formData.fullName || !formData.rollNumber || !formData.branch) {
            toast.error('Please fill in all required fields');
            return;
        }

        if (formData.cgpa && (isNaN(formData.cgpa) || formData.cgpa < 0 || formData.cgpa > 10)) {
            toast.error('CGPA must be between 0 and 10');
            return;
        }

        setLoading(true);
        try {
            let photoUrl = formData.profilePhoto;

            // Upload profile photo to Cloudinary if selected
            if (profilePhoto) {
                const uploadedFile = await uploadResumeToCloudinary(profilePhoto, user.uid);
                photoUrl = uploadedFile.url;
            }

            // Update Firestore
            const studentRef = doc(db, 'students', user.uid);
            await updateDoc(studentRef, {
                fullName: formData.fullName,
                rollNumber: formData.rollNumber,
                branch: formData.branch,
                cgpa: formData.cgpa || null,
                skills: formData.skills,
                profilePhoto: photoUrl,
                aboutMe: formData.aboutMe,
                projects: formData.projects,
                achievements: formData.achievements,
                profileCompleted: true,
                updatedAt: new Date(),
            });

            setFormData(prev => ({
                ...prev,
                profilePhoto: photoUrl,
            }));
            setPhotoPreview(photoUrl);
            setProfilePhoto(null);
            setIsEditMode(false);

            // Show success animation
            setShowSuccessAnimation(true);
            setTimeout(() => setShowSuccessAnimation(false), 3000);

            // Refresh the auth profile so profileCompleted is updated
            if (refreshUserProfile) await refreshUserProfile();
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    if (profileLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading profile...</p>
                </div>
            </div>
        );
    }

    const initial = (formData.fullName || 'S').charAt(0).toUpperCase();
    const profileCompletion =
        (formData.aboutMe ? 20 : 0) +
        (formData.profilePhoto ? 20 : 0) +
        (formData.skills.length > 0 ? 20 : 0) +
        (formData.projects.length > 0 ? 20 : 0) +
        (formData.achievements.length > 0 ? 20 : 0);

    // ─── SUCCESS ANIMATION OVERLAY ───────────────────────────
    if (showSuccessAnimation) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="bg-white rounded-3xl shadow-2xl p-10 flex flex-col items-center animate-[scaleIn_0.4s_ease-out]">
                    {/* Animated tick circle */}
                    <div className="relative w-24 h-24 mb-5">
                        <svg viewBox="0 0 96 96" className="w-full h-full">
                            <circle
                                cx="48" cy="48" r="44"
                                fill="none" stroke="#22c55e" strokeWidth="4"
                                strokeDasharray="276.5" strokeDashoffset="276.5"
                                className="animate-[circleIn_0.6s_ease-out_forwards]"
                            />
                            <path
                                d="M28 50 L42 64 L68 34"
                                fill="none" stroke="#22c55e" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"
                                strokeDasharray="60" strokeDashoffset="60"
                                className="animate-[checkIn_0.4s_ease-out_0.5s_forwards]"
                            />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">Profile Completed!</h3>
                    <p className="text-gray-500 mt-2 text-center">Your profile has been updated successfully</p>
                </div>

                {/* Keyframes injected via style tag */}
                <style>{`
                    @keyframes scaleIn {
                        0% { transform: scale(0.7); opacity: 0; }
                        100% { transform: scale(1); opacity: 1; }
                    }
                    @keyframes circleIn {
                        to { stroke-dashoffset: 0; }
                    }
                    @keyframes checkIn {
                        to { stroke-dashoffset: 0; }
                    }
                `}</style>
            </div>
        );
    }

    // ─── VIEW MODE ─────────────────────────────────────────────
    if (!isEditMode) {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Hero Banner */}
                <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl overflow-hidden shadow-lg">
                    {/* Pattern overlay */}
                    <div className="absolute inset-0 opacity-10">
                        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <pattern id="studentGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#studentGrid)" />
                        </svg>
                    </div>

                    <div className="relative px-8 py-10 flex flex-col sm:flex-row items-center gap-6">
                        {/* Profile Photo */}
                        <div className="flex-shrink-0">
                            {formData.profilePhoto ? (
                                <img
                                    src={formData.profilePhoto}
                                    alt={formData.fullName}
                                    className="w-24 h-24 rounded-full object-cover border-4 border-white/30 shadow-xl bg-white"
                                    style={{
                                        transform: `scale(${photoZoom}) translate(${photoPosition.x / 40}px, ${photoPosition.y / 40}px)`,
                                    }}
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/30 flex items-center justify-center shadow-xl">
                                    <span className="text-4xl font-bold text-white">{initial}</span>
                                </div>
                            )}
                        </div>

                        {/* Name & Info */}
                        <div className="flex-1 text-center sm:text-left">
                            <h1 className="text-2xl sm:text-3xl font-bold text-white">
                                {formData.fullName || 'Student Name'}
                            </h1>
                            {formData.branch && (
                                <p className="mt-1 text-blue-100 text-sm">{formData.branch}</p>
                            )}
                            <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-sm text-blue-100">
                                {formData.rollNumber && (
                                    <span className="flex items-center gap-1.5">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        {formData.rollNumber}
                                    </span>
                                )}
                                {(userProfile?.email || user?.email) && (
                                    <span className="flex items-center gap-1.5">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        {userProfile?.email || user?.email}
                                    </span>
                                )}
                                {formData.cgpa && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-green-400/20 text-green-100 border border-green-300/30 rounded-full backdrop-blur-sm">
                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        {formData.cgpa}/10 CGPA
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Edit Button */}
                        <button
                            onClick={() => setIsEditMode(true)}
                            className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white rounded-xl border border-white/20 transition-all text-sm font-medium"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit Profile
                        </button>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </div>
                        <p className="text-xs text-gray-500">Skills</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">{formData.skills.length}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                        </div>
                        <p className="text-xs text-gray-500">Projects</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">{formData.projects.length}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                        </div>
                        <p className="text-xs text-gray-500">Achievements</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">{formData.achievements.length}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                        </div>
                        <p className="text-xs text-gray-500">CGPA</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">{formData.cgpa || '—'}</p>
                    </div>
                </div>

                {/* About Section */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            About Me
                        </h2>
                    </div>
                    <div className="px-6 py-5">
                        {formData.aboutMe ? (
                            <p className="text-gray-700 leading-relaxed whitespace-pre-line">{formData.aboutMe}</p>
                        ) : (
                            <p className="text-gray-400 italic">No about information added yet. Click "Edit Profile" to add one.</p>
                        )}
                    </div>
                </div>

                {/* Skills Section */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            Skills
                        </h2>
                    </div>
                    <div className="px-6 py-5">
                        {formData.skills.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {formData.skills.map((skill, index) => (
                                    <span
                                        key={skill}
                                        className={`inline-block px-4 py-2 rounded-lg text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-200 cursor-default ${
                                            index % 5 === 0 ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                                            index % 5 === 1 ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' :
                                            index % 5 === 2 ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                                            index % 5 === 3 ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' :
                                            'bg-pink-100 text-pink-700 hover:bg-pink-200'
                                        }`}
                                    >
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-400 italic">No skills added yet.</p>
                        )}
                    </div>
                </div>

                {/* Projects & Achievements side by side on large screens */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Projects */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>
                                Projects
                            </h2>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            {formData.projects.length > 0 ? (
                                formData.projects.map((project) => (
                                    <div key={project.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                                        <h3 className="font-semibold text-gray-900 text-sm">{project.title}</h3>
                                        {project.description && (
                                            <p className="text-gray-600 text-sm mt-1 leading-relaxed">{project.description}</p>
                                        )}
                                        {project.link && (
                                            <a href={project.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 text-sm font-medium inline-flex items-center gap-1 mt-1">
                                                View Project
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                            </a>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-400 italic">No projects added yet.</p>
                            )}
                        </div>
                    </div>

                    {/* Achievements */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                                Achievements
                            </h2>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            {formData.achievements.length > 0 ? (
                                formData.achievements.map((achievement) => (
                                    <div key={achievement.id} className="flex gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center text-sm">
                                            🏆
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-gray-900 text-sm">{achievement.title}</h3>
                                            {achievement.date && (
                                                <p className="text-xs text-gray-500">{achievement.date}</p>
                                            )}
                                            {achievement.description && (
                                                <p className="text-gray-600 text-sm mt-1 leading-relaxed">{achievement.description}</p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-400 italic">No achievements added yet.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Profile Completion Hint */}
                {profileCompletion < 100 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-semibold text-amber-900">Complete your profile</h3>
                                <span className="text-sm font-bold text-amber-700">{profileCompletion}%</span>
                            </div>
                            <div className="w-full bg-amber-200 rounded-full h-1.5 mb-2">
                                <div className="bg-amber-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${profileCompletion}%` }}></div>
                            </div>
                            <p className="text-sm text-amber-700">
                                A complete profile increases visibility to recruiters. Add your{' '}
                                {[
                                    !formData.profilePhoto && 'profile photo',
                                    !formData.aboutMe && 'about section',
                                    formData.skills.length === 0 && 'skills',
                                    formData.projects.length === 0 && 'projects',
                                    formData.achievements.length === 0 && 'achievements',
                                ]
                                    .filter(Boolean)
                                    .join(', ')}{' '}
                                to stand out.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ─── EDIT MODE ─────────────────────────────────────────────
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
                    <p className="text-gray-600 mt-1 text-sm">Update your profile information to stand out to recruiters</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setIsEditMode(false)}
                        disabled={loading}
                        className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading && (
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        )}
                        Save Changes
                    </button>
                </div>
            </div>

            {/* Profile Photo */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">Profile Photo</h2>
                <div className="flex items-center gap-6">
                    {photoPreview ? (
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full overflow-hidden border border-gray-200 bg-gray-100">
                                <img
                                    src={photoPreview}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                    style={{
                                        transform: `scale(${photoZoom}) translate(${photoPosition.x / 40}px, ${photoPosition.y / 40}px)`,
                                    }}
                                />
                            </div>
                            {profilePhoto && (
                                <button
                                    type="button"
                                    onClick={() => setShowPhotoAdjust(true)}
                                    className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-full p-1.5 hover:bg-blue-700 transition shadow-lg"
                                    title="Adjust photo"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                    )}
                    <div>
                        <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            Upload Photo
                            <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" disabled={loading} />
                        </label>
                        {formData.profilePhoto && (
                            <button
                                type="button"
                                onClick={() => {
                                    setFormData(prev => ({ ...prev, profilePhoto: '' }));
                                    setPhotoPreview(null);
                                    setProfilePhoto(null);
                                }}
                                className="ml-3 text-sm text-red-600 hover:text-red-700"
                            >
                                Remove
                            </button>
                        )}
                        <p className="text-xs text-gray-500 mt-2">JPG, PNG or GIF. Max 5MB.</p>
                    </div>
                </div>
            </div>

            {/* Basic Information */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-base font-semibold text-gray-900">Basic Information</h2>
                </div>
                <div className="p-6 space-y-5">
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">Full Name <span className="text-red-500">*</span></label>
                        <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} disabled={loading} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-700">Roll Number <span className="text-red-500">*</span></label>
                            <input type="text" name="rollNumber" value={formData.rollNumber} onChange={handleInputChange} disabled={loading} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-700">Branch <span className="text-red-500">*</span></label>
                            <select name="branch" value={formData.branch} onChange={handleInputChange} disabled={loading} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white">
                                <option value="">Select your branch</option>
                                {BRANCHES.map((b) => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">CGPA</label>
                        <input type="number" name="cgpa" min="0" max="10" step="0.01" value={formData.cgpa} onChange={handleInputChange} placeholder="e.g., 8.5" disabled={loading} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white" />
                        <p className="text-xs text-gray-500">Enter value between 0 and 10</p>
                    </div>
                </div>
            </div>

            {/* Skills */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-base font-semibold text-gray-900">Skills</h2>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={skillInput}
                            onChange={(e) => setSkillInput(e.target.value)}
                            onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                            placeholder="Add a skill (e.g., JavaScript, React...)"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                        />
                        <button type="button" onClick={addSkill} disabled={loading} className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                            Add
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {formData.skills.map((skill) => (
                            <span key={skill} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200">
                                {skill}
                                <button type="button" onClick={() => removeSkill(skill)} disabled={loading} className="text-blue-500 hover:text-blue-700 transition">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </span>
                        ))}
                    </div>
                    {formData.skills.length === 0 && (
                        <p className="text-gray-400 text-sm">No skills added yet. Add your first skill above!</p>
                    )}
                </div>
            </div>

            {/* About Me */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-base font-semibold text-gray-900">About Me</h2>
                </div>
                <div className="p-6">
                    <textarea
                        name="aboutMe"
                        value={formData.aboutMe}
                        onChange={handleInputChange}
                        placeholder="Write a brief introduction about yourself, your goals, interests..."
                        rows="5"
                        disabled={loading}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white resize-none"
                    />
                </div>
            </div>

            {/* Projects */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-base font-semibold text-gray-900">Projects</h2>
                </div>
                <div className="p-6 space-y-4">
                    <div className="space-y-3">
                        <input type="text" value={projectInput.title} onChange={(e) => setProjectInput(prev => ({ ...prev, title: e.target.value }))} placeholder="Project Title *" disabled={loading} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white" />
                        <textarea value={projectInput.description} onChange={(e) => setProjectInput(prev => ({ ...prev, description: e.target.value }))} placeholder="Project Description" rows="3" disabled={loading} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white resize-none" />
                        <input type="url" value={projectInput.link} onChange={(e) => setProjectInput(prev => ({ ...prev, link: e.target.value }))} placeholder="Project Link (optional)" disabled={loading} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white" />
                        <button type="button" onClick={addProject} disabled={loading} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                            Add Project
                        </button>
                    </div>
                    <div className="space-y-3">
                        {formData.projects.map((project) => (
                            <div key={project.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-semibold text-gray-900 text-sm">{project.title}</h3>
                                    <button type="button" onClick={() => removeProject(project.id)} disabled={loading} className="text-red-500 hover:text-red-700 p-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                                {project.description && <p className="text-gray-600 text-sm mt-1">{project.description}</p>}
                                {project.link && <a href={project.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm mt-1 inline-block">View Project &rarr;</a>}
                            </div>
                        ))}
                    </div>
                    {formData.projects.length === 0 && <p className="text-gray-400 text-sm">No projects added yet</p>}
                </div>
            </div>

            {/* Achievements */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-base font-semibold text-gray-900">Achievements</h2>
                </div>
                <div className="p-6 space-y-4">
                    <div className="space-y-3">
                        <input type="text" value={achievementInput.title} onChange={(e) => setAchievementInput(prev => ({ ...prev, title: e.target.value }))} placeholder="Achievement Title *" disabled={loading} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white" />
                        <textarea value={achievementInput.description} onChange={(e) => setAchievementInput(prev => ({ ...prev, description: e.target.value }))} placeholder="Achievement Description" rows="3" disabled={loading} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white resize-none" />
                        <input type="text" value={achievementInput.date} onChange={(e) => setAchievementInput(prev => ({ ...prev, date: e.target.value }))} placeholder="Date (e.g., Jan 2024)" disabled={loading} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white" />
                        <button type="button" onClick={addAchievement} disabled={loading} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                            Add Achievement
                        </button>
                    </div>
                    <div className="space-y-3">
                        {formData.achievements.map((achievement) => (
                            <div key={achievement.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 text-sm">{achievement.title}</h3>
                                        {achievement.date && <p className="text-xs text-gray-500">{achievement.date}</p>}
                                    </div>
                                    <button type="button" onClick={() => removeAchievement(achievement.id)} disabled={loading} className="text-red-500 hover:text-red-700 p-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                                {achievement.description && <p className="text-gray-600 text-sm mt-1">{achievement.description}</p>}
                            </div>
                        ))}
                    </div>
                    {formData.achievements.length === 0 && <p className="text-gray-400 text-sm">No achievements added yet</p>}
                </div>
            </div>

            {/* Bottom Save Bar */}
            <div className="flex items-center justify-end gap-3 pb-6">
                <button
                    type="button"
                    onClick={() => setIsEditMode(false)}
                    disabled={loading}
                    className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    {loading && (
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                    )}
                    Save Changes
                </button>
            </div>

            {/* Photo Adjustment Modal */}
            {showPhotoAdjust && photoPreview && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-lg font-bold text-gray-900">Adjust Photo</h2>
                            <p className="text-gray-500 text-sm mt-1">Position and zoom your profile picture</p>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="flex justify-center">
                                <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-gray-200 bg-gray-100 shadow-lg">
                                    <img
                                        src={photoPreview}
                                        alt="Preview"
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            transform: `scale(${photoZoom}) translate(${photoPosition.x}px, ${photoPosition.y}px)`,
                                            cursor: isDragging ? 'grabbing' : 'grab',
                                        }}
                                        onMouseDown={handlePhotoDragStart}
                                        onMouseMove={handlePhotoDragMove}
                                        onMouseUp={handlePhotoDragEnd}
                                        onMouseLeave={handlePhotoDragEnd}
                                        draggable={false}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Zoom: {Math.round(photoZoom * 100)}%
                                </label>
                                <input type="range" min="1" max="3" step="0.1" value={photoZoom} onChange={handlePhotoZoom} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                            </div>
                            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                <p className="font-medium text-blue-800">Tip: Drag the image to position, use slider to zoom.</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-200 p-4 flex gap-3 justify-end">
                            <button onClick={cancelPhotoAdjustment} className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                Cancel
                            </button>
                            <button onClick={applyPhotoAdjustment} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentProfile;
