import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';

const PublicLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleGetStarted = () => {
        if (location.pathname === '/') {
            document.getElementById('portals')?.scrollIntoView({ behavior: 'smooth' });
        } else {
            navigate('/');
            setTimeout(() => {
                document.getElementById('portals')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <Link to="/" className="flex items-center space-x-2">
                                <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center">
                                    <span className="text-white font-bold text-xl">C</span>
                                </div>
                                <span className="text-2xl font-display font-bold text-gray-900">
                                    Career<span className="text-primary-600">OS</span>
                                </span>
                            </Link>
                        </div>

                        <div className="flex items-center space-x-4">
                            <Link
                                to="/login"
                                className="text-gray-700 hover:text-primary-600 font-medium transition-colors"
                            >
                                Sign In
                            </Link>
                            <button
                                onClick={handleGetStarted}
                                className="btn-primary btn-md"
                            >
                                Get Started
                            </button>
                        </div>
                    </div>
                </nav>
            </header>

            {/* Main Content */}
            <main>
                <Outlet />
            </main>
        </div>
    );
};

export default PublicLayout;
