import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { USER_ROLES, BRANCHES } from '@config/constants';
import toast from 'react-hot-toast';

const RegisterPage = () => {
    const [formData, setFormData] = useState({
        role: USER_ROLES.STUDENT,
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        // Student specific
        rollNumber: '',
        branch: '',
        // Recruiter specific
        companyName: '',
        designation: '',
    });
    const [loading, setLoading] = useState(false);
    const { signUpWithOTP } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.fullName || !formData.email || !formData.password) {
            toast.error('Please fill in all required fields');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (formData.password.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email.trim())) {
            toast.error('Please enter a valid email address');
            return;
        }

        setLoading(true);
        try {
            const userData = {
                fullName: formData.fullName,
                role: formData.role,
            };

            if (formData.role === USER_ROLES.STUDENT) {
                userData.studentData = {
                    rollNumber: formData.rollNumber,
                    branch: formData.branch,
                };
            } else if (formData.role === USER_ROLES.RECRUITER) {
                userData.recruiterData = {
                    companyName: formData.companyName,
                    designation: formData.designation,
                };
            }

            const result = await signUpWithOTP(formData.email.trim(), formData.password, userData);
            toast.success('OTP sent to your email! Please verify.');

            // Navigate to OTP verification page
            navigate(`/verify-otp/${result.uid}`);
        } catch (error) {
            console.error('Registration error:', error);
            toast.error(error.message || 'Failed to create account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <div className="flex justify-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center">
                            <span className="text-white font-bold text-2xl">C</span>
                        </div>
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-display font-bold text-gray-900">
                        Create Your Account
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Join CareerOS today
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        {/* Role Selection */}
                        <div>
                            <label className="label">I am a</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, role: USER_ROLES.STUDENT })}
                                    className={`p-4 border-2 rounded-lg text-center transition-all ${formData.role === USER_ROLES.STUDENT
                                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                                        : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                >
                                    <div className="font-semibold">Student</div>
                                    <div className="text-xs text-gray-600 mt-1">Looking for opportunities</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, role: USER_ROLES.RECRUITER })}
                                    className={`p-4 border-2 rounded-lg text-center transition-all ${formData.role === USER_ROLES.RECRUITER
                                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                                        : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                >
                                    <div className="font-semibold">Recruiter</div>
                                    <div className="text-xs text-gray-600 mt-1">Hiring candidates</div>
                                </button>
                            </div>
                        </div>

                        {/* Common Fields */}
                        <div>
                            <label htmlFor="fullName" className="label">
                                Full Name *
                            </label>
                            <input
                                id="fullName"
                                name="fullName"
                                type="text"
                                required
                                className="input"
                                placeholder="John Doe"
                                value={formData.fullName}
                                onChange={handleChange}
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="label">
                                Email Address *
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="input"
                                placeholder="you@example.com"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>

                        {/* Role Specific Fields */}
                        {formData.role === USER_ROLES.STUDENT && (
                            <>
                                <div>
                                    <label htmlFor="rollNumber" className="label">
                                        Roll Number
                                    </label>
                                    <input
                                        id="rollNumber"
                                        name="rollNumber"
                                        type="text"
                                        className="input"
                                        placeholder="CS2021001"
                                        value={formData.rollNumber}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="branch" className="label">
                                        Branch/Department
                                    </label>
                                    <select
                                        id="branch"
                                        name="branch"
                                        className="input"
                                        value={formData.branch}
                                        onChange={handleChange}
                                    >
                                        <option value="">Select your branch</option>
                                        {BRANCHES.map((b) => (
                                            <option key={b} value={b}>{b}</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}

                        {formData.role === USER_ROLES.RECRUITER && (
                            <>
                                <div>
                                    <label htmlFor="companyName" className="label">
                                        Company Name
                                    </label>
                                    <input
                                        id="companyName"
                                        name="companyName"
                                        type="text"
                                        className="input"
                                        placeholder="Acme Inc."
                                        value={formData.companyName}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="designation" className="label">
                                        Your Designation
                                    </label>
                                    <input
                                        id="designation"
                                        name="designation"
                                        type="text"
                                        className="input"
                                        placeholder="HR Manager"
                                        value={formData.designation}
                                        onChange={handleChange}
                                    />
                                </div>
                            </>
                        )}

                        <div>
                            <label htmlFor="password" className="label">
                                Password *
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="input"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleChange}
                            />
                            <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="label">
                                Confirm Password *
                            </label>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                required
                                className="input"
                                placeholder="••••••••"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-primary btn-lg"
                    >
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>

                    <div className="text-center space-y-2">
                        <span className="text-sm text-gray-600">
                            Already have an account?{' '}
                            <Link
                                to="/login"
                                className="font-medium text-primary-600 hover:text-primary-500"
                            >
                                Sign in
                            </Link>
                        </span>
                        <div>
                            <Link
                                to="/"
                                className="text-sm text-gray-500 hover:text-primary-600 transition-colors inline-flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                Back to Home
                            </Link>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegisterPage;
