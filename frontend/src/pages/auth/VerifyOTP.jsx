import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import toast from 'react-hot-toast';

const VerifyOTP = () => {
    const { uid } = useParams();
    const navigate = useNavigate();
    const { verifyOTP, resendOTP } = useAuth();

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const inputRefs = useRef([]);

    // Countdown timer for resend
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // Handle OTP input change
    const handleChange = (index, value) => {
        // Only allow digits
        if (value && !/^\d$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    // Handle keyboard navigation
    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    // Handle paste
    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6);
        if (/^\d+$/.test(pastedData)) {
            const newOtp = pastedData.split('').concat(Array(6 - pastedData.length).fill(''));
            setOtp(newOtp);
            inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
        }
    };

    // Verify OTP
    const handleVerify = async () => {
        const enteredOTP = otp.join('');

        if (enteredOTP.length !== 6) {
            toast.error('Please enter the complete 6-digit OTP');
            return;
        }

        setLoading(true);
        try {
            const result = await verifyOTP(uid, enteredOTP);

            // Students/recruiters need admin approval before they can log in
            if (result.needsAdminApproval) {
                const pendingApprovalMessage = result.role === 'recruiter'
                    ? 'your request for new accound sent to admin. you may login once the admin verifys'
                    : 'Your account has been created! You can access it once the admin verifies your account.';

                toast.success(pendingApprovalMessage, { duration: 6000 });
                navigate('/', { replace: true });
                return;
            }

            toast.success('Email verified successfully! Welcome to CareerOS.');

            // Redirect to dashboard based on role
            if (result.role === 'student') {
                navigate('/student/dashboard', { replace: true });
            } else if (result.role === 'recruiter') {
                navigate('/recruiter/dashboard', { replace: true });
            } else if (result.role === 'admin') {
                navigate('/admin/dashboard', { replace: true });
            } else {
                navigate('/login', { replace: true });
            }
        } catch (error) {
            console.error('OTP verification error:', error);
            toast.error(error.message || 'Invalid OTP. Please try again.');
            // Clear OTP inputs on error
            setOtp(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    // Resend OTP
    const handleResend = async () => {
        if (countdown > 0) return;

        setResending(true);
        try {
            await resendOTP(uid);
            toast.success('New OTP sent to your email!');
            setCountdown(60); // 60 second cooldown
            setOtp(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } catch (error) {
            console.error('Resend OTP error:', error);
            toast.error(error.message || 'Failed to resend OTP');
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                {/* Header */}
                <div className="text-center">
                    <div className="flex justify-center">
                        <img src="/logo.png" alt="CareerOS" className="w-16 h-16 object-contain" />
                    </div>
                    <h2 className="mt-6 text-3xl font-display font-bold text-gray-900">
                        Verify Your Email
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        We&apos;ve sent a 6-digit verification code to your email.
                        <br />
                        Please enter it below.
                    </p>
                </div>

                {/* OTP Input */}
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                    <div className="space-y-6">
                        {/* OTP Inputs */}
                        <div className="flex justify-center gap-3">
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={(el) => (inputRefs.current[index] = el)}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    onPaste={handlePaste}
                                    className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all outline-none"
                                    disabled={loading}
                                />
                            ))}
                        </div>

                        {/* Verify Button */}
                        <button
                            onClick={handleVerify}
                            disabled={loading || otp.join('').length !== 6}
                            className="w-full btn-primary btn-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <svg
                                        className="animate-spin h-5 w-5"
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
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    Verify OTP
                                </>
                            )}
                        </button>

                        {/* Resend Section */}
                        <div className="text-center">
                            <p className="text-sm text-gray-600 mb-2">
                                Didn&apos;t receive the code?
                            </p>
                            <button
                                onClick={handleResend}
                                disabled={resending || countdown > 0}
                                className="text-primary-600 hover:text-primary-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {resending ? (
                                    'Sending...'
                                ) : countdown > 0 ? (
                                    `Resend OTP in ${countdown}s`
                                ) : (
                                    'Resend OTP'
                                )}
                            </button>
                        </div>

                        {/* Info Box */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex gap-3">
                                <svg
                                    className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                <div className="text-sm text-blue-800">
                                    <p className="font-medium">OTP expires in 5 minutes</p>
                                    <p className="mt-1 text-blue-700">
                                        Please check your spam folder if you don&apos;t see the email in your inbox.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Back to Sign Up */}
                <div className="text-center">
                    <Link
                        to="/register"
                        className="text-sm text-gray-600 hover:text-gray-900"
                    >
                        ← Back to Sign Up
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default VerifyOTP;
