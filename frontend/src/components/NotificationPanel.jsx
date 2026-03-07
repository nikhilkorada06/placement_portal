import { useState, useEffect, useRef } from 'react';
import { BellIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { BellAlertIcon } from '@heroicons/react/24/solid';
import { useAuth } from '@context/AuthContext';
import {
    subscribeToNotifications,
    subscribeToUnreadCount,
    markAsRead,
    markAllAsRead,
} from '@services/notificationService';

const typeConfig = {
    application_status: { color: 'bg-blue-500', label: 'Application' },
    interview_scheduled: { color: 'bg-purple-500', label: 'Interview' },
    new_job: { color: 'bg-green-500', label: 'New Job' },
    application_received: { color: 'bg-indigo-500', label: 'Application' },
    account_verified: { color: 'bg-emerald-500', label: 'Verified' },
    job_approved: { color: 'bg-teal-500', label: 'Approved' },
    profile_update: { color: 'bg-yellow-500', label: 'Profile' },
    system: { color: 'bg-gray-500', label: 'System' },
};

const formatTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const NotificationPanel = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    const panelRef = useRef(null);

    // Subscribe to real-time notifications
    useEffect(() => {
        if (!user?.uid) return;

        const unsubNotifs = subscribeToNotifications(user.uid, (data) => {
            setNotifications(data);
        });

        const unsubCount = subscribeToUnreadCount(user.uid, (count) => {
            setUnreadCount(count);
        });

        return () => {
            unsubNotifs();
            unsubCount();
        };
    }, [user?.uid]);

    // Close panel on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAsRead = async (notifId) => {
        try {
            await markAsRead(notifId);
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
        }
    };

    const handleMarkAllAsRead = async () => {
        if (!user?.uid) return;
        try {
            await markAllAsRead(user.uid);
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell Button */}
            <button
                onClick={() => setOpen(!open)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
                {unreadCount > 0 ? (
                    <BellAlertIcon className="w-6 h-6 text-primary-600" />
                ) : (
                    <BellIcon className="w-6 h-6" />
                )}
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {open && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg ring-1 ring-black/5 z-50 max-h-[28rem] flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllAsRead}
                                    className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                                >
                                    Mark all read
                                </button>
                            )}
                            <button
                                onClick={() => setOpen(false)}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Notification List */}
                    <div className="overflow-y-auto flex-1">
                        {notifications.length === 0 ? (
                            <div className="py-10 text-center text-sm text-gray-500">
                                No notifications yet
                            </div>
                        ) : (
                            notifications.map((notif) => {
                                const config = typeConfig[notif.type] || typeConfig.system;
                                return (
                                    <div
                                        key={notif.id}
                                        className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${
                                            !notif.isRead ? 'bg-primary-50/40' : ''
                                        }`}
                                        onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                                    >
                                        {/* Dot indicator */}
                                        <div className="pt-1.5">
                                            <span
                                                className={`block w-2 h-2 rounded-full ${
                                                    notif.isRead ? 'bg-gray-300' : config.color
                                                }`}
                                            />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-medium text-gray-500">
                                                    {config.label}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    {formatTimeAgo(notif.createdAt)}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium text-gray-900 mt-0.5">
                                                {notif.title}
                                            </p>
                                            <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                                                {notif.message}
                                            </p>
                                        </div>

                                        {/* Mark as read button */}
                                        {!notif.isRead && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMarkAsRead(notif.id);
                                                }}
                                                className="p-1 text-gray-400 hover:text-green-600 rounded"
                                                title="Mark as read"
                                            >
                                                <CheckIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationPanel;
