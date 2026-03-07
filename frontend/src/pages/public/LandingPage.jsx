import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    AcademicCapIcon,
    ChartBarIcon,
    ShieldCheckIcon,
    BoltIcon,
    UsersIcon,
    BuildingOfficeIcon,
    Cog6ToothIcon,
    ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { companyLogosRow1, companyLogosRow2 } from '@assets/company-logos';

const features = [
    {
        name: 'Smart Job Matching',
        description: 'AI-powered job recommendations based on your profile, skills, and preferences.',
        icon: BoltIcon,
    },
    {
        name: 'Real-time Updates',
        description: 'Get instant notifications on application status changes and new opportunities.',
        icon: ChartBarIcon,
    },
    {
        name: 'Transparent Process',
        description: 'Complete visibility into the recruitment pipeline with audit trails.',
        icon: ShieldCheckIcon,
    },
    {
        name: 'Resume Builder',
        description: 'Create professional resumes with industry-standard templates.',
        icon: AcademicCapIcon,
    },
    {
        name: 'Analytics Dashboard',
        description: 'Comprehensive insights into placement trends and hiring patterns.',
        icon: ChartBarIcon,
    },
    {
        name: 'Multi-role Support',
        description: 'Separate dashboards for students, recruiters, and placement administrators.',
        icon: UsersIcon,
    },
];

const portalCards = [
    {
        title: 'Student',
        description: 'Find dream jobs, build your resume, track applications, and prepare for interviews — all in one place.',
        icon: AcademicCapIcon,
        gradient: 'from-blue-500 to-indigo-600',
        hoverGradient: 'from-blue-600 to-indigo-700',
        bgLight: 'bg-blue-50',
        borderColor: 'border-blue-200',
        hoverBorder: 'hover:border-blue-400',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        link: '/student/register',
        linkLabel: 'Get Started',
        isLogin: false,
    },
    {
        title: 'Recruiter',
        description: 'Post jobs, manage applications, shortlist candidates, and schedule interviews efficiently.',
        icon: BuildingOfficeIcon,
        gradient: 'from-emerald-500 to-teal-600',
        hoverGradient: 'from-emerald-600 to-teal-700',
        bgLight: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        hoverBorder: 'hover:border-emerald-400',
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
        link: '/recruiter/register',
        linkLabel: 'Get Started',
        isLogin: false,
    },
    {
        title: 'Admin',
        description: 'Manage the entire placement process — oversee students, recruiters, analytics, and generate reports.',
        icon: Cog6ToothIcon,
        gradient: 'from-purple-500 to-violet-600',
        hoverGradient: 'from-purple-600 to-violet-700',
        bgLight: 'bg-purple-50',
        borderColor: 'border-purple-200',
        hoverBorder: 'hover:border-purple-400',
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-600',
        link: '/admin/login',
        linkLabel: 'Admin Login',
        isLogin: true,
    },
];

// Company Logo Component - Shows image if exists, otherwise shows styled text
const CompanyLogo = ({ company }) => {
    const [imageError, setImageError] = useState(false);

    return (
        <div className="flex-shrink-0 h-12 px-6 flex items-center justify-center transition-all duration-300 opacity-60 hover:opacity-100">
            {!imageError ? (
                <img
                    src={`/company-logos/${company.logo}`}
                    alt={company.name}
                    className="max-h-10 max-w-[120px] object-contain hover:scale-110 transition-all duration-300"
                    onError={() => setImageError(true)}
                />
            ) : (
                <span className="text-lg font-bold text-gray-400 whitespace-nowrap hover:text-primary-600 transition-colors">
                    {company.name}
                </span>
            )}
        </div>
    );
};

