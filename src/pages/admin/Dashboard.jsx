import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, NavLink, Outlet, Routes, Route, Link, useLocation } from 'react-router-dom';
import api from '../../utils/axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardDocumentListIcon,
  UserGroupIcon,
  MegaphoneIcon,
  ChartBarIcon,
  ChartPieIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import ComplaintList from './ComplaintList';
import MemberManagement from './MemberManagement';
import AnnouncementManagement from './AnnouncementManagement';
import DashboardStats from './DashboardStats';
import NotificationBell from '../../components/NotificationBell';
import PollManagement from './PollManagement';

const navItems = [
  { 
    name: 'Overview', 
    path: '', 
    icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z'
  },
  { 
    name: 'Students', 
    path: 'students',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z'
  },
  { 
    name: 'Complaints', 
    path: 'complaints',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
  },
  { 
    name: 'Announcements', 
    path: 'announcements',
    icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z'
  },
  {
    name: 'Members',
    path: 'members',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z'
  },
  {
    name: 'Polls',
    path: 'polls',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
  },
];

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notificationCount, setNotificationCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Close sidebar when route changes
  const location = useLocation();
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location]);

  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        const res = await api.get('/api/notifications/unread-count');
        setNotificationCount(res.data.count);
      } catch (err) {
        console.error('Failed to fetch notification count:', err);
        // Don't set error state, just log it
      }
    };

    fetchNotificationCount();
    
    // Refresh count when new notification arrives
    const refreshHandler = () => fetchNotificationCount();
    window.addEventListener('refresh-notifications', refreshHandler);
    
    // Poll for new notifications every minute
    const interval = setInterval(fetchNotificationCount, 60000);

    return () => {
      window.removeEventListener('refresh-notifications', refreshHandler);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 via-white to-blue-50 overflow-hidden">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg hover:bg-gray-50 transition-colors duration-200"
      >
        <Bars3Icon className="w-6 h-6 text-gray-600" />
      </button>

      {/* Mobile Sidebar Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: isSidebarOpen ? 0 : '-100%',
        }}
        transition={{ type: 'spring', damping: 20 }}
        className="fixed lg:relative top-0 left-0 w-60 h-screen bg-white border-r border-blue-100 shadow-lg flex flex-col z-50 lg:translate-x-0 lg:!transform-none"
      >
        {/* Mobile Close Button */}
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
        >
          <XMarkIcon className="w-6 h-6 text-gray-600" />
        </button>

        {/* Header */}
        <div className="p-6">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 rounded-2xl shadow-lg flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="flex-1">
              <h1 className="font-bold text-sm">Hostel Admin</h1>
              <p className="text-sm text-blue-100">Management Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                  isActive 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-200' 
                  : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                }`
              }
              end
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
              </svg>
              <span className="transition-all duration-200 flex-1">{item.name}</span>
              {item.path === 'notifications' && notificationCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce">
                  {notificationCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-6 border-t border-blue-50">
          <div className="p-4 bg-blue-50 rounded-xl mb-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center text-white font-bold shadow-lg">
                {user?.name?.charAt(0)}
              </div>
              <div>
                <div className="font-medium text-gray-900">{user?.name}</div>
                <div className="text-sm text-gray-500">Administrator</div>
              </div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-red-600 font-medium hover:bg-red-50 transition-colors duration-200 group"
          >
            <svg 
              className="w-5 h-5 transition-transform duration-200 group-hover:rotate-180" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen">
        <div className="max-w-7xl mx-auto p-4 lg:p-8">
          <div className="flex justify-end mb-4">
            <NotificationBell />
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const AdminDashboardLayout = () => (
  <Routes>
    <Route index element={<DashboardStats />} />
    <Route path="complaints" element={<ComplaintList />} />
    <Route path="members" element={<MemberManagement />} />
    <Route path="announcements" element={<AnnouncementManagement />} />
    <Route path="polls" element={<PollManagement />} />
  </Routes>
);

export default AdminDashboard;