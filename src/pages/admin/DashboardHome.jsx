import React, { useEffect, useState } from 'react';
import api from '../../utils/axios';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line, AreaChart, Area } from 'recharts';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CheckCircleIcon, ClockIcon, ArrowTrendingUpIcon, ExclamationTriangleIcon, ArrowPathIcon, UserGroupIcon, UserIcon, MegaphoneIcon, ChartBarIcon, ChartPieIcon, BoltIcon, EyeIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';

const ALL_CATEGORIES = ['Internet', 'Plumbing', 'Electricity', 'Canteen', 'Others'];

const COLORS = ['#0ea5e9', '#155e75', '#22d3ee', '#1e3a8a', '#0369a1', '#0284c7'];
const CATEGORY_COLORS = [
  '#0ea5e9', // Internet
  '#f59e42', // Plumbing
  '#22d3ee', // Electricity
  '#a78bfa', // Canteen
  '#f43f5e', // Others
  '#10b981', // etc.
];

const STATUS_COLORS = {
  'Received': '#0ea5e9',      // Blue
  'In Progress': '#f59e42',   // Orange
  'Resolved': '#10b981',      // Green
  'Reopened': '#f43f5e',      // Red
  'Pending': '#6366f1',       // Indigo
  'Unassigned': '#a78bfa',    // Purple
  'Uncategorized': '#64748b', // Gray
};

// StatCard component (compact version)
const StatCard = ({ icon: Icon, label, value, color, extra, animateDelay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: animateDelay, duration: 0.4 }}
    className={`bg-white rounded-lg shadow p-3 flex flex-col items-start border-l-4 ${color} min-w-[100px] w-full`}
  >
    <div className="flex items-center gap-2 mb-1">
      <Icon className={`w-5 h-5 ${color}`} />
      <span className="text-base font-bold text-gray-900">{value}</span>
    </div>
    <div className="text-xs text-gray-500 font-medium leading-tight">{label}</div>
    {extra && <div className="mt-0.5 text-xs text-gray-400">{extra}</div>}
  </motion.div>
);

