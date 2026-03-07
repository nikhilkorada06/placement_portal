import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import toast from 'react-hot-toast';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn, userProfile } = useAuth();
    const navigate = useNavigate();

    // Navigate after userProfile is loaded
    useEffect(() => {
        if (userProfile) {
            const getRoute = () => {
                switch (userProfile.role) {
                    case 'student':
                        return '/student/dashboard';
                    case 'recruiter':
                        return '/recruiter/dashboard';
                    case 'admin':
                        return '/admin/dashboard';
                    default:
                        return '/';
                }
            };
            navigate(getRoute(), { replace: true });
        }
    }, [userProfile, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email || !password) {
            toast.error('Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            await signIn(email, password);
            toast.success('Welcome back!');
            // Navigation will happen via useEffect when userProfile loads
        } catch (error) {
            console.error('Login error:', error);
            toast.error(error.message || 'Failed to sign in');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <div className="flex justify-center">
                        <Link to="/" className="w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center hover:shadow-lg transition-shadow" title="Go to Home">
                            <span className="text-white font-bold text-2xl">C</span>
                        </Link>
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-display font-bold text-gray-900">
                        Welcome Back
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Sign in to your CareerOS account
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="label">
                                Email Address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="input"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="label">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input
                                id="remember-me"
                                name="remember-me"
                                type="checkbox"
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                                Remember me
                            </label>
                        </div>

                        <div className="text-sm">
                            <Link
                                to="/forgot-password"
                                className="font-medium text-primary-600 hover:text-primary-500"
                            >
                                Forgot password?
                            </Link>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-primary btn-lg"
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>

                    <div className="text-center space-y-2">
                        <span className="text-sm text-gray-600">
                            Don&apos;t have an account?{' '}
                            <Link
                                to="/register"
                                className="font-medium text-primary-600 hover:text-primary-500"
                            >
                                Sign up
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
export default LoginPage;
