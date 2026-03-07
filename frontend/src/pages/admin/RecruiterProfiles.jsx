import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '@config/firebase';
import {
    ArrowLeftIcon,
    BuildingOfficeIcon,
    UserGroupIcon,
    XMarkIcon,
    EnvelopeIcon,
    PhoneIcon,
    GlobeAltIcon,
    MapPinIcon,
    BriefcaseIcon,
    FunnelIcon,
    ArrowPathIcon,
    MagnifyingGlassIcon,
    CheckBadgeIcon,
    ClockIcon,
    ChevronDownIcon,
    CheckIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const RecruiterProfiles = () => {
    const [recruiters, setRecruiters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRecruiter, setSelectedRecruiter] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);
    const [selectedRecruiters, setSelectedRecruiters] = useState([]);
    const [bulkActionLoading, setBulkActionLoading] = useState(false);
    
    // Filters
    const [verificationFilter, setVerificationFilter] = useState('all'); // 'all', 'verified', 'unverified'
    const [industryFilter, setIndustryFilter] = useState([]);
    const [sortBy, setSortBy] = useState('newest');

    const SORT_OPTIONS = [
        { value: 'newest', label: 'Newest First' },
        { value: 'oldest', label: 'Oldest First' },
        { value: 'company-asc', label: 'Company (A-Z)' },
        { value: 'company-desc', label: 'Company (Z-A)' },
    ];

    const INDUSTRIES = [
        'Technology',
        'Finance',
        'Healthcare',
        'Education',
        'Manufacturing',
        'Retail',
        'Consulting',
        'Real Estate',
        'E-commerce',
        'Media',
        'Other',
    ];

    // Fetch recruiters
    useEffect(() => {
        const fetchRecruiters = async () => {
            try {
                const usersQuery = query(
                    collection(db, 'users'),
                    where('role', '==', 'recruiter')
                );
                const usersSnapshot = await getDocs(usersQuery);
                const usersMap = {};
                usersSnapshot.forEach((d) => {
                    usersMap[d.id] = { id: d.id, ...d.data() };
                });

                const recruitersSnapshot = await getDocs(collection(db, 'recruiters'));
                const list = [];
                recruitersSnapshot.forEach((d) => {
                    const rData = d.data();
                    const uData = usersMap[d.id];
                    if (uData) {
                        list.push({
                            id: d.id,
                            fullName: uData.fullName || 'Unknown',
                            email: uData.email || '',
                            companyName: rData.companyName || '',
                            designation: rData.designation || '',
                            companyWebsite: rData.companyWebsite || '',
                            companySize: rData.companySize || '',
                            industry: rData.industry || '',
                            companyLogoUrl: rData.companyLogoUrl || '',
                            description: rData.description || '',
                            location: rData.location || '',
                            contactNumber: rData.contactNumber || '',
                            isVerified: rData.isVerified || false,
                            isAdminVerified: uData.isAdminVerified ?? true,
                            createdAt: uData.createdAt || rData.createdAt || '',
                        });
                    }
                });

                // Sort newest first by default
                list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
                setRecruiters(list);
            } catch (error) {
                console.error('Error fetching recruiters:', error);
                toast.error('Failed to load recruiters');
            } finally {
                setLoading(false);
            }
        };
        fetchRecruiters();
    }, []);

    // Toggle industry filter
    const toggleIndustry = (industry) => {
        setIndustryFilter((prev) =>
            prev.includes(industry) ? prev.filter((i) => i !== industry) : [...prev, industry]
        );
    };

    // Clear all filters
    const clearFilters = () => {
        setSearchTerm('');
        setVerificationFilter('all');
        setIndustryFilter([]);
        setSortBy('newest');
    };

    // Verify recruiter
    const handleVerify = async (recruiterId, companyName) => {
        setActionLoading(recruiterId);
        try {
            await updateDoc(doc(db, 'users', recruiterId), {
                isAdminVerified: true,
                updatedAt: new Date().toISOString(),
            });
            setRecruiters((prev) =>
                prev.map((r) => (r.id === recruiterId ? { ...r, isAdminVerified: true } : r))
            );
            toast.success(`${companyName} has been verified`);
        } catch (error) {
            console.error('Error verifying recruiter:', error);
            toast.error('Failed to verify recruiter');
        } finally {
            setActionLoading(null);
        }
    };

    const handleBulkRevoke = async () => {
        if (selectedRecruiters.length === 0) return;
        
        const confirmedRecruiters = selectedRecruiters.filter(id => {
            const recruiter = recruiters.find(r => r.id === id);
            return recruiter?.isAdminVerified === true;
        });

        if (confirmedRecruiters.length === 0) {
            toast.error('No verified recruiters selected');
            return;
        }

        setBulkActionLoading(true);
        try {
            await Promise.all(
                confirmedRecruiters.map(recruiterId =>
                    updateDoc(doc(db, 'users', recruiterId), {
                        isAdminVerified: false,
                        updatedAt: new Date().toISOString(),
                    })
                )
            );
            setRecruiters((prev) =>
                prev.map((r) => 
                    confirmedRecruiters.includes(r.id) ? { ...r, isAdminVerified: false } : r
                )
            );
            toast.success(`Access revoked for ${confirmedRecruiters.length} recruiter(s)`);
            setSelectedRecruiters([]);
        } catch (error) {
            console.error('Error revoking access:', error);
            toast.error('Failed to revoke access');
        } finally {
            setBulkActionLoading(false);
        }
    };

    const toggleRecruiterSelection = (recruiterId) => {
        setSelectedRecruiters((prev) =>
            prev.includes(recruiterId)
                ? prev.filter((id) => id !== recruiterId)
                : [...prev, recruiterId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedRecruiters.length === filteredRecruiters.length) {
            setSelectedRecruiters([]);
        } else {
            setSelectedRecruiters(filteredRecruiters.map((r) => r.id));
        }
    };

    // Count active filters
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (verificationFilter !== 'all') count++;
        if (industryFilter.length > 0) count++;
        return count;
    }, [verificationFilter, industryFilter]);

    // Filtered and sorted recruiters
    const filteredRecruiters = useMemo(() => {
        let result = [...recruiters];

        // Search
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            result = result.filter(
                (r) =>
                    (r.fullName || '').toLowerCase().includes(term) ||
                    (r.companyName || '').toLowerCase().includes(term) ||
                    (r.email || '').toLowerCase().includes(term) ||
                    (r.designation || '').toLowerCase().includes(term) ||
                    (r.location || '').toLowerCase().includes(term)
            );
        }

        // Verification filter
        if (verificationFilter === 'verified') {
            result = result.filter((r) => r.isAdminVerified === true);
        } else if (verificationFilter === 'unverified') {
            result = result.filter((r) => r.isAdminVerified === false);
        }

        // Industry filter
        if (industryFilter.length > 0) {
            result = result.filter((r) => industryFilter.includes(r.industry));
        }

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case 'company-asc':
                    return (a.companyName || '').localeCompare(b.companyName || '');
                case 'company-desc':
                    return (b.companyName || '').localeCompare(a.companyName || '');
                case 'newest':
                    return (b.createdAt || '').localeCompare(a.createdAt || '');
                case 'oldest':
                    return (a.createdAt || '').localeCompare(b.createdAt || '');
                default:
                    return 0;
            }
        });

        return result;
    }, [recruiters, searchTerm, verificationFilter, industryFilter, sortBy]);

    const stats = useMemo(() => ({
        total: recruiters.length,
        verified: recruiters.filter((r) => r.isAdminVerified).length,
        pending: recruiters.filter((r) => !r.isAdminVerified).length,
    }), [recruiters]);

    const getInitial = (name) => (name || 'C').charAt(0).toUpperCase();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto" />
                    <p className="mt-4 text-gray-600">Loading recruiter profiles...</p>
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
                        to="/admin/recruiters"
                        className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <BuildingOfficeIcon className="w-7 h-7 text-purple-600" />
                            Recruiter Profiles
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Browse and filter all {stats.total} registered recruiters
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                            showFilters
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        <FunnelIcon className="w-4 h-4" />
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 text-xs font-bold rounded-full bg-purple-600 text-white">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                    {activeFilterCount > 0 && (
                        <button
                            onClick={clearFilters}
                            className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
                        >
                            <ArrowPathIcon className="w-4 h-4" />
                            Clear All
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Cards  */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-5 text-white shadow-lg shadow-purple-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-purple-100 text-xs font-medium uppercase tracking-wider">Total Recruiters</p>
                            <p className="text-3xl font-bold mt-1">{stats.total}</p>
                        </div>
                        <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <UserGroupIcon className="w-6 h-6" />
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-5 text-white shadow-lg shadow-emerald-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-emerald-100 text-xs font-medium uppercase tracking-wider">Verified</p>
                            <p className="text-3xl font-bold mt-1">{stats.verified}</p>
                        </div>
                        <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <CheckBadgeIcon className="w-6 h-6" />
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg shadow-orange-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-amber-100 text-xs font-medium uppercase tracking-wider">Pending</p>
                            <p className="text-3xl font-bold mt-1">{stats.pending}</p>
                        </div>
                        <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <ClockIcon className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search by company, name, email, location..."
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100 bg-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm animate-[fadeIn_0.2s_ease-out]">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FunnelIcon className="w-4 h-4 text-purple-600" />
                        Filter Options
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Verification Status */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Verification Status</label>
                            <div className="flex gap-2">
                                {[
                                    { value: 'all', label: 'All' },
                                    { value: 'verified', label: 'Verified' },
                                    { value: 'unverified', label: 'Unverified' },
                                ].map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setVerificationFilter(opt.value)}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                                            verificationFilter === opt.value
                                                ? 'bg-purple-100 text-purple-700 border-purple-300 shadow-sm'
                                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Industry */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Industry</label>
                            <div className="flex flex-wrap gap-1.5">
                                {INDUSTRIES.map((industry) => (
                                    <button
                                        key={industry}
                                        onClick={() => toggleIndustry(industry)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                                            industryFilter.includes(industry)
                                                ? 'bg-purple-100 text-purple-700 border-purple-300'
                                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                                        }`}
                                    >
                                        {industry}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sort */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Sort By</label>
                            <div className="relative w-60">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="w-full appearance-none px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100 bg-white pr-8"
                                >
                                    {SORT_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Results Count & Selection */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-500">
                        Showing <span className="font-semibold text-gray-900">{filteredRecruiters.length}</span> of{' '}
                        <span className="font-semibold text-gray-900">{recruiters.length}</span> recruiters
                    </p>
                    {filteredRecruiters.length > 0 && (
                        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedRecruiters.length === filteredRecruiters.length && filteredRecruiters.length > 0}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            />
                            Select All
                        </label>
                    )}
                </div>
                {selectedRecruiters.length > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                            {selectedRecruiters.length} selected
                        </span>
                        <button
                            onClick={handleBulkRevoke}
                            disabled={bulkActionLoading}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                            {bulkActionLoading ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                            ) : (
                                <XMarkIcon className="w-4 h-4" />
                            )}
                            Revoke Access
                        </button>
                    </div>
                )}
            </div>

            {/* Recruiter Cards Grid */}
            {filteredRecruiters.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BuildingOfficeIcon className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">No recruiters found</h3>
                    <p className="text-gray-500 text-sm">Try adjusting your filters or search terms</p>
                    {activeFilterCount > 0 && (
                        <button
                            onClick={clearFilters}
                            className="mt-4 px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                        >
                            Clear all filters
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredRecruiters.map((recruiter) => {
                        const initial = getInitial(recruiter.companyName || recruiter.fullName);

                        return (
                            <div
                                key={recruiter.id}
                                className={`group bg-white rounded-2xl border-2 transition-all duration-300 shadow-sm hover:shadow-lg overflow-hidden flex flex-col ${
                                    selectedRecruiters.includes(recruiter.id)
                                        ? 'border-purple-400 ring-2 ring-purple-200'
                                        : 'border-gray-100 hover:border-purple-200'
                                }`}
                            >
                                {/* Card Header */}
                                <div className="relative h-20 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500">
                                    <div className="absolute inset-0 opacity-20">
                                        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                                            <defs>
                                                <pattern id={`grid-${recruiter.id}`} width="20" height="20" patternUnits="userSpaceOnUse">
                                                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
                                                </pattern>
                                            </defs>
                                            <rect width="100%" height="100%" fill={`url(#grid-${recruiter.id})`} />
                                        </svg>
                                    </div>
                                    {/* Verification Badge */}
                                    <div className="absolute top-3 right-3">
                                        {recruiter.isAdminVerified ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-400/20 text-green-100 border border-green-300/30 backdrop-blur-sm">
                                                <CheckBadgeIcon className="w-3 h-3" />
                                                Verified
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-100 border border-amber-300/30 backdrop-blur-sm">
                                                <ClockIcon className="w-3 h-3" />
                                                Pending
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Company Logo */}
                                <div className="px-5 -mt-8 relative z-10">
                                    {recruiter.companyLogoUrl ? (
                                        <img
                                            src={recruiter.companyLogoUrl}
                                            alt={recruiter.companyName}
                                            className="w-16 h-16 rounded-xl object-cover border-3 border-white shadow-md bg-white"
                                        />
                                    ) : (
                                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 border-3 border-white shadow-md flex items-center justify-center">
                                            <span className="text-xl font-bold text-white">{initial}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Card Body */}
                                <div className="px-5 pt-3 pb-5 flex flex-col flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="text-base font-bold text-gray-900 truncate flex-1">{recruiter.companyName || 'Unknown Company'}</h3>
                                        <input
                                            type="checkbox"
                                            checked={selectedRecruiters.includes(recruiter.id)}
                                            onChange={() => toggleRecruiterSelection(recruiter.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer mt-0.5 flex-shrink-0"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5 truncate">{recruiter.fullName}</p>
                                    {recruiter.industry && (
                                        <span className="inline-block text-xs text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded-md mt-2">
                                            {recruiter.industry}
                                        </span>
                                    )}

                                    {/* Key Info */}
                                    <div className="mt-3 space-y-1.5">
                                        {recruiter.designation && (
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <BriefcaseIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                                <span className="truncate">{recruiter.designation}</span>
                                            </div>
                                        )}
                                        {recruiter.location && (
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                                <span className="truncate">{recruiter.location}</span>
                                            </div>
                                        )}
                                        {recruiter.email && (
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <EnvelopeIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                                <span className="truncate">{recruiter.email}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Spacer to push buttons to bottom */}
                                    <div className="flex-grow"></div>

                                    {/* View Profile Button */}
                                    <button
                                        onClick={() => setSelectedRecruiter(recruiter)}
                                        className="mt-4 w-full py-2 text-xs font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                                    >
                                        View Full Profile
                                    </button>

                                    {/* Verification Actions */}
                                    {recruiter.isAdminVerified === false && (
                                        <div className="mt-2">
                                            <button
                                                onClick={() => handleVerify(recruiter.id, recruiter.companyName)}
                                                disabled={actionLoading === recruiter.id}
                                                className="w-full py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all disabled:opacity-50 inline-flex items-center justify-center gap-1"
                                            >
                                                {actionLoading === recruiter.id ? (
                                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                                                ) : (
                                                    <CheckIcon className="w-3.5 h-3.5" />
                                                )}
                                                Approve
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Profile Modal */}
            {selectedRecruiter && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedRecruiter(null)}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden animate-[modalIn_0.25s_ease-out]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="relative h-28 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 flex-shrink-0">
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
                            <button
                                onClick={() => setSelectedRecruiter(null)}
                                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/15 backdrop-blur-sm hover:bg-white/30 flex items-center justify-center transition-colors"
                            >
                                <XMarkIcon className="w-5 h-5 text-white" />
                            </button>
                            <div className="absolute top-3 left-4">
                                {selectedRecruiter.isAdminVerified ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-400/20 text-green-100 border border-green-300/30 backdrop-blur-sm">
                                        <CheckBadgeIcon className="w-3.5 h-3.5" />
                                        Verified
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-amber-100 border border-amber-300/30 backdrop-blur-sm">
                                        <ClockIcon className="w-3.5 h-3.5" />
                                        Pending Verification
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Company Logo */}
                        <div className="px-6 -mt-10 relative z-10">
                            {selectedRecruiter.companyLogoUrl ? (
                                <img
                                    src={selectedRecruiter.companyLogoUrl}
                                    alt={selectedRecruiter.companyName}
                                    className="w-20 h-20 rounded-xl object-cover border-4 border-white shadow-lg bg-white"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 border-4 border-white shadow-lg flex items-center justify-center">
                                    <span className="text-2xl font-bold text-white">{getInitial(selectedRecruiter.companyName || selectedRecruiter.fullName)}</span>
                                </div>
                            )}
                        </div>

                        {/* Scrollable Content */}
                        <div className="px-6 pt-3 pb-6 overflow-y-auto max-h-[calc(85vh-10rem)]">
                            <h2 className="text-xl font-bold text-gray-900">{selectedRecruiter.companyName || 'Unknown Company'}</h2>
                            <p className="text-sm text-gray-600 mt-0.5">{selectedRecruiter.fullName}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                {selectedRecruiter.industry && (
                                    <span className="text-xs text-purple-600 font-medium bg-purple-50 px-2.5 py-0.5 rounded-md">
                                        {selectedRecruiter.industry}
                                    </span>
                                )}
                                {selectedRecruiter.companySize && (
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-md">
                                        {selectedRecruiter.companySize}
                                    </span>
                                )}
                            </div>

                            {/* Contact Info */}
                            <div className="mt-4 space-y-2">
                                {selectedRecruiter.designation && (
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <BriefcaseIcon className="w-3.5 h-3.5" />
                                        {selectedRecruiter.designation}
                                    </div>
                                )}
                                {selectedRecruiter.email && (
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <EnvelopeIcon className="w-3.5 h-3.5" />
                                        {selectedRecruiter.email}
                                    </div>
                                )}
                                {selectedRecruiter.contactNumber && (
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <PhoneIcon className="w-3.5 h-3.5" />
                                        {selectedRecruiter.contactNumber}
                                    </div>
                                )}
                                {selectedRecruiter.location && (
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <MapPinIcon className="w-3.5 h-3.5" />
                                        {selectedRecruiter.location}
                                    </div>
                                )}
                                {selectedRecruiter.companyWebsite && (
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <GlobeAltIcon className="w-3.5 h-3.5" />
                                        <a
                                            href={selectedRecruiter.companyWebsite}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-purple-600 hover:underline"
                                        >
                                            {selectedRecruiter.companyWebsite}
                                        </a>
                                    </div>
                                )}
                            </div>

                            <hr className="my-4 border-gray-100" />

                            {/* Description */}
                            {selectedRecruiter.description && (
                                <div className="mb-4">
                                    <h4 className="text-xs font-semibold text-gray-900 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                                        <BuildingOfficeIcon className="w-3.5 h-3.5 text-purple-500" />
                                        About Company
                                    </h4>
                                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{selectedRecruiter.description}</p>
                                </div>
                            )}

                            {!selectedRecruiter.description && (
                                <div className="text-center py-6">
                                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <BuildingOfficeIcon className="w-7 h-7 text-gray-300" />
                                    </div>
                                    <p className="text-sm text-gray-400">No company description available.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes modalIn {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default RecruiterProfiles;