// AnalyticsCharts Widgets
const AnalyticsCharts = ({ categoryChartData, pieData, trends, barData, totalCategoryComplaints }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
    {/* Pie Chart: Complaint Status */}
    <div className="bg-white rounded-xl shadow-lg p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <ChartPieIcon className="w-5 h-5 text-blue-600" />
        <span className="font-bold text-blue-900">Complaint Status</span>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
    {/* Line Chart: Complaints Over Time */}
    <div className="bg-white rounded-xl shadow-lg p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <BoltIcon className="w-5 h-5 text-cyan-600" />
        <span className="font-bold text-blue-900">Complaints Over Time</span>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={12} />
            <YAxis allowDecimals={false} fontSize={12} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
    {/* Bar Chart: Complaints by Category */}
    <div className="bg-white rounded-xl shadow-lg p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <ChartBarIcon className="w-5 h-5 text-indigo-600" />
        <span className="font-bold text-blue-900">Complaints by Category</span>
      </div>
      <div className="h-48 overflow-x-auto">
        <ResponsiveContainer width={Math.max(ALL_CATEGORIES.length * 100, 300)} height="100%">
          <BarChart data={categoryChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis allowDecimals={false} fontSize={12} />
            <Tooltip content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const { name, value } = payload[0].payload;
                const percent = totalCategoryComplaints ? ((value / totalCategoryComplaints) * 100).toFixed(1) : 0;
                return (
                  <div className="bg-white p-2 rounded shadow text-xs">
                    <div><b>{name}</b></div>
                    <div>Count: {value}</div>
                    <div>Percent: {percent}%</div>
                  </div>
                );
              }
              return null;
            }} />
            <Bar dataKey="value" fill="#0ea5e9">
              {categoryChartData.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

// HotZone (Attention Required)
const HotZone = ({ longPendingComplaints, reopenedComplaints, unassignedComplaints, feedbackPending }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    {/* Long Pending */}
    <div className="bg-white rounded-xl shadow-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
        <span className="font-bold text-red-700">Long Pending</span>
      </div>
      <ul className="space-y-2">
        {longPendingComplaints.length === 0 ? <li className="text-xs text-gray-400">None</li> :
          longPendingComplaints.map(c => (
            <li key={c.id} className="flex items-center gap-2 text-xs text-gray-700">
              <span className="font-semibold">#{c.id.slice(-6)}</span>
              <span>{c.category}</span>
              <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{Math.floor((new Date() - new Date(c.createdAt)) / (1000 * 60 * 60 * 24))}d</span>
            </li>
          ))}
      </ul>
    </div>
    {/* Reopened */}
    <div className="bg-white rounded-xl shadow-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <ArrowPathIcon className="w-5 h-5 text-cyan-600" />
        <span className="font-bold text-cyan-700">Reopened</span>
      </div>
      <ul className="space-y-2">
        {reopenedComplaints.length === 0 ? <li className="text-xs text-gray-400">None</li> :
          reopenedComplaints.map(c => (
            <li key={c.id} className="flex items-center gap-2 text-xs text-gray-700">
              <span className="font-semibold">#{c.id.slice(-6)}</span>
              <span>{c.category}</span>
              <span className="bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full">Reopened</span>
            </li>
          ))}
      </ul>
    </div>
    {/* Unassigned */}
    <div className="bg-white rounded-xl shadow-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <UserIcon className="w-5 h-5 text-yellow-600" />
        <span className="font-bold text-yellow-700">Unassigned</span>
      </div>
      <ul className="space-y-2">
        {unassignedComplaints.length === 0 ? <li className="text-xs text-gray-400">None</li> :
          unassignedComplaints.map(c => (
            <li key={c.id} className="flex items-center gap-2 text-xs text-gray-700">
              <span className="font-semibold">#{c.id.slice(-6)}</span>
              <span>{c.category}</span>
              <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Unassigned</span>
            </li>
          ))}
      </ul>
    </div>
    {/* Feedback Pending */}
    <div className="bg-white rounded-xl shadow-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <EyeIcon className="w-5 h-5 text-indigo-600" />
        <span className="font-bold text-indigo-700">Feedback Pending</span>
      </div>
      <ul className="space-y-2">
        {feedbackPending.length === 0 ? <li className="text-xs text-gray-400">None</li> :
          feedbackPending.map(c => (
            <li key={c.id} className="flex items-center gap-2 text-xs text-gray-700">
              <span className="font-semibold">#{c.id.slice(-6)}</span>
              <span>{c.category}</span>
              <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Pending</span>
            </li>
          ))}
      </ul>
    </div>
  </div>
);

// Member Assignment Heatmap
const MemberAssignmentHeatmap = ({ members, complaints }) => {
  // Build analytics per member
  const memberStats = members.map(member => {
    const assigned = complaints.filter(c => c.assignedTo && (c.assignedTo._id === member._id || c.assignedTo.id === member._id));
    const resolved = assigned.filter(c => c.currentStatus === 'Resolved');
    const rate = assigned.length ? ((resolved.length / assigned.length) * 100).toFixed(0) : '-';
    return {
      name: member.name,
      category: member.category,
      assigned: assigned.length,
      resolved: resolved.length,
      rate,
    };
  });
  return (
    <div className="bg-white rounded-xl shadow-lg p-4 mb-6 overflow-x-auto">
      <div className="flex items-center gap-2 mb-2">
        <UserGroupIcon className="w-5 h-5 text-green-600" />
        <span className="font-bold text-green-900">Member Assignment Heatmap</span>
      </div>
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-3 py-2 text-left">Name</th>
            <th className="px-3 py-2 text-left">Category</th>
            <th className="px-3 py-2 text-center">Assigned</th>
            <th className="px-3 py-2 text-center">Resolved</th>
            <th className="px-3 py-2 text-center">Resolution Rate</th>
          </tr>
        </thead>
        <tbody>
          {memberStats.map((m, i) => (
            <tr key={i} className="hover:bg-green-50">
              <td className="px-3 py-2 font-medium">{m.name}</td>
              <td className="px-3 py-2">{m.category}</td>
              <td className="px-3 py-2 text-center">{m.assigned}</td>
              <td className="px-3 py-2 text-center">{m.resolved}</td>
              <td className={`px-3 py-2 text-center font-bold ${m.rate === '-' ? 'text-gray-400' : m.rate >= 80 ? 'text-green-600' : m.rate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{m.rate === '-' ? '-' : m.rate + '%'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Real-Time Activity Feed (recent events)
const RealTimeFeed = ({ complaints, announcements, polls }) => {
  // Build a combined feed
  const feed = [
    ...complaints.map(c => ({
      type: 'complaint',
      time: new Date(c.createdAt),
      text: c.title || c.description?.slice(0, 40) || 'Complaint',
      status: c.currentStatus,
      by: c.student?.name,
    })),
    ...announcements.map(a => ({
      type: 'announcement',
      time: new Date(a.createdAt),
      text: a.title,
      by: a.createdBy?.name,
    })),
    ...polls.map(p => ({
      type: 'poll',
      time: new Date(p.createdAt),
      text: p.question,
      status: p.status,
    })),
  ].sort((a, b) => b.time - a.time).slice(0, 10);
  return (
    <div className="bg-white rounded-xl shadow-lg p-4 mb-6 max-h-64 overflow-y-auto">
      <div className="flex items-center gap-2 mb-2">
        <BoltIcon className="w-5 h-5 text-yellow-600" />
        <span className="font-bold text-yellow-900">Real-Time Activity Feed</span>
      </div>
      <ul className="space-y-2">
        {feed.length === 0 && <li className="text-xs text-gray-400">No recent activity</li>}
        {feed.map((item, i) => (
          <li key={i} className="flex items-center gap-2 text-xs text-gray-700">
            <span className={`inline-block w-2 h-2 rounded-full ${item.type === 'complaint' ? 'bg-blue-500' : item.type === 'announcement' ? 'bg-green-500' : 'bg-purple-500'}`}></span>
            <span className="font-semibold">{item.text}</span>
            <span className="text-gray-400">{item.time.toLocaleString()}</span>
            {item.status && <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{item.status}</span>}
            {item.by && <span className="ml-2 text-gray-400">by {item.by}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
};

const DashboardHome = () => {
  const [complaints, setComplaints] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('week');
  const [categoryGraphStartDate, setCategoryGraphStartDate] = useState('');
  const [categoryGraphEndDate, setCategoryGraphEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [announcements, setAnnouncements] = useState([]);
  const [polls, setPolls] = useState([]);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugData, setDebugData] = useState({});
  const [members, setMembers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [complaintsRes, studentCountRes, announcementsRes, pollsRes, membersRes] = await Promise.all([
          api.get('/api/complaints/admin/all'),
          api.get('/api/admin/students/count'),
          api.get('/api/announcements/admin/all'),
          api.get('/api/polls/admin/all'),
          api.get('/api/admin/members'),
        ]);
        
        // Handle complaints response
        let complaintsData;
        if (Array.isArray(complaintsRes.data)) {
          complaintsData = complaintsRes.data;
        } else if (complaintsRes.data.success && Array.isArray(complaintsRes.data.data)) {
          complaintsData = complaintsRes.data.data;
        } else {
          console.error('Invalid complaints data format:', complaintsRes.data);
          complaintsData = [];
        }

        // Handle student count response
        let studentCountData = 0;
        if (studentCountRes.data.success && typeof studentCountRes.data.data?.count === 'number') {
          studentCountData = studentCountRes.data.data.count;
        } else {
          console.error('Invalid student count data format:', studentCountRes.data);
        }

        // Announcements
        let announcementsData = [];
        if (announcementsRes.data.success && Array.isArray(announcementsRes.data.data)) {
          announcementsData = announcementsRes.data.data.slice(0, 3);
        }

        // Polls
        let pollsData = [];
        if (pollsRes.data.success && Array.isArray(pollsRes.data.data)) {
          pollsData = pollsRes.data.data;
        }

        // Members
        let membersData = [];
        if (membersRes.data.success && Array.isArray(membersRes.data.data?.members)) {
          membersData = membersRes.data.data.members;
        }

        // Debug: store raw API data
        setDebugData({
          complaints: complaintsRes.data,
          students: studentCountRes.data,
          announcements: announcementsRes.data,
          polls: pollsRes.data,
          members: membersRes.data
        });

        setComplaints(complaintsData);
        setTotalStudents(studentCountData);
        setAnnouncements(announcementsData);
        setPolls(pollsData);
        setMembers(membersData);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setComplaints([]);
        setTotalStudents(0);
        setAnnouncements([]);
        setPolls([]);
        setMembers([]);
        setDebugData({ error: err.message });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Helper to get start date for week/month
  const getTimeframeStartDate = () => {
    const now = new Date();
    if (timeframe === 'week') {
      const start = new Date(now);
      start.setDate(now.getDate() - 6); // Last 7 days
      return start;
    } else if (timeframe === 'month') {
      const start = new Date(now);
      start.setMonth(now.getMonth() - 1);
      return start;
    }
    return null;
  };

  // Filter complaints by timeframe and date range
  const getFilteredComplaints = () => {
    let filtered = [...complaints];
    const tfStart = getTimeframeStartDate();
    if (tfStart) {
      filtered = filtered.filter(c => new Date(c.createdAt) >= tfStart);
    }
    if (categoryGraphStartDate) {
      const start = new Date(categoryGraphStartDate);
      filtered = filtered.filter(c => new Date(c.createdAt) >= start);
    }
    if (categoryGraphEndDate) {
      const end = new Date(categoryGraphEndDate);
      filtered = filtered.filter(c => new Date(c.createdAt) <= end);
    }
    return filtered;
  };

  // Use filtered complaints everywhere
  const filteredComplaints = getFilteredComplaints();

  // Metrics
  const totalComplaints = filteredComplaints?.length || 0;
  const resolved = filteredComplaints?.filter(c => c.currentStatus === 'Resolved')?.length || 0;
  const pending = filteredComplaints?.filter(c => c.currentStatus !== 'Resolved')?.length || 0;

  // Pie chart data for complaint status
  const statusCounts = filteredComplaints?.reduce((acc, c) => {
    acc[c.currentStatus] = (acc[c.currentStatus] || 0) + 1;
    return acc;
  }, {}) || {};
  const pieData = Object.entries(statusCounts).map(([status, value]) => ({ name: status, value }));

  // Bar chart data (complaints per day)
  const barData = Object.values(
    filteredComplaints?.reduce((acc, c) => {
      const rawDate = new Date(c.createdAt);
      const formattedDate = rawDate.toLocaleDateString();
      if (!acc[formattedDate]) {
        acc[formattedDate] = { date: formattedDate, rawDate, count: 0 };
      }
      acc[formattedDate].count++;
      return acc;
    }, {}) || {}
  );

  // Sort barData by rawDate ascending for the line chart
  const sortedBarData = [...barData].sort((a, b) => a.rawDate - b.rawDate);

  // Normalize category names in reducer
  const categoryData = filteredComplaints?.reduce((acc, c) => {
    let cat = c.category ? String(c.category).trim() : '';
    if (cat === 'Maintenance' && c.subCategory) {
      cat = String(c.subCategory).trim();
    }
    cat = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase(); // Normalize
    if (!cat) cat = 'Uncategorized';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {}) || {};

  const categoryChartData = ALL_CATEGORIES.map(category => ({
    name: category,
    value: categoryData[category] || 0
  }));

  // Response time calculation
  const responseTime = filteredComplaints
    ?.filter(c => c.currentStatus === 'Resolved')
    ?.reduce((acc, c) => {
      const created = new Date(c.createdAt);
      const resolved = new Date(c.resolvedAt);
      return acc + (resolved - created) / (1000 * 60 * 60 * 24); // days
    }, 0) / (resolved || 1) || 0;

  // Monthly trends (filtered)
  const trends = Object.entries(
    filteredComplaints?.reduce((acc, c) => {
      const month = new Date(c.createdAt).toLocaleString('default', { month: 'short' });
      acc[month] = acc[month] || { month, count: 0, resolved: 0 };
      acc[month].count++;
      if (c.currentStatus === 'Resolved') acc[month].resolved++;
      return acc;
    }, {}) || {}
  ).map(([, value]) => value);

  // Get recent complaints (last 3)
  const recentComplaints = filteredComplaints
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);

  // Get pending complaints older than 3 days
  const longPendingComplaints = filteredComplaints
    .filter(c => c.currentStatus !== 'Resolved' && 
      (new Date() - new Date(c.createdAt)) / (1000 * 60 * 60 * 24) > 3)
    .slice(0, 3);

  // For category chart tooltips
  const totalCategoryComplaints = categoryChartData.reduce((sum, d) => sum + d.value, 0);

  // Polls analytics
  const activePolls = polls.filter(p => p.status === 'active');
  const scheduledPolls = polls.filter(p => p.status === 'scheduled');
  const endedPolls = polls.filter(p => p.status === 'ended');
  const latestPoll = polls[0];

  // Calculate additional KPIs
  const inProgress = filteredComplaints.filter(c => c.currentStatus === 'In Progress').length;
  const reopened = filteredComplaints.filter(c => c.isReopened).length;
  const longPending = filteredComplaints.filter(c => c.currentStatus !== 'Resolved' && ((new Date() - new Date(c.createdAt)) / (1000 * 60 * 60 * 24) > 7)).length;
  const avgResolution7 = (() => {
    const last7 = filteredComplaints.filter(c => c.currentStatus === 'Resolved' && (new Date() - new Date(c.resolvedAt)) / (1000 * 60 * 60 * 24) <= 7);
    if (!last7.length) return '-';
    return (last7.reduce((acc, c) => acc + ((new Date(c.resolvedAt) - new Date(c.createdAt)) / (1000 * 60 * 60 * 24)), 0) / last7.length).toFixed(1) + 'd';
  })();
  const avgResolution30 = (() => {
    const last30 = filteredComplaints.filter(c => c.currentStatus === 'Resolved' && (new Date() - new Date(c.resolvedAt)) / (1000 * 60 * 60 * 24) <= 30);
    if (!last30.length) return '-';
    return (last30.reduce((acc, c) => acc + ((new Date(c.resolvedAt) - new Date(c.createdAt)) / (1000 * 60 * 60 * 24)), 0) / last30.length).toFixed(1) + 'd';
  })();

  // --- Data Processing for HotZone ---
  const reopenedComplaints = filteredComplaints.filter(c => c.isReopened);
  const unassignedComplaints = filteredComplaints.filter(c => !c.assignedTo);
  const feedbackPending = filteredComplaints.filter(c => c.currentStatus === 'Resolved' && !c.feedback);

  return (
    <div className="p-2 sm:p-3 md:p-4 mt-12 sm:mt-0 w-full">
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-blue-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className="flex gap-2 bg-white p-2 rounded-lg shadow-sm">
            <button
              onClick={() => setTimeframe('week')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                timeframe === 'week' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setTimeframe('month')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                timeframe === 'month' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Month
            </button>
          </div>
          <div className="flex gap-2">
            <input 
              type="date" 
              value={categoryGraphStartDate}
              onChange={e => setCategoryGraphStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <input 
              type="date" 
              value={categoryGraphEndDate}
              onChange={e => setCategoryGraphEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>
      </div>
      {/* Top KPIs Section (compact) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-4">
        <StatCard icon={ArrowTrendingUpIcon} label="Total Complaints" value={totalComplaints} color="border-blue-500 text-blue-600" animateDelay={0.05} />
        <StatCard icon={ClockIcon} label="In Progress" value={inProgress} color="border-yellow-500 text-yellow-600" animateDelay={0.1} />
        <StatCard icon={CheckCircleIcon} label="Resolved" value={resolved} color="border-green-500 text-green-600" animateDelay={0.15} />
        <StatCard icon={ArrowPathIcon} label="Reopened" value={reopened} color="border-cyan-500 text-cyan-600" animateDelay={0.2} />
        <StatCard icon={UserGroupIcon} label="Avg Resolution (7d/30d)" value={avgResolution7 + ' / ' + avgResolution30} color="border-indigo-500 text-indigo-600" animateDelay={0.25} />
        <StatCard icon={ExclamationTriangleIcon} label="Long Pending (>7d)" value={longPending} color="border-red-500 text-red-600" animateDelay={0.3} />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Analytics Charts */}
          <AnalyticsCharts
            categoryChartData={categoryChartData}
            pieData={pieData}
            trends={trends}
            barData={sortedBarData}
            totalCategoryComplaints={totalCategoryComplaints}
          />

          {/* Hot Zone */}
          <HotZone
            longPendingComplaints={longPendingComplaints}
            reopenedComplaints={reopenedComplaints}
            unassignedComplaints={unassignedComplaints}
            feedbackPending={feedbackPending}
          />

          {/* Recent Activity and Long Pending Complaints Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-lg font-bold text-blue-900 mb-6">Recent Activity</h2>
              <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                {recentComplaints.map((complaint, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        complaint.currentStatus === 'Resolved' ? 'bg-green-100' : 'bg-yellow-100'
                      }`}>
                        <svg className={`w-5 h-5 ${
                          complaint.currentStatus === 'Resolved' ? 'text-green-600' : 'text-yellow-600'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {complaint.title || complaint.description?.slice(0, 40) || 'No Title'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {complaint.student?.name && <>By: {complaint.student.name}</>}
                          {complaint.student?.rollNumber && <> | Roll: {complaint.student.rollNumber}</>}
                          {complaint.student?.roomNumber && <> | Room: {complaint.student.roomNumber}</>}
                        </p>
                        <p className="text-xs text-gray-400">{new Date(complaint.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      complaint.currentStatus === 'Resolved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {complaint.currentStatus}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Long Pending Complaints */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-blue-900">Long Pending Complaints</h2>
                <button className="text-sm text-blue-600 hover:text-blue-800">View All</button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Pending</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 max-h-64 overflow-y-auto block" style={{ display: 'block', maxHeight: '16rem', overflowY: 'auto' }}>
                    {longPendingComplaints.map((complaint, index) => (
                      <tr key={index} className="hover:bg-gray-50" style={{ display: 'table', width: '100%', tableLayout: 'fixed' }}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{complaint._id.slice(-6)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {complaint.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(complaint.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                            {complaint.currentStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {Math.floor((new Date() - new Date(complaint.createdAt)) / (1000 * 60 * 60 * 24))} days
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Recent Announcements Widget */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-blue-100 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-blue-900">Recent Announcements</h2>
                <button
                  className="text-sm text-blue-600 hover:underline"
                  onClick={() => navigate('/admin/announcements')}
                >
                  View All
                </button>
              </div>
              <div className="flex-1 space-y-3">
                {announcements.length === 0 && (
                  <div className="text-gray-400 text-sm">No announcements found.</div>
                )}
                {announcements.map((a, idx) => (
                  <div key={a._id || idx} className="flex items-center gap-3 p-2 rounded hover:bg-blue-50 transition">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800 truncate">{a.title}</div>
                      <div className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Polls Overview Widget */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-blue-100 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-blue-900">Polls Overview</h2>
                <button
                  className="text-sm text-blue-600 hover:underline"
                  onClick={() => navigate('/admin/polls')}
                >
                  View All
                </button>
              </div>
              <div className="flex gap-3 mb-4">
                <div className="flex flex-col items-center flex-1">
                  <span className="text-blue-700 font-bold text-lg">{activePolls.length}</span>
                  <span className="text-xs text-gray-500">Active</span>
                </div>
                <div className="flex flex-col items-center flex-1">
                  <span className="text-yellow-600 font-bold text-lg">{scheduledPolls.length}</span>
                  <span className="text-xs text-gray-500">Scheduled</span>
                </div>
                <div className="flex flex-col items-center flex-1">
                  <span className="text-gray-500 font-bold text-lg">{endedPolls.length}</span>
                  <span className="text-xs text-gray-500">Ended</span>
                </div>
              </div>
              {latestPoll ? (
                <div className="bg-blue-50 rounded-lg p-3 mt-2">
                  <div className="font-medium text-blue-900 truncate">{latestPoll.question}</div>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {latestPoll.options.map((opt, i) => (
                      <span key={i} className="bg-white border border-blue-200 text-xs px-2 py-1 rounded-full text-blue-700 mr-1 mb-1">
                        {opt.text} ({opt.votes})
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Status: <span className={
                      latestPoll.status === 'active' ? 'text-green-700' : latestPoll.status === 'scheduled' ? 'text-yellow-700' : 'text-gray-500'
                    }>{latestPoll.status.charAt(0).toUpperCase() + latestPoll.status.slice(1)}</span>
                    {latestPoll.endTime && (
                      <> | Ends: {new Date(latestPoll.endTime).toLocaleString()}</>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 text-sm mt-2">No polls found.</div>
              )}
            </div>
          </div>

          {/* Member Assignment Heatmap */}
          <MemberAssignmentHeatmap members={members} complaints={complaints} />

          {/* Real-Time Activity Feed */}
          <RealTimeFeed complaints={complaints} announcements={announcements} polls={polls} />
        </div>
      )}

      {/* Debug Output (collapsible) */}
      <div className="mt-8">
        <button
          className="text-xs text-blue-600 underline mb-2"
          onClick={() => setDebugOpen(v => !v)}
        >
          {debugOpen ? 'Hide' : 'Show'} Debug API Data
        </button>
        {debugOpen && (
          <div className="bg-gray-100 rounded p-4 overflow-x-auto text-xs max-h-96">
            <pre>{JSON.stringify(debugData, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardHome;