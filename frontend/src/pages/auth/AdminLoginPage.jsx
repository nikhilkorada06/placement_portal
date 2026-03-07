import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import toast from 'react-hot-toast';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';

const AdminLoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn, userProfile } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (userProfile) {
            if (userProfile.role === 'admin') {
                navigate('/admin/dashboard', { replace: true });
            } else {
                toast.error('Access denied. Admin accounts only.');
                navigate('/', { replace: true });
            }
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
            // Navigation will happen via useEffect when userProfile loads
        } catch (error) {
            console.error('Admin login error:', error);
            toast.error('Invalid credentials. Contact your administrator.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <div className="flex justify-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-violet-700 rounded-xl flex items-center justify-center shadow-lg">
                            <ShieldCheckIcon className="w-9 h-9 text-white" />
                        </div>
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-display font-bold text-gray-900">
                        Admin Portal
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Sign in with credentials provided by your account maintainer
                    </p>
                    <div className="mt-3 flex justify-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-medium border border-purple-200">
                            <ShieldCheckIcon className="w-3.5 h-3.5" />
                            Authorized Personnel Only
                        </span>
                    </div>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="admin-email" className="label">
                                Admin Email
                            </label>
                            <input
                                id="admin-email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="input"
                                placeholder="admin@careeros.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div>
                            <label htmlFor="admin-password" className="label">
                                Password
                            </label>
                            <input
                                id="admin-password"
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

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 text-white font-semibold hover:from-purple-700 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 transition-all duration-200"
                    >
                        {loading ? 'Signing in...' : 'Sign In as Admin'}
                    </button>

                    <div className="text-center">
                        <Link
                            to="/"
                            className="text-sm text-gray-500 hover:text-purple-600 transition-colors inline-flex items-center gap-1"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Home
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminLoginPage;
