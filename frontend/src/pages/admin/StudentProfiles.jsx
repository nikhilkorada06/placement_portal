import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '@config/firebase';
import { BRANCHES } from '@config/constants';
import {
    MagnifyingGlassIcon,
    FunnelIcon,
    AcademicCapIcon,
    UserGroupIcon,
    ChevronDownIcon,
    XMarkIcon,
    ArrowLeftIcon,
    ArrowPathIcon,
    ChartBarIcon,
    EnvelopeIcon,
    IdentificationIcon,
    CheckIcon,
    ClockIcon,
    CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const CGPA_RANGES = [
    { label: 'All', min: 0, max: 10 },
    { label: '9.0 - 10.0', min: 9, max: 10 },
    { label: '8.0 - 8.99', min: 8, max: 8.99 },
    { label: '7.0 - 7.99', min: 7, max: 7.99 },
    { label: '6.0 - 6.99', min: 6, max: 6.99 },
    { label: 'Below 6.0', min: 0, max: 5.99 },
];
const SORT_OPTIONS = [
    { value: 'name-asc', label: 'Name (A-Z)' },
    { value: 'name-desc', label: 'Name (Z-A)' },
    { value: 'cgpa-desc', label: 'CGPA (High to Low)' },
    { value: 'cgpa-asc', label: 'CGPA (Low to High)' },
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
];

const StudentProfiles = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [bulkActionLoading, setBulkActionLoading] = useState(false);

    // Filters
    const [selectedBranches, setSelectedBranches] = useState([]);
    const [selectedGenders, setSelectedGenders] = useState([]);
    const [cgpaRange, setCgpaRange] = useState(CGPA_RANGES[0]);
    const [minCgpa, setMinCgpa] = useState('');
    const [maxCgpa, setMaxCgpa] = useState('');
    const [skillSearch, setSkillSearch] = useState('');
    const [profileComplete, setProfileComplete] = useState('all'); // 'all', 'complete', 'incomplete'
    const [sortBy, setSortBy] = useState('name-asc');

    // Fetch all students with their user data
    useEffect(() => {
        const fetchStudents = async () => {
            try {
                // Get all users with role 'student'
                const usersQuery = query(
                    collection(db, 'users'),
                    where('role', '==', 'student')
                );
                const usersSnapshot = await getDocs(usersQuery);
                const usersMap = {};
                usersSnapshot.forEach((doc) => {
                    usersMap[doc.id] = doc.data();
                });

                // Get all student profiles
                const studentsSnapshot = await getDocs(collection(db, 'students'));
                const studentsList = [];
                studentsSnapshot.forEach((doc) => {
                    const studentData = doc.data();
                    const userData = usersMap[doc.id] || {};
                    studentsList.push({
                        id: doc.id,
                        ...studentData,
                        fullName: userData.fullName || studentData.fullName || 'Unknown',
                        email: userData.email || '',
                        gender: userData.gender || studentData.gender || '',
                        verified: userData.verified || false,
                        isAdminVerified: userData.isAdminVerified ?? true,
                        createdAt: userData.createdAt || studentData.createdAt || '',
                    });
                });

                setStudents(studentsList);
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
            toast.success(`${studentName} has been verified`);
        } catch (error) {
            console.error('Error verifying student:', error);
            toast.error('Failed to verify student');
        } finally {
            setActionLoading(null);
        }
    };

    const handleBulkRevoke = async () => {
        if (selectedStudents.length === 0) return;
        
        const confirmedStudents = selectedStudents.filter(id => {
            const student = students.find(s => s.id === id);
            return student?.isAdminVerified === true;
        });

        if (confirmedStudents.length === 0) {
            toast.error('No verified students selected');
            return;
        }

        setBulkActionLoading(true);
        try {
            await Promise.all(
                confirmedStudents.map(studentId =>
                    updateDoc(doc(db, 'users', studentId), {
                        isAdminVerified: false,
                        updatedAt: new Date().toISOString(),
                    })
                )
            );
            setStudents((prev) =>
                prev.map((s) => 
                    confirmedStudents.includes(s.id) ? { ...s, isAdminVerified: false } : s
                )
            );
            toast.success(`Access revoked for ${confirmedStudents.length} student(s)`);
            setSelectedStudents([]);
        } catch (error) {
            console.error('Error revoking access:', error);
            toast.error('Failed to revoke access');
        } finally {
            setBulkActionLoading(false);
        }
    };

    const toggleStudentSelection = (studentId) => {
        setSelectedStudents((prev) =>
            prev.includes(studentId)
                ? prev.filter((id) => id !== studentId)
                : [...prev, studentId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedStudents.length === filteredStudents.length) {
            setSelectedStudents([]);
        } else {
            setSelectedStudents(filteredStudents.map((s) => s.id));
        }
    };

    // Toggle branch filter
    const toggleBranch = (branch) => {
        setSelectedBranches((prev) =>
            prev.includes(branch) ? prev.filter((b) => b !== branch) : [...prev, branch]
        );
    };

    // Toggle gender filter
    const toggleGender = (gender) => {
        setSelectedGenders((prev) =>
            prev.includes(gender) ? prev.filter((g) => g !== gender) : [...prev, gender]
        );
    };

    // Clear all filters
    const clearFilters = () => {
        setSelectedBranches([]);
        setSelectedGenders([]);
        setCgpaRange(CGPA_RANGES[0]);
        setMinCgpa('');
        setMaxCgpa('');
        setSkillSearch('');
        setProfileComplete('all');
        setSortBy('name-asc');
        setSearchTerm('');
    };

    const activeFilterCount =
        selectedBranches.length +
        selectedGenders.length +
        (cgpaRange.label !== 'All' ? 1 : 0) +
        (minCgpa || maxCgpa ? 1 : 0) +
        (skillSearch ? 1 : 0) +
        (profileComplete !== 'all' ? 1 : 0);

    // Filtered & sorted students
    const filteredStudents = useMemo(() => {
        let result = [...students];

        // Search
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            result = result.filter(
                (s) =>
                    (s.fullName || '').toLowerCase().includes(term) ||
                    (s.email || '').toLowerCase().includes(term) ||
                    (s.rollNumber || '').toLowerCase().includes(term) ||
                    (s.branch || '').toLowerCase().includes(term) ||
                    (s.skills || []).some((sk) => sk.toLowerCase().includes(term))
            );
        }

        // Branch filter
        if (selectedBranches.length > 0) {
            result = result.filter((s) => selectedBranches.includes(s.branch));
        }

        // Gender filter
        if (selectedGenders.length > 0) {
            result = result.filter((s) =>
                selectedGenders.some((g) => (s.gender || '').toLowerCase() === g.toLowerCase())
            );
        }

        // CGPA range preset
        if (cgpaRange.label !== 'All') {
            result = result.filter((s) => {
                const c = parseFloat(s.cgpa);
                return !isNaN(c) && c >= cgpaRange.min && c <= cgpaRange.max;
            });
        }

        // Custom CGPA range
        if (minCgpa !== '' || maxCgpa !== '') {
            result = result.filter((s) => {
                const c = parseFloat(s.cgpa);
                if (isNaN(c)) return false;
                if (minCgpa !== '' && c < parseFloat(minCgpa)) return false;
                if (maxCgpa !== '' && c > parseFloat(maxCgpa)) return false;
                return true;
            });
        }

        // Skill filter
        if (skillSearch.trim()) {
            const skillTerm = skillSearch.toLowerCase();
            result = result.filter((s) =>
                (s.skills || []).some((sk) => sk.toLowerCase().includes(skillTerm))
            );
        }

        // Profile completion filter
        if (profileComplete === 'complete') {
            result = result.filter((s) => s.profileCompleted === true);
        } else if (profileComplete === 'incomplete') {
            result = result.filter((s) => !s.profileCompleted);
        }

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case 'name-asc':
                    return (a.fullName || '').localeCompare(b.fullName || '');
                case 'name-desc':
                    return (b.fullName || '').localeCompare(a.fullName || '');
                case 'cgpa-desc':
                    return (parseFloat(b.cgpa) || 0) - (parseFloat(a.cgpa) || 0);
                case 'cgpa-asc':
                    return (parseFloat(a.cgpa) || 0) - (parseFloat(b.cgpa) || 0);
                case 'newest':
                    return (b.createdAt || '').localeCompare(a.createdAt || '');
                case 'oldest':
                    return (a.createdAt || '').localeCompare(b.createdAt || '');
                default:
                    return 0;
            }
        });

        return result;
    }, [students, searchTerm, selectedBranches, selectedGenders, cgpaRange, minCgpa, maxCgpa, skillSearch, profileComplete, sortBy]);

    // Stats
    const stats = useMemo(() => {
        const avgCgpa =
            students.filter((s) => s.cgpa).reduce((a, s) => a + parseFloat(s.cgpa || 0), 0) /
                (students.filter((s) => s.cgpa).length || 1);
        const branchCounts = {};
        students.forEach((s) => {
            if (s.branch) branchCounts[s.branch] = (branchCounts[s.branch] || 0) + 1;
        });
        const topBranch = Object.entries(branchCounts).sort((a, b) => b[1] - a[1])[0];
        return {
            total: students.length,
            avgCgpa: avgCgpa.toFixed(2),
            topBranch: topBranch ? topBranch[0] : 'N/A',
            profileCompleted: students.filter((s) => s.profileCompleted).length,
        };
    }, [students]);

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
                    <p className="mt-4 text-gray-600">Loading student profiles...</p>
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
                            <UserGroupIcon className="w-7 h-7 text-purple-600" />
                            Student Profiles
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Browse and filter all {stats.total} registered students
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

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-5 text-white shadow-lg shadow-purple-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-purple-100 text-xs font-medium uppercase tracking-wider">Total Students</p>
                            <p className="text-3xl font-bold mt-1">{stats.total}</p>
                        </div>
                        <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <UserGroupIcon className="w-6 h-6" />
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-5 text-white shadow-lg shadow-blue-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">Average CGPA</p>
                            <p className="text-3xl font-bold mt-1">{stats.avgCgpa}</p>
                        </div>
                        <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <ChartBarIcon className="w-6 h-6" />
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-5 text-white shadow-lg shadow-emerald-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-emerald-100 text-xs font-medium uppercase tracking-wider">Top Branch</p>
                            <p className="text-lg font-bold mt-1 truncate">{stats.topBranch}</p>
                        </div>
                        <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <AcademicCapIcon className="w-6 h-6" />
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg shadow-orange-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-orange-100 text-xs font-medium uppercase tracking-wider">Profile Done</p>
                            <p className="text-3xl font-bold mt-1">{stats.profileCompleted}</p>
                        </div>
                        <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <IdentificationIcon className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search by name, email, roll number, branch, or skill..."
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all text-sm bg-white shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                    <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-purple-50/30 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <FunnelIcon className="w-4 h-4 text-purple-600" />
                            Filter Students
                        </h3>
                    </div>
                    <div className="p-6 space-y-6">
                        {/* Branch Filter */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Branch / Department</label>
                            <div className="flex flex-wrap gap-2">
                                {BRANCHES.map((branch) => (
                                    <button
                                        key={branch}
                                        onClick={() => toggleBranch(branch)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                                            selectedBranches.includes(branch)
                                                ? 'bg-purple-100 text-purple-700 border-purple-300 shadow-sm'
                                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                                        }`}
                                    >
                                        {branch}
                                        {selectedBranches.includes(branch) && (
                                            <XMarkIcon className="w-3 h-3 ml-1 inline" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Gender Filter */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Gender</label>
                            <div className="flex flex-wrap gap-2">
                                {GENDER_OPTIONS.map((gender) => (
                                    <button
                                        key={gender}
                                        onClick={() => toggleGender(gender)}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                                            selectedGenders.includes(gender)
                                                ? 'bg-blue-100 text-blue-700 border-blue-300 shadow-sm'
                                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                                        }`}
                                    >
                                        {gender}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* CGPA Range */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">CGPA Range (Preset)</label>
                                <div className="flex flex-wrap gap-2">
                                    {CGPA_RANGES.map((range) => (
                                        <button
                                            key={range.label}
                                            onClick={() => {
                                                setCgpaRange(range);
                                                setMinCgpa('');
                                                setMaxCgpa('');
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                                                cgpaRange.label === range.label
                                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-300 shadow-sm'
                                                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                                            }`}
                                        >
                                            {range.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">Custom CGPA Range</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        step="0.1"
                                        placeholder="Min"
                                        className="w-24 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                                        value={minCgpa}
                                        onChange={(e) => {
                                            setMinCgpa(e.target.value);
                                            setCgpaRange(CGPA_RANGES[0]);
                                        }}
                                    />
                                    <span className="text-gray-400 text-sm">to</span>
                                    <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        step="0.1"
                                        placeholder="Max"
                                        className="w-24 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                                        value={maxCgpa}
                                        onChange={(e) => {
                                            setMaxCgpa(e.target.value);
                                            setCgpaRange(CGPA_RANGES[0]);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Skill & Profile Completion */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">Filter by Skill</label>
                                <input
                                    type="text"
                                    placeholder="e.g. React, Python, Java..."
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                                    value={skillSearch}
                                    onChange={(e) => setSkillSearch(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">Profile Status</label>
                                <div className="flex gap-2">
                                    {[
                                        { value: 'all', label: 'All' },
                                        { value: 'complete', label: 'Complete' },
                                        { value: 'incomplete', label: 'Incomplete' },
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setProfileComplete(opt.value)}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                                                profileComplete === opt.value
                                                    ? 'bg-amber-100 text-amber-700 border-amber-300 shadow-sm'
                                                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
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
                        Showing <span className="font-semibold text-gray-900">{filteredStudents.length}</span> of{' '}
                        <span className="font-semibold text-gray-900">{students.length}</span> students
                    </p>
                    {filteredStudents.length > 0 && (
                        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            />
                            Select All
                        </label>
                    )}
                </div>
                {selectedStudents.length > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                            {selectedStudents.length} selected
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

            {/* Student Cards Grid */}
            {filteredStudents.length === 0 ? (
                <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <UserGroupIcon className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">No students found</h3>
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
                    {filteredStudents.map((student) => {
                        const initial = getInitial(student.fullName);
                        const completionScore =
                            (student.aboutMe ? 20 : 0) +
                            (student.profilePhoto ? 20 : 0) +
                            ((student.skills || []).length > 0 ? 20 : 0) +
                            ((student.projects || []).length > 0 ? 20 : 0) +
                            ((student.achievements || []).length > 0 ? 20 : 0);

                        return (
                            <div
                                key={student.id}
                                className={`group bg-white rounded-2xl border-2 transition-all duration-300 shadow-sm hover:shadow-lg overflow-hidden flex flex-col ${
                                    selectedStudents.includes(student.id)
                                        ? 'border-purple-400 ring-2 ring-purple-200'
                                        : 'border-gray-100 hover:border-purple-200'
                                }`}
                            >
                                {/* Card Header - Gradient banner */}
                                <div className="relative h-20 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500">
                                    <div className="absolute inset-0 opacity-20">
                                        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                                            <defs>
                                                <pattern id={`grid-${student.id}`} width="20" height="20" patternUnits="userSpaceOnUse">
                                                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
                                                </pattern>
                                            </defs>
                                            <rect width="100%" height="100%" fill={`url(#grid-${student.id})`} />
                                        </svg>
                                    </div>
                                    {/* Profile Completion Badge */}
                                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                                        {student.isAdminVerified === false ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-100 border border-amber-300/30 backdrop-blur-sm">
                                                <ClockIcon className="w-3 h-3" />
                                                Pending
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-400/20 text-green-100 border border-green-300/30 backdrop-blur-sm">
                                                <CheckBadgeIcon className="w-3 h-3" />
                                                Verified
                                            </span>
                                        )}
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-sm ${
                                            completionScore === 100
                                                ? 'bg-green-400/20 text-green-100 border border-green-300/30'
                                                : 'bg-white/20 text-white border border-white/30'
                                        }`}>
                                            {completionScore}% Complete
                                        </span>
                                    </div>
                                </div>

                                {/* Avatar overlapping the banner */}
                                <div className="px-5 -mt-8 relative z-10">
                                    {student.profilePhoto ? (
                                        <img
                                            src={student.profilePhoto}
                                            alt={student.fullName}
                                            className="w-16 h-16 rounded-xl object-cover border-3 border-white shadow-md bg-white"
                                        />
                                    ) : (
                                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-500 border-3 border-white shadow-md flex items-center justify-center">
                                            <span className="text-xl font-bold text-white">{initial}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Card Body */}
                                <div className="px-5 pt-3 pb-5 flex flex-col flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="text-base font-bold text-gray-900 truncate flex-1">{student.fullName}</h3>
                                        <input
                                            type="checkbox"
                                            checked={selectedStudents.includes(student.id)}
                                            onChange={() => toggleStudentSelection(student.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer mt-0.5 flex-shrink-0"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        {student.branch && (
                                            <span className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded-md">
                                                {student.branch}
                                            </span>
                                        )}
                                        {student.gender && (
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                                {student.gender}
                                            </span>
                                        )}
                                    </div>

                                    {/* Key Info */}
                                    <div className="mt-3 space-y-1.5">
                                        {student.rollNumber && (
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <IdentificationIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                                <span className="truncate">{student.rollNumber}</span>
                                            </div>
                                        )}
                                        {student.email && (
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <EnvelopeIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                                <span className="truncate">{student.email}</span>
                                            </div>
                                        )}
                                        {student.cgpa && (
                                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                                <StarIcon className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                                <span className="font-semibold">{student.cgpa} / 10 CGPA</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Skills Preview */}
                                    {(student.skills || []).length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-1">
                                            {student.skills.slice(0, 4).map((skill, i) => (
                                                <span
                                                    key={skill}
                                                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${getSkillColor(i)}`}
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                            {student.skills.length > 4 && (
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-500">
                                                    +{student.skills.length - 4} more
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Spacer to push buttons to bottom */}
                                    <div className="flex-grow"></div>

                                    {/* View Profile Button */}
                                    <button
                                        onClick={() => setSelectedStudent(student)}
                                        className="mt-3 w-full py-2 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-all flex items-center justify-center gap-1"
                                    >
                                        View Full Profile
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    </button>

                                    {/* Verification Actions */}
                                    {student.isAdminVerified === false && (
                                        <div className="mt-2">
                                            <button
                                                onClick={() => handleVerify(student.id, student.fullName)}
                                                disabled={actionLoading === student.id}
                                                className="w-full py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all disabled:opacity-50 inline-flex items-center justify-center gap-1"
                                            >
                                                {actionLoading === student.id ? (
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
                            {/* Completion badge */}
                            <div className="absolute top-3 left-4">
                                {(() => {
                                    const cs =
                                        (selectedStudent.aboutMe ? 20 : 0) +
                                        (selectedStudent.profilePhoto ? 20 : 0) +
                                        ((selectedStudent.skills || []).length > 0 ? 20 : 0) +
                                        ((selectedStudent.projects || []).length > 0 ? 20 : 0) +
                                        ((selectedStudent.achievements || []).length > 0 ? 20 : 0);
                                    return (
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-sm ${
                                            cs === 100
                                                ? 'bg-green-400/20 text-green-100 border border-green-300/30'
                                                : 'bg-white/15 text-white border border-white/25'
                                        }`}>
                                            {cs}% Profile Complete
                                        </span>
                                    );
                                })()}
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

export default StudentProfiles;
