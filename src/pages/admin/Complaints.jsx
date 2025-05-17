import React, { useEffect, useState } from 'react';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { FunnelIcon, XMarkIcon, ClockIcon, UserIcon, CheckCircleIcon, ExclamationCircleIcon, ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';

const STATUS_OPTIONS = ['All', 'Received', 'Pending', 'In Progress', 'Resolved'];

const STATUS_COLORS = {
  'Received': 'bg-blue-100 text-blue-800',
  'Pending': 'bg-yellow-100 text-yellow-800',
  'In Progress': 'bg-purple-100 text-purple-800',
  'Resolved': 'bg-green-300 text-green-800'
};

const Complaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [members, setMembers] = useState({});
  const [selectedMember, setSelectedMember] = useState('');

  // Filters
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterStudent, setFilterStudent] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const complaintsPerPage = 10;

  useEffect(() => {
    fetchComplaints();
    fetchMembers();
  }, []);

  const fetchComplaints = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/complaints/admin/all');
      console.log('Complaints response:', res.data);
      
      // Handle both response formats
      let complaintsData;
      if (Array.isArray(res.data)) {
        complaintsData = res.data;
      } else if (res.data.success && Array.isArray(res.data.data)) {
        complaintsData = res.data.data;
      } else {
        console.error('Invalid complaints data format:', res.data);
        setError('Received invalid data format from server');
        return;
      }

      // Sort complaints by date (newest first)
      complaintsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setComplaints(complaintsData);
    } catch (err) {
      console.error('Error fetching complaints:', err);
      setError('Failed to fetch complaints');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      // Updated API endpoint for members
      const res = await api.get('/api/admin/members');
      console.log('Members response:', res.data);
      
      if (res.data.success) {
        // Group members by category
        const groupedMembers = res.data.data.members.reduce((acc, member) => {
          if (!acc[member.category]) {
            acc[member.category] = [];
          }
          acc[member.category].push(member);
          return acc;
        }, {});
        setMembers(groupedMembers);
      } else {
        console.error('Invalid members data format:', res.data);
        toast.error('Failed to load members data');
      }
    } catch (err) {
      console.error('Error fetching members:', err);
      if (err.response?.status === 404) {
        console.log('Members endpoint not found, using empty members list');
        setMembers({});
      } else {
        toast.error('Failed to fetch members');
      }
    }
  };

  const openDetails = async complaint => {
    // Improved complaint validation
    if (!complaint || typeof complaint !== 'object') {
      console.error('Invalid complaint object:', complaint);
      toast.error('Invalid complaint data');
      return;
    }

    // Log the full complaint object for debugging
    console.log('Full complaint object:', JSON.stringify(complaint, null, 2));

    // Use student field as ID if _id is not available
    const complaintId = complaint._id || complaint.id || complaint.student?._id;
    if (!complaintId) {
      console.error('Complaint missing ID:', complaint);
      toast.error('Invalid complaint data');
      return;
    }

    console.log('Using complaint ID:', complaintId);
    setSelected(complaint);
    setStatus(complaint.currentStatus || 'Received');
    setNote('');
    setSelectedMember(complaint.assignedTo?._id || '');
    setTimeline([]);
    setTimelineLoading(true);

    try {
      console.log('Fetching timeline for complaint:', complaintId);
      const res = await api.get(`/api/complaints/admin/${complaintId}/timeline`);
      console.log('Timeline response:', res.data);
      
      // Handle both response formats for timeline
      let timelineData;
      if (Array.isArray(res.data)) {
        timelineData = res.data;
      } else if (res.data?.success && Array.isArray(res.data.data)) {
        timelineData = res.data.data;
      } else if (res.data?.success && Array.isArray(res.data.data?.timeline)) {
        timelineData = res.data.data.timeline;
      } else {
        console.error('Invalid timeline data format:', res.data);
        // Create initial timeline entry
        timelineData = [{
          status: complaint.currentStatus,
          timestamp: complaint.createdAt,
          note: 'Complaint created'
        }];
      }

      // Ensure we have at least one timeline entry
      if (!timelineData || timelineData.length === 0) {
        timelineData = [{
          status: complaint.currentStatus,
          timestamp: complaint.createdAt,
          note: 'Complaint created'
        }];
      }
      
      // Sort timeline by date (oldest first)
      timelineData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      setTimeline(timelineData);
    } catch (err) {
      console.error('Error fetching timeline:', err);
      console.error('Error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
      // Create initial timeline entry on error
      setTimeline([{
        status: complaint.currentStatus,
        timestamp: complaint.createdAt,
        note: 'Complaint created'
      }]);
      
      if (err.response?.status !== 404) {
        toast.error('Failed to load complaint timeline. Showing initial status.');
      }
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleStatusUpdate = async e => {
    e.preventDefault();
    if (!selected) {
      toast.error('No complaint selected');
      return;
    }

    const complaintId = selected._id || selected.id;
    if (!complaintId) {
      console.error('Invalid complaint ID for update:', selected);
      toast.error('Invalid complaint data for update');
      return;
    }

    const payload = {
      status,
      note,
      memberId: selectedMember || null
    };

    console.log('--- Attempting to update complaint status ---');
    console.log('Complaint ID:', complaintId);
    console.log('Payload being sent:', JSON.stringify(payload, null, 2));
    console.log('Selected Complaint Category:', selected?.category);
    console.log('Selected Complaint SubCategory:', selected?.subCategory);
    // Find the actual member object to log their category
    let actualMemberCategory = 'N/A';
    if (selectedMember && members && typeof members === 'object') {
      for (const categoryKey in members) {
        const foundMember = members[categoryKey].find(m => m._id === selectedMember);
        if (foundMember) {
          actualMemberCategory = foundMember.category;
          break;
        }
      }
    }
    console.log('Selected Member ID:', selectedMember);
    console.log("Selected Member's Actual Category:", actualMemberCategory);

    setUpdating(true);
    try {
      const statusRes = await api.put(`/api/complaints/admin/${complaintId}/status`, payload);

      console.log('Status update response:', statusRes.data);

      if (statusRes.data.success) {
        toast.success('Status updated successfully');
        // Refresh the complaints list
        await fetchComplaints();
        // Close the modal
        setSelected(null);
      } else {
        throw new Error(statusRes.data.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error updating complaint:', err);
      console.error('Error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
      
      // Show more specific error message
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update complaint status';
      toast.error(errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  // Filter logic
  const filteredComplaints = complaints.filter(c => {
    // Status
    if (filterStatus !== 'All' && c.currentStatus !== filterStatus) return false;
    // Category
    if (filterCategory !== 'All' && c.category !== filterCategory) return false;
    // Date range
    const created = new Date(c.createdAt);
    if (filterFrom && created < new Date(filterFrom)) return false;
    if (filterTo && created > new Date(filterTo + 'T23:59:59')) return false;
    // Student search
    if (filterStudent) {
      const search = filterStudent.toLowerCase();
      const name = c.student?.name?.toLowerCase() || '';
      const roll = c.student?.rollNumber?.toLowerCase() || '';
      if (!name.includes(search) && !roll.includes(search)) return false;
    }
    return true;
  });

  // Pagination logic
  const indexOfLastComplaint = currentPage * complaintsPerPage;
  const indexOfFirstComplaint = indexOfLastComplaint - complaintsPerPage;
  const currentComplaints = filteredComplaints.slice(indexOfFirstComplaint, indexOfLastComplaint);
  const totalPages = Math.ceil(filteredComplaints.length / complaintsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [filterStatus, filterCategory, filterFrom, filterTo, filterStudent]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto mt-16 sm:mt-0">
      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-blue-900">Complaint Management</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Manage and track all student complaints</p>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-xs sm:text-sm text-gray-600 bg-gray-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg">
              Total: <span className="font-semibold text-gray-900">{filteredComplaints.length}</span> complaints
            </div>
          </div>
        </div>
      </div>

      {/* Pending/Received Requests Section */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
            <span className="text-sm sm:text-base font-semibold text-gray-900">Pending & Received Requests</span>
          </div>
          <div className="text-xs sm:text-sm text-gray-600 bg-yellow-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg">
            {complaints.filter(c => c.currentStatus === 'Pending' || c.currentStatus === 'Received').length} requests
          </div>
        </div>

        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Student</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {complaints
                  .filter(c => c.currentStatus === 'Pending' || c.currentStatus === 'Received')
                  .slice(0, 5)
                  .map((c, index) => {
                    const complaintKey = `${c._id || c.student?._id || 'unknown'}-${index}`;
                    return (
                      <tr key={complaintKey} className="hover:bg-gray-50 transition-colors duration-200">
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div className="flex items-center gap-2">
                            <span className="px-2 sm:px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                              {c.category || 'Uncategorized'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 bg-gray-100 rounded-full flex items-center justify-center">
                              <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{c.student?.name || 'Unknown'}</div>
                              <div className="text-xs sm:text-sm text-gray-500">Roll No: {c.student?.rollNumber || 'N/A'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[c.currentStatus] || STATUS_COLORS['Received']}`}>
                            {c.currentStatus || 'Received'}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <button 
                            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 text-blue-600 hover:bg-blue-50"
                            onClick={() => openDetails(c)}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
        {complaints.filter(c => c.currentStatus === 'Pending' || c.currentStatus === 'Received').length === 0 && (
          <div className="text-center py-6 sm:py-8">
            <p className="text-sm sm:text-base text-gray-500">No pending or received requests</p>
          </div>
        )}
      </div>

      {/* All Requests Section */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            <span className="text-sm sm:text-base font-semibold text-gray-900">All Requests</span>
          </div>
          <div className="text-xs sm:text-sm text-gray-600 bg-gray-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg">
            Showing <span className="font-semibold text-gray-900">{indexOfFirstComplaint + 1}-{Math.min(indexOfLastComplaint, filteredComplaints.length)}</span> of {filteredComplaints.length}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Status</label>
            <select 
              className="w-full px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 bg-white"
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Category</label>
            <select
              className="w-full px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 bg-white"
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
            >
              {['All', 'Canteen', 'Maintenance', 'Internet', 'Others'].map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">From Date</label>
            <input 
              type="date" 
              value={filterFrom} 
              onChange={e => setFilterFrom(e.target.value)} 
              className="w-full px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">To Date</label>
            <input 
              type="date" 
              value={filterTo} 
              onChange={e => setFilterTo(e.target.value)} 
              className="w-full px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Search Student</label>
            <input 
              type="text" 
              value={filterStudent} 
              onChange={e => setFilterStudent(e.target.value)}
              placeholder="Name or Roll No"
              className="w-full px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
            />
          </div>
        </div>

        <div className="flex justify-end mb-4 sm:mb-6">
          <button 
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-600 hover:text-red-600 flex items-center gap-1 sm:gap-2 rounded-lg hover:bg-gray-50 transition-all duration-200"
            onClick={() => { 
              setFilterStatus('All'); 
              setFilterCategory('All');
              setFilterFrom(''); 
              setFilterTo(''); 
              setFilterStudent(''); 
            }}
          >
            <XMarkIcon className="w-3 h-3 sm:w-4 sm:h-4" />
            Clear Filters
          </button>
      </div>

        {error ? (
          <div className="text-center py-3 sm:py-4 text-sm sm:text-base text-red-600 bg-red-50 rounded-lg">{error}</div>
      ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-200">
              <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Student</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                {currentComplaints.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 sm:py-12">
                        <div className="flex flex-col items-center gap-2">
                          <div className="text-gray-400">
                            <svg className="w-10 h-10 sm:w-12 sm:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <p className="text-sm sm:text-base text-gray-500 font-medium">No complaints found</p>
                          <p className="text-xs sm:text-sm text-gray-400">Try adjusting your filters</p>
                        </div>
                    </td>
                  </tr>
                  ) : (
                    currentComplaints.map((c, index) => {
                  const complaintKey = `${c._id || c.student?._id || 'unknown'}-${index}`;
                  const isLocked = c.isLockedForUpdates === true;
                  return (
                    <tr key={complaintKey} className={`hover:bg-gray-50 transition-colors duration-200 ${isLocked ? 'opacity-70' : ''}`}>
                          <td className="px-3 sm:px-6 py-3 sm:py-4">
                            <div className="flex items-center gap-2">
                              <span className="px-2 sm:px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                          {c.category || 'Uncategorized'}
                        </span>
                        {isLocked && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                            Locked
                          </span>
                        )}
                            </div>
                      </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 bg-gray-100 rounded-full flex items-center justify-center">
                                <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                        </div>
                          <div>
                                <div className="text-sm font-medium text-gray-900">{c.student?.name || 'Unknown'}</div>
                                <div className="text-xs sm:text-sm text-gray-500">Roll No: {c.student?.rollNumber || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4">
                            <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[c.currentStatus] || STATUS_COLORS['Received']}`}>
                          {c.currentStatus || 'Received'}
                        </span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <button 
                              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 text-blue-600 hover:bg-blue-50"
                          onClick={() => openDetails(c)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                    })
                  )}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {/* Pagination */}
          {filteredComplaints.length > complaintsPerPage && (
          <div className="px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-t border-gray-200 bg-gray-50 mt-4 sm:mt-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                className={`relative inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg
                    ${currentPage === 1 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : 'text-blue-600 hover:bg-blue-50'
                    }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                className={`relative inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg
                    ${currentPage === totalPages 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : 'text-blue-600 hover:bg-blue-50'
                    }`}
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                <p className="text-xs sm:text-sm text-gray-700">
                    Showing <span className="font-medium">{indexOfFirstComplaint + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(indexOfLastComplaint, filteredComplaints.length)}</span> of{' '}
                    <span className="font-medium">{filteredComplaints.length}</span> complaints
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg
                      ${currentPage === 1 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-blue-600 hover:bg-blue-50'
                      }`}
                  >
                  <ChevronLeftIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-1" />
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  className={`relative inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg
                      ${currentPage === totalPages 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-blue-600 hover:bg-blue-50'
                      }`}
                  >
                    Next
                  <ChevronRightIcon className="h-4 w-4 sm:h-5 sm:w-5 ml-1" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      {/* Enhanced Details Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 w-full max-w-2xl relative animate-fade-in-up max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-3 sm:top-4 right-3 sm:right-4 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors duration-200"
              onClick={() => setSelected(null)}
              disabled={updating}
            >
              <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <div className="mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-2xl font-bold text-gray-800 mb-2">{selected.title}</h2>
              <p className="text-sm sm:text-base text-gray-600">{selected.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                  <span className="text-sm sm:text-base font-medium text-gray-700">Student Details</span>
                </div>
                <p className="text-sm sm:text-base text-gray-600">{selected.student?.name}</p>
                <p className="text-xs sm:text-sm text-gray-500">Roll No: {selected.student?.rollNumber}</p>
                {selected.student?.phone && (
                  <p className="text-xs sm:text-sm text-gray-500">Phone: {selected.student.phone}</p>
                )}
              </div>

              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                  <span className="text-sm sm:text-base font-medium text-gray-700">Status Information</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selected.currentStatus]}`}>
                    {selected.currentStatus}
                  </span>
                  {selected.isReopened && (
                    <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Reopened
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircleIcon className="w-5 h-5 text-gray-500" />
                <span className="font-medium text-gray-700">Feedback</span>
              </div>
              {selected.feedback ? (
                <div className={`flex items-center gap-2 ${
                  selected.feedback.isSatisfied ? 'text-green-600' : 'text-red-600'
                }`}>
                  {selected.feedback.isSatisfied ? (
                    <CheckCircleIcon className="w-5 h-5" />
                  ) : (
                    <ExclamationCircleIcon className="w-5 h-5" />
                  )}
                  {selected.feedback.isSatisfied ? 'Satisfied' : 'Not Satisfied'}
                </div>
              ) : (
                <p className="text-gray-500">No feedback provided yet</p>
              )}
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <ClockIcon className="w-5 h-5 text-gray-500" />
                <span className="font-medium text-gray-700">Timeline</span>
              </div>
              {timelineLoading ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner size="sm" />
                </div>
              ) : (
                <div className="space-y-4">
                  {timeline.map((t, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-2 h-2 mt-2 rounded-full bg-blue-600 relative">
                        {i !== timeline.length - 1 && (
                          <div className="absolute top-2 left-1/2 w-px h-full bg-gray-200 -translate-x-1/2"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status]}`}>
                            {t.status}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(t.timestamp).toLocaleString()}
                          </span>
                          {t.assignedTo && (
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <UserIcon className="w-4 h-4" />
                              <span>Assigned to: {t.assignedTo.name}</span>
                              <span className="text-xs text-gray-500">({t.assignedTo.category})</span>
                            </div>
                          )}
                        </div>
                        {t.note && (
                          <p className="mt-1 text-sm text-gray-600">{t.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Conditionally render update form or locked message */}
            {selected.isLockedForUpdates ? (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                <p className="text-yellow-700 font-medium">
                  This complaint has been locked after student satisfaction and can no longer be updated.
                </p>
              </div>
            ) : (
              <form className="space-y-4 mt-6 border-t pt-6" onSubmit={handleStatusUpdate}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Update Status</label>
                  <select 
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                    value={status} 
                    onChange={e => setStatus(e.target.value)} 
                    required
                  >
                    {STATUS_OPTIONS.filter(opt => opt !== 'All').map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* Member Assignment */}
                {status === 'In Progress' && (
                  (() => {
                    const complaintCategory = selected?.category;
                    const complaintSubCategory = selected?.subCategory;
                    let categoryToFilterBy = complaintCategory;

                    if (complaintCategory === 'Maintenance' && complaintSubCategory) {
                      categoryToFilterBy = complaintSubCategory;
                    }

                    const availableMembersForCategory = categoryToFilterBy ? members[categoryToFilterBy] : undefined;
                    
                    console.log('--- Member Dropdown Debug --- stereotypical ');
                    console.log('Selected Complaint Object:', selected);
                    console.log('Selected Complaint Category (raw):', complaintCategory);
                    console.log('Selected Complaint SubCategory (raw):', complaintSubCategory);
                    console.log('Category being used for member filtering:', categoryToFilterBy);
                    console.log('Full Members Object (grouped by category):', members);
                    console.log('Available Members for this Category (' + categoryToFilterBy + '):', availableMembersForCategory);
                    if (availableMembersForCategory && availableMembersForCategory.length > 0) {
                      console.log('Structure of the FIRST available member:', JSON.stringify(availableMembersForCategory[0], null, 2));
                    }

                    return (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Assign Member</label>
                        <select
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                          value={selectedMember}
                          onChange={e => {
                            const selectedOption = e.target.options[e.target.selectedIndex];
                            console.log('Member dropdown onChange - e.target.value:', e.target.value);
                            console.log('Member dropdown onChange - selectedOption.value:', selectedOption.value);
                            console.log('Member dropdown onChange - selectedOption.text:', selectedOption.text);
                            setSelectedMember(e.target.value);
                          }}
                          required={status === 'In Progress'}
                        >
                          <option value="">Select a member</option>
                          {availableMembersForCategory?.map(member => (
                            <option key={member.id} value={member.id}>
                              {member.name} ({member.category}) {/* Displaying member's actual category for clarity */}
                            </option>
                          ))}
                        </select>
                        {(!availableMembersForCategory || availableMembersForCategory.length === 0) && (
                          <p className="mt-1 text-sm text-gray-500">
                            No members available for this category ({categoryToFilterBy || 'Unknown/Invalid Category'})
                          </p>
                        )}
                      </div>
                    );
                  })()
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Add Note (Optional)</label>
                  <input 
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                    placeholder="Enter a note about this status update"
                    value={note} 
                    onChange={e => setNote(e.target.value)}
                  />
                </div>

                <button 
                  className={`w-full py-2 px-4 rounded-lg text-white font-medium transition-all duration-200 ${
                    updating 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                  }`} 
                  type="submit" 
                  disabled={updating || (status === 'In Progress' && !selectedMember)}
                >
                  {updating ? (
                    <div className="flex items-center justify-center gap-2">
                      <LoadingSpinner size="sm" className="border-white" />
                      <span>Updating...</span>
                    </div>
                  ) : (
                    'Update Status'
                  )}
                </button>
              </form>
            )}
            {/* End of conditional rendering */}

          </div>
        </div>
      )}
    </div>
  );
};

export default Complaints;