import { Link } from 'react-router-dom';
import {
    UserGroupIcon,
    AcademicCapIcon,
    ArrowRightIcon,
    IdentificationIcon,
} from '@heroicons/react/24/outline';

const ManageStudents = () => {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <AcademicCapIcon className="w-7 h-7 text-purple-600" />
                    Manage Students
                </h1>
                <p className="text-sm text-gray-500 mt-1">Oversee student accounts, profiles, and verification</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Access Student Profiles Card */}
                <Link
                    to="/admin/students/profiles"
                    className="group bg-white rounded-2xl border border-gray-200 p-6 hover:border-purple-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                >
                    <div className="flex items-start justify-between">
                        <div className="w-11 h-11 bg-purple-50 rounded-xl flex items-center justify-center">
                            <UserGroupIcon className="w-5.5 h-5.5 text-purple-600" />
                        </div>
                        <ArrowRightIcon className="w-4 h-4 text-gray-300 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all mt-1" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mt-4">Access Student Profiles</h3>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                        Browse all profiles with filters by branch, CGPA, gender, skills &amp; more.
                    </p>
                    <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg group-hover:bg-purple-100 transition-colors">
                        View Profiles
                        <ArrowRightIcon className="w-3 h-3" />
                    </div>
                </Link>

                {/* Student Verification Card */}
                <Link
                    to="/admin/students/verification"
                    className="group bg-white rounded-2xl border border-gray-200 p-6 hover:border-amber-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                >
                    <div className="flex items-start justify-between">
                        <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center">
                            <IdentificationIcon className="w-5.5 h-5.5 text-amber-600" />
                        </div>
                        <ArrowRightIcon className="w-4 h-4 text-gray-300 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all mt-1" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mt-4">Student Verification</h3>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                        Verify student accounts and manage their access permissions.
                    </p>
                    <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg group-hover:bg-amber-100 transition-colors">
                        Verify Students
                        <ArrowRightIcon className="w-3 h-3" />
                    </div>
                </Link>
            </div>
        </div>
    );
};

export default ManageStudents;