const LandingPage = () => {
    return (
        <div className="overflow-hidden">
            {/* Hero Section */}
            <section className="relative py-20 sm:py-32">
                {/* Background decoration */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-100 rounded-full blur-3xl opacity-50" />
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary-100 rounded-full blur-3xl opacity-50" />
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 border border-primary-200 text-primary-700 text-sm font-medium mb-6">
                            <BoltIcon className="w-4 h-4" />
                            <span>Powering Smart Campus Placements</span>
                        </div>
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold text-gray-900 mb-6 animate-fade-in">
                            Transform Your Campus
                            <span className="block bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                                Placement Experience
                            </span>
                        </h1>
                        <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
                            CareerOS is the all-in-one platform connecting students, recruiters, and placement cells
                            with real-time collaboration and intelligent automation.
                        </p>
                    </div>

                    {/* Portal Selection Cards */}
                    <div id="portals" className="max-w-5xl mx-auto">
                        <h2 className="text-center text-lg font-semibold text-gray-500 uppercase tracking-wider mb-8">
                            Who Are You ?
                        </h2>
                        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
                            {portalCards.map((card) => (
                                <Link
                                    key={card.title}
                                    to={card.link}
                                    className={`group relative rounded-2xl border-2 ${card.borderColor} ${card.hoverBorder} ${card.bgLight} p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col`}
                                >
                                    {/* Icon */}
                                    <div className={`w-14 h-14 ${card.iconBg} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                                        <card.icon className={`w-7 h-7 ${card.iconColor}`} />
                                    </div>

                                    {/* Content */}
                                    <h3 className="text-2xl font-bold text-gray-900 mb-3">
                                        {card.title}
                                    </h3>
                                    <p className="text-gray-600 leading-relaxed mb-6 flex-1">
                                        {card.description}
                                    </p>

                                    {/* Action Button */}
                                    <div className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r ${card.gradient} text-white font-semibold text-sm group-hover:gap-3 transition-all duration-300 w-fit`}>
                                        {card.linkLabel}
                                        <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                                    </div>

                                    {/* Login badge for admin */}
                                    {card.isLogin && (
                                        <div className="absolute top-4 right-4">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium border border-purple-200">
                                                <ShieldCheckIcon className="w-3.5 h-3.5" />
                                                Authorized Only
                                            </span>
                                        </div>
                                    )}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Quick sign-in link */}
                    <div className="text-center mt-8">
                        <span className="text-gray-500">Already have an account? </span>
                        <Link to="/student/login" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">Student sign in</Link>
                        <span className="text-gray-400 mx-2">·</span>
                        <Link to="/recruiter/login" className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">Recruiter sign in</Link>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 mb-4">
                            Everything You Need for Successful Placements
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            Powerful features designed to streamline the entire recruitment lifecycle
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature) => (
                            <div
                                key={feature.name}
                                className="card p-6 hover:shadow-medium transition-all duration-300 hover:-translate-y-1"
                            >
                                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                                    <feature.icon className="w-6 h-6 text-primary-600" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    {feature.name}
                                </h3>
                                <p className="text-gray-600">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>



            {/* Company Logos Section */}
            <section className="py-16 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
                    <h2 className="text-2xl sm:text-3xl font-display font-bold text-gray-900 text-center mb-2">
                        Trusted by Top Companies
                    </h2>
                    <p className="text-gray-600 text-center">
                        Our students have been placed at leading organizations worldwide
                    </p>
                </div>

                {/* Row 1 - Left to Right */}
                <div className="marquee-container mb-8">
                    <div className="marquee-track marquee-left-to-right">
                        {[...companyLogosRow1, ...companyLogosRow1].map((company, index) => (
                            <CompanyLogo key={`row1-${index}`} company={company} />
                        ))}
                    </div>
                </div>

                {/* Row 2 - Right to Left */}
                <div className="marquee-container">
                    <div className="marquee-track marquee-right-to-left">
                        {[...companyLogosRow2, ...companyLogosRow2].map((company, index) => (
                            <CompanyLogo key={`row2-${index}`} company={company} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Main Footer */}
                    <div className="py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
                        {/* Brand */}
                        <div className="col-span-2 md:col-span-1">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                                    <span className="text-white font-bold text-lg">C</span>
                                </div>
                                <span className="text-xl font-display font-bold text-white">CareerOS</span>
                            </div>
                            <p className="text-sm text-gray-400 leading-relaxed">
                                Streamlining campus placements with smart technology. Connecting students, recruiters, and administrators on one platform.
                            </p>
                        </div>

                        {/* Quick Links */}
                        <div>
                            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
                            <ul className="space-y-2 text-sm">
                                <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
                                <li><Link to="/student/login" className="hover:text-white transition-colors">Student Sign In</Link></li>
                                <li><Link to="/recruiter/login" className="hover:text-white transition-colors">Recruiter Sign In</Link></li>
                                <li><Link to="/forgot-password" className="hover:text-white transition-colors">Reset Password</Link></li>
                            </ul>
                        </div>

                        {/* For Users */}
                        <div>
                            <h3 className="text-white font-semibold mb-4">Portals</h3>
                            <ul className="space-y-2 text-sm">
                                <li><Link to="/student/register" className="hover:text-white transition-colors">Student Portal</Link></li>
                                <li><Link to="/recruiter/register" className="hover:text-white transition-colors">Recruiter Portal</Link></li>
                                <li><Link to="/admin/login" className="hover:text-white transition-colors">Admin Portal</Link></li>
                            </ul>
                        </div>

                        {/* Contact */}
                        <div>
                            <h3 className="text-white font-semibold mb-4">Contact</h3>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-start gap-2">
                                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <span>support@careeros.com</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span>Training &amp; Placement Cell</span>
                                </li>
                            </ul>
                            {/* Social Links */}
                            <div className="flex gap-3 mt-4">
                                <a href="#" className="w-8 h-8 rounded-full bg-gray-800 hover:bg-primary-600 flex items-center justify-center transition-colors">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 01-1.93.07 4.28 4.28 0 004 2.98 8.521 8.521 0 01-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z" /></svg>
                                </a>
                                <a href="#" className="w-8 h-8 rounded-full bg-gray-800 hover:bg-primary-600 flex items-center justify-center transition-colors">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                                </a>
                                <a href="#" className="w-8 h-8 rounded-full bg-gray-800 hover:bg-primary-600 flex items-center justify-center transition-colors">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" /></svg>
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Bar */}
                    <div className="border-t border-gray-800 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
                        <p>&copy; {new Date().getFullYear()} CareerOS. All rights reserved.</p>
                        <div className="flex gap-6">
                            <a href="#" className="hover:text-gray-300 transition-colors">Privacy Policy</a>
                            <a href="#" className="hover:text-gray-300 transition-colors">Terms of Service</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
