import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@config/firebase';
import { COLLECTIONS, JOB_TYPES, WORK_MODES, JOB_TYPE_LABELS, BRANCHES } from '@config/constants';
import { uploadPdfToCloudinary } from '@services/cloudinaryService';
import { useAuth } from '@context/AuthContext';
import toast from 'react-hot-toast';

// Constants for form options
const JOB_POSITIONS = [
    'Software Developer',
    'Data Analyst',
    'Designer',
    'Manager',
    'Business Analyst',
    'Consultant',
    'Engineer',
    'Executive',
    'Intern',
    'Trainee',
    'Research Associate',
    'Other',
];

// BRANCHES imported from @config/constants

const SELECTION_PROCESS_OPTIONS = [
    'Resume Screening',
    'Online Assessment',
    'Technical Interview',
    'HR Interview',
    'Group Discussion',
    'Case Study',
    'Coding Round',
    'System Design',
    'Final Interview',
];

const SALARY_TYPES = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'stipend', label: 'Stipend (Internship)' },
];

const INTERVIEW_MODES = [
    { value: 'online', label: 'Online' },
    { value: 'offline', label: 'Offline / In-Person' },
    { value: 'hybrid', label: 'Hybrid' },
];

const DEFAULT_WORKFLOW_STAGES = [
    'Applied',
    'Shortlisted',
    'Interview Scheduled',
    'Selected',
    'Rejected',
];

// Section Card Component (defined outside PostJob to keep a stable reference)
const SectionCard = ({ title, children, icon }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                {icon && <span className="text-blue-600">{icon}</span>}
                {title}
            </h2>
        </div>
        <div className="p-6">{children}</div>
    </div>
);

