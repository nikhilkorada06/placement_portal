import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@config/firebase';
import { COLLECTIONS } from '@config/constants';
import { uploadResumeToCloudinary } from '@services/cloudinaryService';
import toast from 'react-hot-toast';

const INDUSTRY_OPTIONS = [
    'Technology',
    'Finance & Banking',
    'Healthcare',
    'Education',
    'E-Commerce',
    'Manufacturing',
    'Consulting',
    'Media & Entertainment',
    'Automobile',
    'Telecommunications',
    'Real Estate',
    'Energy',
    'Logistics',
    'Other',
];

const COMPANY_SIZE_OPTIONS = [
    '1-10 employees',
    '11-50 employees',
    '51-200 employees',
    '201-500 employees',
    '501-1000 employees',
    '1001-5000 employees',
    '5000+ employees',
];

const RecruiterProfile = () => {
    const { user, userProfile, refreshUserProfile } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [isEditMode, setIsEditMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(true);
    const [logoUploading, setLogoUploading] = useState(false);
    const [profileData, setProfileData] = useState(null);
    const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

    const [formData, setFormData] = useState({
        companyName: '',
        designation: '',
        companyWebsite: '',
        companySize: '',
        industry: '',
        description: '',
        location: '',
        contactNumber: '',
        companyLogoUrl: '',
        linkedIn: '',
        founded: '',
        headquarters: '',
        benefits: '',
    });

    // Auto-enter edit mode if ?edit=true is in URL
    useEffect(() => {
        if (searchParams.get('edit') === 'true') {
            setIsEditMode(true);
            setSearchParams({}, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    // Fetch recruiter profile data
    useEffect(() => {
        const fetchProfile = async () => {
            if (!user?.uid) return;
            try {
                const docRef = doc(db, COLLECTIONS.RECRUITERS, user.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setProfileData(data);
                    setFormData({
                        companyName: data.companyName || userProfile?.companyName || '',
                        designation: data.designation || '',
                        companyWebsite: data.companyWebsite || '',
                        companySize: data.companySize || '',
                        industry: data.industry || '',
                        description: data.description || '',
                        location: data.location || '',
                        contactNumber: data.contactNumber || '',
                        companyLogoUrl: data.companyLogoUrl || '',
                        linkedIn: data.linkedIn || '',
                        founded: data.founded || '',
                        headquarters: data.headquarters || '',
                        benefits: data.benefits || '',
                    });
                } else {
                    setFormData((prev) => ({
                        ...prev,
                        companyName: userProfile?.companyName || '',
                        designation: userProfile?.designation || '',
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

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Logo must be less than 2MB');
            return;
        }

        setLogoUploading(true);
        try {
            const uploaded = await uploadResumeToCloudinary(file, user.uid);
            setFormData((prev) => ({ ...prev, companyLogoUrl: uploaded.url }));
            toast.success('Logo uploaded');
        } catch (err) {
            console.error('Logo upload error:', err);
            toast.error('Failed to upload logo');
        } finally {
            setLogoUploading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.companyName.trim()) {
            toast.error('Company name is required');
            return;
        }

        setLoading(true);
        try {
            const docRef = doc(db, COLLECTIONS.RECRUITERS, user.uid);
            await updateDoc(docRef, {
                ...formData,
                profileCompleted: true,
                updatedAt: new Date().toISOString(),
            });

            // Also update companyName in users collection
            const userRef = doc(db, COLLECTIONS.USERS, user.uid);
            await updateDoc(userRef, {
                companyName: formData.companyName,
                updatedAt: new Date().toISOString(),
            });

            setProfileData({ ...profileData, ...formData });
            setIsEditMode(false);
            if (refreshUserProfile) await refreshUserProfile();

            // Show success animation
            setShowSuccessAnimation(true);
            setTimeout(() => setShowSuccessAnimation(false), 3000);
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        if (profileData) {
            setFormData({
                companyName: profileData.companyName || '',
                designation: profileData.designation || '',
                companyWebsite: profileData.companyWebsite || '',
                companySize: profileData.companySize || '',
                industry: profileData.industry || '',
                description: profileData.description || '',
                location: profileData.location || '',
                contactNumber: profileData.contactNumber || '',
                companyLogoUrl: profileData.companyLogoUrl || '',
                linkedIn: profileData.linkedIn || '',
                founded: profileData.founded || '',
                headquarters: profileData.headquarters || '',
                benefits: profileData.benefits || '',
            });
        }
        setIsEditMode(false);
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

    // ─── SUCCESS ANIMATION OVERLAY ───────────────────────────
    if (showSuccessAnimation) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="bg-white rounded-3xl shadow-2xl p-10 flex flex-col items-center animate-[scaleIn_0.4s_ease-out]">
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
                    <p className="text-gray-500 mt-2 text-center">Your company profile has been updated successfully</p>
                </div>
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
        const hasLogo = formData.companyLogoUrl;
        const initial = (formData.companyName || 'C').charAt(0).toUpperCase();

        return (
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Hero Banner */}
                <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl overflow-hidden shadow-lg">
                    {/* Pattern overlay */}
                    <div className="absolute inset-0 opacity-10">
                        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#grid)" />
                        </svg>
                    </div>

                    <div className="relative px-8 py-10 flex flex-col sm:flex-row items-center gap-6">
                        {/* Logo / Avatar */}
                        <div className="flex-shrink-0">
                            {hasLogo ? (
                                <img
                                    src={formData.companyLogoUrl}
                                    alt={formData.companyName}
                                    className="w-24 h-24 rounded-full object-cover border-4 border-white/30 shadow-xl bg-white"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/30 flex items-center justify-center shadow-xl">
                                    <span className="text-4xl font-bold text-white">{initial}</span>
                                </div>
                            )}
                        </div>

                        {/* Name & Badge */}
                        <div className="flex-1 text-center sm:text-left">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                                    {formData.companyName || 'Company Name'}
                                </h1>
                                {profileData?.isVerified && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-green-400/20 text-green-100 border border-green-300/30 rounded-full backdrop-blur-sm">
                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Verified
                                    </span>
                                )}
                                {profileData && !profileData.isVerified && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-yellow-400/20 text-yellow-100 border border-yellow-300/30 rounded-full backdrop-blur-sm">
                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        Pending Verification
                                    </span>
                                )}
                            </div>
                            {formData.designation && (
                                <p className="mt-1 text-blue-100 text-sm">{formData.designation}</p>
                            )}
                            <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm text-blue-100">
                                {formData.industry && (
                                    <span className="flex items-center gap-1.5">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                        {formData.industry}
                                    </span>
                                )}
                                {formData.location && (
                                    <span className="flex items-center gap-1.5">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        {formData.location}
                                    </span>
                                )}
                                {formData.companySize && (
                                    <span className="flex items-center gap-1.5">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        {formData.companySize}
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
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <p className="text-xs text-gray-500">Industry</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">{formData.industry || '—'}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <p className="text-xs text-gray-500">Team Size</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">{formData.companySize || '—'}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <p className="text-xs text-gray-500">Founded</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">{formData.founded || '—'}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <p className="text-xs text-gray-500">Headquarters</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">{formData.headquarters || formData.location || '—'}</p>
                    </div>
                </div>

                {/* About Section */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            About the Company
                        </h2>
                    </div>
                    <div className="px-6 py-5">
                        {formData.description ? (
                            <p className="text-gray-700 leading-relaxed whitespace-pre-line">{formData.description}</p>
                        ) : (
                            <p className="text-gray-400 italic">No company description added yet. Click "Edit Profile" to add one.</p>
                        )}
                    </div>
                </div>

                {/* Contact & Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Contact Information */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Contact Information
                            </h2>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            <InfoRow
                                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                                label="Contact Person"
                                value={userProfile?.fullName}
                            />
                            <InfoRow
                                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                                label="Email"
                                value={userProfile?.email}
                                isLink={`mailto:${userProfile?.email}`}
                            />
                            <InfoRow
                                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
                                label="Phone"
                                value={formData.contactNumber}
                            />
                            <InfoRow
                                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>}
                                label="Website"
                                value={formData.companyWebsite}
                                isLink={formData.companyWebsite}
                            />
                            <InfoRow
                                icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>}
                                label="LinkedIn"
                                value={formData.linkedIn}
                                isLink={formData.linkedIn}
                            />
                        </div>
                    </div>

                    {/* Company Details */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Company Details
                            </h2>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            <InfoRow
                                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                                label="Industry"
                                value={formData.industry}
                            />
                            <InfoRow
                                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                                label="Company Size"
                                value={formData.companySize}
                            />
                            <InfoRow
                                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                                label="Location"
                                value={formData.location}
                            />
                            <InfoRow
                                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                                label="Designation"
                                value={formData.designation}
                            />
                            <InfoRow
                                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                                label="Founded"
                                value={formData.founded}
                            />
                        </div>
                    </div>
                </div>

                {/* Benefits / Perks */}
                {formData.benefits && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                                </svg>
                                Benefits &amp; Perks
                            </h2>
                        </div>
                        <div className="px-6 py-5">
                            <p className="text-gray-700 leading-relaxed whitespace-pre-line">{formData.benefits}</p>
                        </div>
                    </div>
                )}

                {/* Profile Completion Hint */}
                {(!formData.description || !formData.industry || !formData.companyWebsite || !formData.companyLogoUrl) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-amber-900">Complete your profile</h3>
                            <p className="text-sm text-amber-700 mt-1">
                                A complete profile helps attract better candidates. Add your{' '}
                                {[
                                    !formData.companyLogoUrl && 'company logo',
                                    !formData.description && 'company description',
                                    !formData.industry && 'industry',
                                    !formData.companyWebsite && 'website',
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
                    <h1 className="text-2xl font-bold text-gray-900">Edit Company Profile</h1>
                    <p className="text-gray-600 mt-1 text-sm">Update your company details to attract the right candidates</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleCancel}
                        disabled={loading}
                        className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
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

            {/* Logo Section */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">Company Logo</h2>
                <div className="flex items-center gap-6">
                    {formData.companyLogoUrl ? (
                        <img
                            src={formData.companyLogoUrl}
                            alt="Logo"
                            className="w-20 h-20 rounded-full object-cover border border-gray-200"
                        />
                    ) : (
                        <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                    )}
                    <div>
                        <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                            {logoUploading ? (
                                <>
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    Upload Logo
                                </>
                            )}
                            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        </label>
                        {formData.companyLogoUrl && (
                            <button
                                type="button"
                                onClick={() => setFormData((prev) => ({ ...prev, companyLogoUrl: '' }))}
                                className="ml-3 text-sm text-red-600 hover:text-red-700"
                            >
                                Remove
                            </button>
                        )}
                        <p className="text-xs text-gray-500 mt-2">JPG, PNG or SVG. Max 2MB.</p>
                    </div>
                </div>
            </div>

            {/* Basic Info */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-base font-semibold text-gray-900">Basic Information</h2>
                </div>
                <div className="p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <EditField label="Company Name" name="companyName" value={formData.companyName} onChange={handleInputChange} required placeholder="e.g., Google" />
                        <EditField label="Your Designation" name="designation" value={formData.designation} onChange={handleInputChange} placeholder="e.g., HR Manager" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <EditSelect label="Industry" name="industry" value={formData.industry} onChange={handleInputChange} options={INDUSTRY_OPTIONS} />
                        <EditSelect label="Company Size" name="companySize" value={formData.companySize} onChange={handleInputChange} options={COMPANY_SIZE_OPTIONS} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <EditField label="Founded Year" name="founded" value={formData.founded} onChange={handleInputChange} placeholder="e.g., 2010" />
                        <EditField label="Headquarters" name="headquarters" value={formData.headquarters} onChange={handleInputChange} placeholder="e.g., Bangalore, India" />
                    </div>
                </div>
            </div>

            {/* Contact Info */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-base font-semibold text-gray-900">Contact &amp; Links</h2>
                </div>
                <div className="p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <EditField label="Location" name="location" value={formData.location} onChange={handleInputChange} placeholder="e.g., Mumbai, India" />
                        <EditField label="Contact Number" name="contactNumber" value={formData.contactNumber} onChange={handleInputChange} placeholder="e.g., +91 9876543210" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <EditField label="Company Website" name="companyWebsite" value={formData.companyWebsite} onChange={handleInputChange} placeholder="https://www.example.com" />
                        <EditField label="LinkedIn URL" name="linkedIn" value={formData.linkedIn} onChange={handleInputChange} placeholder="https://linkedin.com/company/..." />
                    </div>
                </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-base font-semibold text-gray-900">About the Company</h2>
                </div>
                <div className="p-6 space-y-5">
                    <EditTextarea label="Company Description" name="description" value={formData.description} onChange={handleInputChange} placeholder="Tell candidates what makes your company great..." rows={5} />
                    <EditTextarea label="Benefits & Perks" name="benefits" value={formData.benefits} onChange={handleInputChange} placeholder="e.g., Health insurance, flexible hours, remote work, learning budget..." rows={3} />
                </div>
            </div>

            {/* Bottom Save Bar */}
            <div className="flex items-center justify-end gap-3 pb-6">
                <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
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
        </div>
    );
};

// ─── Reusable Sub-components ──────────────────────────────

const InfoRow = ({ icon, label, value, isLink }) => (
    <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 mt-0.5">
            {icon}
        </div>
        <div className="min-w-0">
            <p className="text-xs text-gray-500">{label}</p>
            {value ? (
                isLink ? (
                    <a href={isLink} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:text-blue-700 truncate block">
                        {value}
                    </a>
                ) : (
                    <p className="text-sm font-medium text-gray-900">{value}</p>
                )
            ) : (
                <p className="text-sm text-gray-400 italic">Not provided</p>
            )}
        </div>
    </div>
);

const EditField = ({ label, name, value, onChange, required, placeholder, type = 'text' }) => (
    <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
        />
    </div>
);

const EditSelect = ({ label, name, value, onChange, options }) => (
    <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <select
            name={name}
            value={value}
            onChange={onChange}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
        >
            <option value="">Select {label}</option>
            {options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
            ))}
        </select>
    </div>
);

const EditTextarea = ({ label, name, value, onChange, placeholder, rows = 4 }) => (
    <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <textarea
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white resize-none"
        />
    </div>
);

export default RecruiterProfile;
