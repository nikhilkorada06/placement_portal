import { Link } from 'react-router-dom';
import {
    BuildingOfficeIcon,
    UserGroupIcon,
    ArrowRightIcon,
    ShieldCheckIcon,
} from '@heroicons/react/24/outline';

const ManageRecruiters = () => {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <BuildingOfficeIcon className="w-7 h-7 text-purple-600" />
                    Manage Recruiters
                </h1>
                <p className="text-sm text-gray-500 mt-1">Oversee recruiter accounts, profiles, and verification</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Access Recruiter Profiles Card */}
                <Link
                    to="/admin/recruiters/profiles"
                    className="group bg-white rounded-2xl border border-gray-200 p-6 hover:border-purple-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                >
                    <div className="flex items-start justify-between">
                        <div className="w-11 h-11 bg-purple-50 rounded-xl flex items-center justify-center">
                            <UserGroupIcon className="w-5.5 h-5.5 text-purple-600" />
                        </div>
                        <ArrowRightIcon className="w-4 h-4 text-gray-300 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all mt-1" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mt-4">Access Recruiter Profiles</h3>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                        Browse all recruiter profiles with filters by company, industry &amp; verification status.
                    </p>
                    <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg group-hover:bg-purple-100 transition-colors">
                        View Profiles
                        <ArrowRightIcon className="w-3 h-3" />
                    </div>
                </Link>

                {/* Recruiter Verification Card */}
                <Link
                    to="/admin/recruiters/verification"
                    className="group bg-white rounded-2xl border border-gray-200 p-6 hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                >
                    <div className="flex items-start justify-between">
                        <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center">
                            <ShieldCheckIcon className="w-5.5 h-5.5 text-emerald-600" />
                        </div>
                        <ArrowRightIcon className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all mt-1" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mt-4">Recruiter Verification</h3>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                        Verify recruiter accounts and manage their access permissions.
                    </p>
                    <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg group-hover:bg-emerald-100 transition-colors">
                        Verify Recruiters
                        <ArrowRightIcon className="w-3 h-3" />
                    </div>
                </Link>
            </div>
        </div>
    );
};

export default ManageRecruiters;