// Multi-Select Field Component (defined outside PostJob — uses useWatch so only this component re-renders)
const MultiSelectField = ({ label, name, options, required, control, setValue, errors }) => {
    const selectedValues = useWatch({ control, name }) || [];

    const toggleOption = (option) => {
        const newValues = selectedValues.includes(option)
            ? selectedValues.filter((v) => v !== option)
            : [...selectedValues, option];
        setValue(name, newValues, { shouldValidate: false });
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="flex flex-wrap gap-2">
                {options.map((option) => (
                    <button
                        key={option}
                        type="button"
                        onClick={() => toggleOption(option)}
                        className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${selectedValues.includes(option)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                            }`}
                    >
                        {option}
                    </button>
                ))}
            </div>
            {required && selectedValues.length === 0 && errors?.[name] && (
                <p className="text-sm text-red-500">Please select at least one option</p>
            )}
        </div>
    );
};

// Dropdown Multi-Select Component — select from dropdown, shows tags below
const DropdownMultiSelect = ({ label, name, options, required, control, setValue, errors }) => {
    const selectedValues = useWatch({ control, name }) || [];

    const handleSelect = (e) => {
        const value = e.target.value;
        if (value && !selectedValues.includes(value)) {
            setValue(name, [...selectedValues, value], { shouldValidate: false });
        }
        e.target.value = ''; // reset dropdown
    };

    const removeTag = (option) => {
        setValue(name, selectedValues.filter((v) => v !== option), { shouldValidate: false });
    };

    const availableOptions = options.filter((opt) => !selectedValues.includes(opt));

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <select
                onChange={handleSelect}
                defaultValue=""
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
            >
                <option value="" disabled>Select a position...</option>
                {availableOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
            {selectedValues.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                    {selectedValues.map((val) => (
                        <span
                            key={val}
                            className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full"
                        >
                            {val}
                            <button
                                type="button"
                                onClick={() => removeTag(val)}
                                className="ml-0.5 hover:text-blue-600 focus:outline-none"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </span>
                    ))}
                </div>
            )}
            {required && selectedValues.length === 0 && errors?.[name] && (
                <p className="text-sm text-red-500">Please select at least one position</p>
            )}
        </div>
    );
};

const PostJob = () => {
    const navigate = useNavigate();
    const { user, userProfile } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({ jd: false, brochure: false });
    const [attachments, setAttachments] = useState({ jobDescriptionPDF: null, companyBrochure: null });
    const [submitError, setSubmitError] = useState(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [previewFile, setPreviewFile] = useState(null); // which file to preview: 'jd' | 'brochure' | null

    // Generate object URLs for local PDF preview
    const jdPreviewUrl = useMemo(() => {
        if (attachments.jobDescriptionPDF) return URL.createObjectURL(attachments.jobDescriptionPDF);
        return null;
    }, [attachments.jobDescriptionPDF]);

    const brochurePreviewUrl = useMemo(() => {
        if (attachments.companyBrochure) return URL.createObjectURL(attachments.companyBrochure);
        return null;
    }, [attachments.companyBrochure]);

    // Revoke object URLs on cleanup to prevent memory leaks
    useEffect(() => {
        return () => {
            if (jdPreviewUrl) URL.revokeObjectURL(jdPreviewUrl);
            if (brochurePreviewUrl) URL.revokeObjectURL(brochurePreviewUrl);
        };
    }, [jdPreviewUrl, brochurePreviewUrl]);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        control,
        formState: { errors },
    } = useForm({
        defaultValues: {
            jobTitle: '',
            companyName: userProfile?.companyName || '',
            jobType: JOB_TYPES.FULL_TIME,
            workMode: WORK_MODES.ONSITE,
            location: '',
            positions: [],
            openings: 1,
            roleOverview: '',
            responsibilities: '',
            requiredSkills: '',
            preferredSkills: '',
            technologies: '',
            qualification: '',
            experience: '',
            internshipDuration: '',
            salaryType: 'yearly',
            salaryAmount: '',
            bonus: '',
            ppoAvailable: false,
            minCGPA: '',
            branches: [],
            passingYear: new Date().getFullYear(),
            backlogAllowed: false,
            requiredSkillTags: '',
            certifications: '',
            portfolioRequired: false,
            deadline: '',
            selectionProcess: [],
            resumeRequired: true,
            coverLetterRequired: false,
            interviewMode: 'online',
            interviewLink: '',
            interviewDate: '',
            workflowStages: DEFAULT_WORKFLOW_STAGES,
        },
    });

    const watchJobType = watch('jobType');

    // Redirect if not a recruiter
    useEffect(() => {
        if (userProfile && userProfile.role !== 'recruiter') {
            navigate('/dashboard');
        }
    }, [userProfile, navigate]);

    // Auto-fill company name from user profile
    useEffect(() => {
        if (userProfile?.companyName) {
            setValue('companyName', userProfile.companyName);
        }
    }, [userProfile, setValue]);

    // Handle file uploads to Cloudinary
    const uploadFile = async (file, folder, progressKey) => {
        if (!file) return null;
        const result = await uploadPdfToCloudinary(file, folder, (pct) => {
            // Optional: could use pct for a progress bar in the future
        });
        return result.url;
    };

    // Handle file selection
    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            setAttachments((prev) => ({ ...prev, [type]: file }));
        }
    };

    // Remove a selected file
    const removeFile = (type) => {
        setAttachments((prev) => ({ ...prev, [type]: null }));
    };

    // Form submission handler
    const onSubmit = async (data, isDraft = false) => {
        setIsSubmitting(true);
        setSubmitError(null);
        setSubmitSuccess(false);

        try {
            setIsUploading(true);
            let attachmentUrls = {};

            // Upload job description PDF to Cloudinary
            if (attachments.jobDescriptionPDF) {
                setUploadProgress((prev) => ({ ...prev, jd: true }));
                attachmentUrls.jobDescriptionPDF = await uploadFile(
                    attachments.jobDescriptionPDF,
                    `job-attachments/${user.uid}/job-descriptions`
                );
                setUploadProgress((prev) => ({ ...prev, jd: false }));
            }

            // Upload company brochure to Cloudinary
            if (attachments.companyBrochure) {
                setUploadProgress((prev) => ({ ...prev, brochure: true }));
                attachmentUrls.companyBrochure = await uploadFile(
                    attachments.companyBrochure,
                    `job-attachments/${user.uid}/brochures`
                );
                setUploadProgress((prev) => ({ ...prev, brochure: false }));
            }

            setIsUploading(false);

            // Prepare job document
            const jobDocument = {
                recruiterId: user.uid,
                companyName: data.companyName,
                title: data.jobTitle,
                jobType: data.jobType,
                workMode: data.workMode,
                location: data.location,
                positions: data.positions || [],
                openings: parseInt(data.openings, 10) || 1,

                description: {
                    roleOverview: data.roleOverview,
                    responsibilities: data.responsibilities,
                    requiredSkills: data.requiredSkills,
                    preferredSkills: data.preferredSkills,
                    technologies: data.technologies,
                    qualification: data.qualification,
                    experience: data.experience,
                    ...(data.jobType === JOB_TYPES.INTERNSHIP && {
                        internshipDuration: data.internshipDuration,
                    }),
                },

                eligibility: {
                    minCGPA: parseFloat(data.minCGPA) || 0,
                    branches: data.branches || [],
                    passingYear: parseInt(data.passingYear, 10),
                    backlogAllowed: data.backlogAllowed,
                    requiredSkillTags: data.requiredSkillTags
                        ? data.requiredSkillTags.split(',').map((s) => s.trim())
                        : [],
                    certifications: data.certifications
                        ? data.certifications.split(',').map((s) => s.trim())
                        : [],
                    portfolioRequired: data.portfolioRequired,
                },

                salary: {
                    type: data.salaryType,
                    amount: data.salaryAmount,
                    bonus: data.bonus,
                    ppoAvailable: data.ppoAvailable,
                },

                applicationSettings: {
                    deadline: data.deadline,
                    selectionProcess: data.selectionProcess || [],
                    resumeRequired: data.resumeRequired,
                    coverLetterRequired: data.coverLetterRequired,
                },

                interviewSettings: {
                    mode: data.interviewMode,
                    link: data.interviewLink,
                    date: data.interviewDate,
                },

                workflowStages: data.workflowStages || DEFAULT_WORKFLOW_STAGES,

                attachments: attachmentUrls,

                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                status: isDraft ? 'draft' : 'active',
                isAdminApproved: false, // Job requires admin approval before appearing to students
            };

            // Save to Firestore
            await addDoc(collection(db, COLLECTIONS.JOBS), jobDocument);

            setSubmitSuccess(true);
            if (isDraft) {
                toast.success('Job saved as draft!');
            } else {
                toast.success('Job posting request sent to admin for approval!', {
                    duration: 4000,
                    icon: '⏳',
                });
            }
            setTimeout(() => {
                navigate('/recruiter/jobs');
            }, 1500);
        } catch (error) {
            console.error('Error posting job:', error);
            setSubmitError(error.message || 'Failed to post job. Please try again.');
        } finally {
            setIsSubmitting(false);
            setIsUploading(false);
        }
    };



    // Input Field Component
    const InputField = ({ label, name, type = 'text', required, placeholder, disabled, ...rest }) => (
        <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
                type={type}
                {...register(name, { required: required && `${label} is required` })}
                placeholder={placeholder}
                disabled={disabled}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                    } ${errors[name] ? 'border-red-500' : 'border-gray-300'}`}
                {...rest}
            />
            {errors[name] && <p className="text-sm text-red-500">{errors[name].message}</p>}
        </div>
    );

    // Textarea Field Component
    const TextareaField = ({ label, name, required, placeholder, rows = 4 }) => (
        <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <textarea
                {...register(name, { required: required && `${label} is required` })}
                placeholder={placeholder}
                rows={rows}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none ${errors[name] ? 'border-red-500' : 'border-gray-300'
                    }`}
            />
            {errors[name] && <p className="text-sm text-red-500">{errors[name].message}</p>}
        </div>
    );

    // Select Field Component
    const SelectField = ({ label, name, options, required }) => (
        <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <select
                {...register(name, { required: required && `${label} is required` })}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white ${errors[name] ? 'border-red-500' : 'border-gray-300'
                    }`}
            >
                <option value="">Select {label}</option>
                {options.map((opt) => (
                    <option key={opt.value || opt} value={opt.value || opt}>
                        {opt.label || opt}
                    </option>
                ))}
            </select>
            {errors[name] && <p className="text-sm text-red-500">{errors[name].message}</p>}
        </div>
    );

    // Checkbox Field Component
    const CheckboxField = ({ label, name }) => (
        <label className="flex items-center gap-3 cursor-pointer">
            <input
                type="checkbox"
                {...register(name)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{label}</span>
        </label>
    );



    if (!userProfile) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="pb-24">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Post New Job</h1>
                <p className="text-gray-600 mt-1">Create a new job or internship posting for candidates</p>
            </div>

            {/* Success/Error Messages */}
            {submitSuccess && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                        />
                    </svg>
                    <span className="text-green-800">Job posted successfully! Redirecting...</span>
                </div>
            )}

            {submitError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                        />
                    </svg>
                    <span className="text-red-800">{submitError}</span>
                </div>
            )}

            <form onSubmit={handleSubmit((data) => onSubmit(data, false))} className="space-y-6">
                {/* Section 1: Basic Job Information */}
                <SectionCard
                    title="Basic Job Information"
                    icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                        </svg>
                    }
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <InputField
                            label="Job Title"
                            name="jobTitle"
                            required
                            placeholder="e.g., Software Engineer"
                        />
                        <InputField
                            label="Company Name"
                            name="companyName"
                            required
                            disabled
                            placeholder="Company Name"
                        />
                        <SelectField
                            label="Job Type"
                            name="jobType"
                            required
                            options={[
                                { value: JOB_TYPES.FULL_TIME, label: JOB_TYPE_LABELS[JOB_TYPES.FULL_TIME] },
                                { value: JOB_TYPES.INTERNSHIP, label: JOB_TYPE_LABELS[JOB_TYPES.INTERNSHIP] },
                                { value: JOB_TYPES.PART_TIME, label: JOB_TYPE_LABELS[JOB_TYPES.PART_TIME] },
                                { value: JOB_TYPES.CONTRACT, label: JOB_TYPE_LABELS[JOB_TYPES.CONTRACT] },
                            ]}
                        />
                        <SelectField
                            label="Work Mode"
                            name="workMode"
                            required
                            options={[
                                { value: WORK_MODES.ONSITE, label: 'On-site' },
                                { value: WORK_MODES.REMOTE, label: 'Remote' },
                                { value: WORK_MODES.HYBRID, label: 'Hybrid' },
                            ]}
                        />
                        <InputField label="Location" name="location" required placeholder="e.g., Bangalore, India" />
                        <InputField label="Number of Openings" name="openings" type="number" required placeholder="1" />
                    </div>
                    <div className="mt-6">
                        <DropdownMultiSelect label="Positions / Roles" name="positions" options={JOB_POSITIONS} required control={control} setValue={setValue} errors={errors} />
                    </div>
                </SectionCard>

                {/* Section 2: Job Description */}
                <SectionCard
                    title="Job Description"
                    icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                    }
                >
                    <div className="space-y-6">
                        <TextareaField
                            label="Role Overview"
                            name="roleOverview"
                            required
                            placeholder="Provide a brief overview of the role and its impact..."
                            rows={3}
                        />
                        <TextareaField
                            label="Key Responsibilities"
                            name="responsibilities"
                            required
                            placeholder="List the key responsibilities for this role..."
                            rows={4}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <TextareaField
                                label="Required Skills"
                                name="requiredSkills"
                                required
                                placeholder="List the required skills..."
                                rows={3}
                            />
                            <TextareaField
                                label="Preferred Skills"
                                name="preferredSkills"
                                placeholder="List any nice-to-have skills..."
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <TextareaField
                                label="Technologies / Tools"
                                name="technologies"
                                placeholder="e.g., React, Node.js, AWS, Docker..."
                                rows={2}
                            />
                            <TextareaField
                                label="Qualification"
                                name="qualification"
                                placeholder="e.g., B.Tech/B.E. in CS/IT"
                                rows={2}
                            />
                        </div>
                        <InputField label="Experience Required" name="experience" placeholder="e.g., 0-2 years" />
                        {watchJobType === JOB_TYPES.INTERNSHIP && (
                            <InputField
                                label="Internship Duration"
                                name="internshipDuration"
                                required
                                placeholder="e.g., 3 months, 6 months"
                            />
                        )}
                    </div>
                </SectionCard>

                {/* Section 3: Salary Details */}
                <SectionCard
                    title="Salary Details"
                    icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    }
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <SelectField label="Salary Type" name="salaryType" options={SALARY_TYPES} />
                        <InputField
                            label="Salary Amount"
                            name="salaryAmount"
                            type="number"
                            required
                            placeholder="e.g., 800000 or 25000"
                        />
                        <InputField label="Bonus / Incentives" name="bonus" placeholder="e.g., Performance bonus" />
                        <div className="flex items-end pb-2">
                            <CheckboxField label="PPO Available (for internships)" name="ppoAvailable" />
                        </div>
                    </div>
                </SectionCard>

                {/* Section 4: Eligibility */}
                <SectionCard
                    title="Eligibility Criteria"
                    icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                            />
                        </svg>
                    }
                >
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <InputField
                                label="Minimum CGPA"
                                name="minCGPA"
                                type="number"
                                placeholder="e.g., 6.0"
                            />
                            <InputField
                                label="Passing Year"
                                name="passingYear"
                                type="number"
                                placeholder={new Date().getFullYear().toString()}
                            />
                            <div className="flex items-end pb-2">
                                <CheckboxField label="Backlogs Allowed" name="backlogAllowed" />
                            </div>
                        </div>
                        <MultiSelectField label="Eligible Branches" name="branches" options={BRANCHES} control={control} setValue={setValue} errors={errors} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputField
                                label="Required Skill Tags"
                                name="requiredSkillTags"
                                placeholder="e.g., JavaScript, Python, SQL (comma separated)"
                            />
                            <InputField
                                label="Certifications"
                                name="certifications"
                                placeholder="e.g., AWS Certified, Coursera Certificate (comma separated)"
                            />
                        </div>
                        <CheckboxField label="Portfolio Required" name="portfolioRequired" />
                    </div>
                </SectionCard>

                {/* Section 5: Application Settings */}
                <SectionCard
                    title="Application Settings"
                    icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                        </svg>
                    }
                >
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputField label="Application Deadline" name="deadline" type="date" required />
                            <div className="flex items-end gap-6 pb-2">
                                <CheckboxField label="Resume Required" name="resumeRequired" />
                                <CheckboxField label="Cover Letter Required" name="coverLetterRequired" />
                            </div>
                        </div>
                        <MultiSelectField label="Selection Process" name="selectionProcess" options={SELECTION_PROCESS_OPTIONS} control={control} setValue={setValue} errors={errors} />
                    </div>
                </SectionCard>

                {/* Section 6: Interview Settings */}
                <SectionCard
                    title="Interview Settings"
                    icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                        </svg>
                    }
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <SelectField label="Interview Mode" name="interviewMode" options={INTERVIEW_MODES} />
                        <InputField
                            label="Interview Link"
                            name="interviewLink"
                            placeholder="e.g., https://meet.google.com/..."
                        />
                        <InputField label="Tentative Interview Date" name="interviewDate" type="date" />
                    </div>
                </SectionCard>

                {/* Section 7: Attachments */}
                <SectionCard
                    title="Attachments"
                    icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                            />
                        </svg>
                    }
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Job Description PDF */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Job Description PDF</label>
                            {attachments.jobDescriptionPDF ? (
                                <div className="border-2 border-green-300 bg-green-50 rounded-xl p-5 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-green-800 truncate">{attachments.jobDescriptionPDF.name}</p>
                                            <p className="text-xs text-green-600 mt-0.5">
                                                {(attachments.jobDescriptionPDF.size / 1024).toFixed(1)} KB &middot; PDF uploaded successfully
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setPreviewFile('jd')}
                                            className="flex-shrink-0 p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                                            title="Preview PDF"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeFile('jobDescriptionPDF')}
                                            className="flex-shrink-0 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors"
                                            title="Remove file"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                    {uploadProgress.jd && (
                                        <div className="mt-3">
                                            <div className="w-full bg-green-200 rounded-full h-1.5">
                                                <div className="bg-green-600 h-1.5 rounded-full animate-pulse w-2/3"></div>
                                            </div>
                                            <p className="text-xs text-green-700 mt-1">Uploading...</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <label className="relative block border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group">
                                    <svg className="mx-auto h-10 w-10 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <p className="mt-2 text-sm font-medium text-gray-700 group-hover:text-blue-600">Drop your JD here or click to browse</p>
                                    <p className="mt-1 text-xs text-gray-500">PDF format &middot; Max 10MB</p>
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={(e) => handleFileChange(e, 'jobDescriptionPDF')}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                </label>
                            )}
                        </div>

                        {/* Company Brochure */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Company Brochure</label>
                            {attachments.companyBrochure ? (
                                <div className="border-2 border-green-300 bg-green-50 rounded-xl p-5 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-green-800 truncate">{attachments.companyBrochure.name}</p>
                                            <p className="text-xs text-green-600 mt-0.5">
                                                {(attachments.companyBrochure.size / 1024).toFixed(1)} KB &middot; PDF uploaded successfully
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setPreviewFile('brochure')}
                                            className="flex-shrink-0 p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                                            title="Preview PDF"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeFile('companyBrochure')}
                                            className="flex-shrink-0 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors"
                                            title="Remove file"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                    {uploadProgress.brochure && (
                                        <div className="mt-3">
                                            <div className="w-full bg-green-200 rounded-full h-1.5">
                                                <div className="bg-green-600 h-1.5 rounded-full animate-pulse w-2/3"></div>
                                            </div>
                                            <p className="text-xs text-green-700 mt-1">Uploading...</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <label className="relative block border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group">
                                    <svg className="mx-auto h-10 w-10 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <p className="mt-2 text-sm font-medium text-gray-700 group-hover:text-blue-600">Drop your brochure here or click to browse</p>
                                    <p className="mt-1 text-xs text-gray-500">PDF format &middot; Max 10MB</p>
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={(e) => handleFileChange(e, 'companyBrochure')}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                </label>
                            )}
                        </div>
                    </div>
                </SectionCard>


                {/* Sticky Submit Bar */}
                <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-gray-200 shadow-lg z-40">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center justify-between gap-4">
                            <p className="text-sm text-gray-500 hidden sm:block">
                                {isUploading ? 'Uploading files...' : 'Fill all required fields to publish'}
                            </p>
                            <div className="flex items-center gap-4 ml-auto">
                                <button
                                    type="button"
                                    onClick={handleSubmit((data) => onSubmit(data, true))}
                                    disabled={isSubmitting || isUploading}
                                    className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isSubmitting && !submitSuccess ? (
                                        <span className="flex items-center gap-2">
                                            <svg
                                                className="animate-spin h-4 w-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                />
                                            </svg>
                                            Saving...
                                        </span>
                                    ) : (
                                        'Save Draft'
                                    )}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || isUploading}
                                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isSubmitting && !submitSuccess ? (
                                        <span className="flex items-center gap-2">
                                            <svg
                                                className="animate-spin h-4 w-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                />
                                            </svg>
                                            Publishing...
                                        </span>
                                    ) : (
                                        'Publish Job'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            {/* PDF Preview Modal */}
            {previewFile && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full h-[85vh] flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {previewFile === 'jd' ? 'Job Description Preview' : 'Company Brochure Preview'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setPreviewFile(null)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden bg-gray-100">
                            <iframe
                                src={previewFile === 'jd' ? jdPreviewUrl : brochurePreviewUrl}
                                title={previewFile === 'jd' ? 'Job Description Preview' : 'Company Brochure Preview'}
                                className="w-full h-full border-0"
                            />
                        </div>
                        <div className="p-3 border-t bg-gray-50 flex items-center justify-between">
                            <p className="text-sm text-gray-500">
                                {previewFile === 'jd'
                                    ? attachments.jobDescriptionPDF?.name
                                    : attachments.companyBrochure?.name}
                            </p>
                            <button
                                type="button"
                                onClick={() => setPreviewFile(null)}
                                className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PostJob;
