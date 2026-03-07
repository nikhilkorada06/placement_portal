import { INTERVIEW_STATUS } from '@config/constants';

const badgeStyles = {
    [INTERVIEW_STATUS.SCHEDULED]: 'bg-blue-100 text-blue-800',
    [INTERVIEW_STATUS.RESCHEDULED]: 'bg-yellow-100 text-yellow-800',
    [INTERVIEW_STATUS.COMPLETED]: 'bg-green-100 text-green-800',
    [INTERVIEW_STATUS.CANCELLED]: 'bg-red-100 text-red-800',
};

const badgeLabels = {
    [INTERVIEW_STATUS.SCHEDULED]: 'Scheduled',
    [INTERVIEW_STATUS.RESCHEDULED]: 'Rescheduled',
    [INTERVIEW_STATUS.COMPLETED]: 'Completed',
    [INTERVIEW_STATUS.CANCELLED]: 'Cancelled',
};

const InterviewStatusBadge = ({ status }) => {
    const style = badgeStyles[status] || 'bg-gray-100 text-gray-800';
    const label = badgeLabels[status] || status;

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
            {label}
        </span>
    );
};

export default InterviewStatusBadge;
