import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from '../../components/LoadingSpinner';
import {jsPDF} from 'jspdf';
import { UserIcon, CheckCircleIcon, ClockIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

const TimelineItem = ({ status, timestamp, note, assignedTo, isLast }) => (
  <div className="relative flex gap-3">
    {/* Timeline line */}
    <div className="flex flex-col items-center">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
        status === 'Resolved' ? 'bg-green-100 text-green-600' :
        status === 'In Progress' ? 'bg-blue-100 text-blue-600' :
        status === 'Pending' ? 'bg-yellow-100 text-yellow-600' :
        'bg-gray-100 text-gray-600'
      }`}>
        {status === 'Resolved' ? (
          <CheckCircleIcon className="w-4 h-4" />
        ) : status === 'In Progress' ? (
          <ClockIcon className="w-4 h-4" />
        ) : status === 'Pending' ? (
          <ExclamationCircleIcon className="w-4 h-4" />
        ) : (
          <UserIcon className="w-4 h-4" />
        )}
      </div>
      {!isLast && (
        <div className="w-0.5 h-full bg-gray-200 my-1" />
      )}
    </div>

    {/* Content */}
    <div className="flex-1 pb-4">
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3">
        <div className="flex items-center justify-between mb-1">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            status === 'Resolved' ? 'bg-green-100 text-green-800' :
            status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
            status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {status}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(timestamp).toLocaleString()}
          </span>
        </div>
        <p className="text-sm text-gray-700 mb-1">{note}</p>
        {assignedTo && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <UserIcon className="w-3 h-3" />
            <span>Assigned to: {assignedTo.name}</span>
          </div>
        )}
      </div>
    </div>
  </div>
);

const MyComplaints = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Add event listener for complaint submission
  useEffect(() => {
    const handleComplaintSubmitted = () => {
      console.log('Complaint submitted event received, refreshing complaints...');
      fetchComplaints();
    };

    window.addEventListener('complaint-submitted', handleComplaintSubmitted);
    return () => {
      window.removeEventListener('complaint-submitted', handleComplaintSubmitted);
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    if (user) {
      console.log('Initial fetch of complaints for user:', user);
      fetchComplaints();
    }
  }, [user]);

  const fetchComplaints = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching complaints...');
      const res = await api.get('/api/complaints/my');
      console.log('Complaints response:', res.data);
      
      // Handle the new response format
      let complaintsData;
      if (res.data?.success && res.data.data?.complaints) {
        complaintsData = res.data.data.complaints;
      } else if (Array.isArray(res.data)) {
        // Fallback for old format
        complaintsData = res.data;
      } else {
        console.error('Invalid complaints data format:', res.data);
        setError('Received invalid data format from server');
        return;
      }

      // Log sample complaint data for debugging
      if (complaintsData.length > 0) {
        console.log('Sample complaint data:', {
          id: complaintsData[0]._id,
          title: complaintsData[0].title,
          hasAssignedTo: !!complaintsData[0].assignedTo,
          assignedToDetails: complaintsData[0].assignedTo
        });
      }

      // Sort complaints by date (newest first)
      complaintsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setComplaints(complaintsData);
      
    } catch (err) {
      console.error('Error fetching complaints:', err);
      if (err.response?.status === 401) {
        toast.error('Your session has expired. Please log in again.');
      } else {
        setError('Failed to fetch complaints. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const openDetails = async complaint => {
    if (!complaint || typeof complaint !== 'object') {
      console.error('Invalid complaint object:', complaint);
      toast.error('Invalid complaint data');
      return;
    }

    console.log('Opening complaint details:', {
      id: complaint._id,
      title: complaint.title,
      hasAssignedTo: !!complaint.assignedTo,
      assignedToDetails: complaint.assignedTo
    });

    const complaintId = complaint._id;
    if (!complaintId) {
      console.error('Complaint missing ID:', complaint);
      toast.error('Invalid complaint data');
      return;
    }

    // Set the selected complaint with the data we already have
    setSelected(complaint);
    setTimeline([]);
    setTimelineLoading(true);
    setFeedback('');
    setFeedbackComment('');

    try {
      // Fetch timeline data
      console.log('Fetching timeline for complaint:', complaintId);
      const res = await api.get(`/api/complaints/${complaintId}/timeline`);
      console.log('Timeline response:', res.data);
      
      if (res.data?.success && res.data.data) {
        const { timeline: timelineData, currentAssignedTo } = res.data.data;
        
        // Update the selected complaint with the current assigned member if different
        if (currentAssignedTo && 
            (!complaint.assignedTo || 
             currentAssignedTo._id !== complaint.assignedTo._id)) {
          setSelected(prev => ({
            ...prev,
            assignedTo: currentAssignedTo
          }));
        }

        // Sort timeline by date (oldest first)
        const sortedTimeline = timelineData.sort((a, b) => 
          new Date(a.timestamp) - new Date(b.timestamp)
        );
        
        setTimeline(sortedTimeline);
      } else {
        console.error('Invalid timeline data format:', res.data);
        setTimeline([{
          status: complaint.currentStatus,
          timestamp: complaint.createdAt || new Date().toISOString(),
          note: 'Complaint created',
          assignedTo: complaint.assignedTo
        }]);
      }
    } catch (err) {
      console.error('Error fetching timeline:', err);
      setTimeline([{
        status: complaint.currentStatus,
        timestamp: complaint.createdAt || new Date().toISOString(),
        note: 'Complaint created',
        assignedTo: complaint.assignedTo
      }]);
      
      if (err.response?.status !== 404) {
        toast.error('Failed to load complaint timeline. Showing initial status.');
      }
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleFeedback = async e => {
    console.log('handleFeedback triggered. Current submittingFeedback state:', submittingFeedback);
    e.preventDefault();
    if (!selected) {
      console.log('handleFeedback: No complaint selected, exiting.');
      return;
    }
    if (submittingFeedback) {
      console.log('handleFeedback: Already submitting feedback, exiting to prevent double submission.');
      return;
    }
    
    setSubmittingFeedback(true);
    try {
      const res = await api.post(`/api/complaints/${selected._id}/feedback`, {
        isSatisfied: feedback === 'satisfied',
        comment: feedbackComment
      });
      
      if (res.data.success) {
        toast.success('Feedback submitted successfully');
        setSelected(null);
        fetchComplaints();
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
      if (err.response?.status === 401) {
        toast.error('Your session has expired. Please log in again.');
        navigate('/login');
      } else {
        toast.error(err.response?.data?.message || 'Failed to submit feedback. Please try again.');
      }
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleDownload = () => {
    if (!selected) return;

    try {
      // Initialize PDF document
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      
      // Set fonts and colors
      doc.setFont("helvetica");
      doc.setTextColor(59, 130, 246); // Blue color
      
      // Simple header
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Complaint Details", margin, 20);
      
      // Add date
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - margin - 40, 20);
      
      // Add a line separator
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, 25, pageWidth - margin, 25);
      
      // Content starts here
      let y = 35;
      
      // Student Details Section
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(59, 130, 246); // Blue
      doc.text("Student Details", margin, y);
      y += 7;
      
      // Get student details
      const studentName = selected.student?.name || 'N/A';
      const studentRoll = selected.student?.rollNumber || selected.student?.roll || 'N/A';
      
      
      // Display student details
      doc.text(`Name: ${studentName}`, margin, y);
      y += 5;
      doc.text(`Roll Number: ${studentRoll}`, margin, y);
      y += 5;
      
      
      // Status badge
      const statusColor = selected.currentStatus === 'Resolved' ? [34, 197, 94] : // green
                         selected.currentStatus === 'In Progress' ? [59, 130, 246] : // blue
                         [234, 179, 8]; // yellow
      doc.setFillColor(statusColor[0], statusColor[1], statusColor[2], 0.1);
      doc.roundedRect(margin, y, 60, 8, 2, 2, "F");
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.setFont("helvetica", "bold");
      doc.text(selected.currentStatus, margin + 5, y + 6);
      
      y += 15;
      
      // Category and Sub-category
      doc.setTextColor(59, 130, 246); // Blue
      doc.setFont("helvetica", "bold");
      doc.text("Category:", margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(selected.category, margin + 25, y);
      
      if (selected.subCategory) {
        y += 7;
        doc.setFont("helvetica", "bold");
        doc.text("Sub-Category:", margin, y);
        doc.setFont("helvetica", "normal");
        doc.text(selected.subCategory, margin + 30, y);
      }
      
      y += 12;
      
      // Description
      doc.setFont("helvetica", "bold");
      doc.text("Description:", margin, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      const splitDescription = doc.splitTextToSize(selected.description, contentWidth);
      doc.text(splitDescription, margin, y);
      y += splitDescription.length * 5 + 10;
      
      // Timeline section
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Status Timeline", margin, y);
      y += 8;
      
      // Draw timeline line
      const timelineStartY = y;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin + 4, timelineStartY, margin + 4, 250);
      
      doc.setFontSize(9);
      timeline.forEach((item, index) => {
        // Status icon
        const iconColor = item.status === 'Resolved' ? [34, 197, 94] : // green
                         item.status === 'In Progress' ? [59, 130, 246] : // blue
                         [234, 179, 8]; // yellow
        doc.setFillColor(iconColor[0], iconColor[1], iconColor[2], 0.1);
        doc.circle(margin + 4, y, 2, "F");
        
        // Status and timestamp
        doc.setFont("helvetica", "bold");
        doc.setTextColor(iconColor[0], iconColor[1], iconColor[2]);
        doc.text(item.status, margin + 10, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(new Date(item.timestamp).toLocaleString(), margin + 45, y);
        y += 5;
        
        // Note
        doc.setTextColor(59, 130, 246); // Blue
        const splitNote = doc.splitTextToSize(item.note, contentWidth - 15);
        doc.text(splitNote, margin + 10, y);
        y += splitNote.length * 4 + 3;
        
        // Assigned to if exists
        if (item.assignedTo) {
          doc.setTextColor(100, 100, 100);
          doc.text(`Assigned to: ${item.assignedTo.name}`, margin + 10, y);
          y += 4;
        }
        
        y += 5; // Space between timeline items
      });
      
      // Save the PDF
      doc.save(`complaint-${selected._id}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please log in to view your complaints.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 mt-12 sm:mt-0">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl shadow-lg shadow-blue-100">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">
            My Complaints
          </h2>
          <p className="text-gray-600 text-sm mt-1">Track and manage your submitted complaints</p>
        </div>
        </div>

      {error ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 flex items-center gap-3 shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </motion.div>
      ) : complaints.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-xl shadow-md p-8 text-center max-w-md mx-auto"
        >
          <div className="w-16 h-16 mx-auto mb-4 text-blue-800">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">No complaints found</h3>
          <p className="text-gray-500">You haven't submitted any complaints yet.</p>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {complaints.map((c, index) => (
            <motion.div
              key={c._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -5 }}
              className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-blue-900 text-lg line-clamp-2">{c.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                        {c.category}
                      </span>
                      {c.subCategory && (
                        <span className="px-2 py-1 bg-cyan-50 text-cyan-700 rounded-full text-xs font-medium">
                          {c.subCategory}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    c.currentStatus === 'Resolved' ? 'bg-green-100 text-green-800' :
                    c.currentStatus === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {c.currentStatus}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {new Date(c.createdAt).toLocaleDateString()}
                </div>

                {c.assignedTo && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                    <UserIcon className="w-4 h-4" />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <span>Assigned to: {c.assignedTo.name}</span>
                        <span className="text-xs text-gray-500">({c.assignedTo.category})</span>
                      </div>
                      {c.assignedTo.phone && (
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {c.assignedTo.phone}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <p className="text-gray-600 text-sm line-clamp-3 mb-4">{c.description}</p>

                <div className="flex justify-between items-center">
                  {c.feedback && (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      c.feedback.isSatisfied ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {c.feedback.isSatisfied ? 'Satisfied' : 'Not Satisfied'}
                    </span>
                  )}
                  
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => openDetails(c)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    View Details
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Details Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ 
                duration: 0.3, 
                ease: "easeOut",
                opacity: { duration: 0.2 },
              }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-100"
              style={{ 
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" 
              }}
            >
              <div className="relative">
                <div className="absolute right-0 top-0 flex items-center">
                  {/* Download Button */}
                  <button
                    className="p-2 text-gray-400 hover:text-blue-600 transition-all duration-200"
                    onClick={handleDownload}
                    title="Download Details as PDF"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  {/* Close Button */}
                  <div className="border-l border-gray-200">
                    <button
                      className="p-2 text-gray-400 hover:text-red-600 transition-all duration-200"
                      onClick={() => setSelected(null)}
                      disabled={submittingFeedback}
                      title="Close"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">{selected.title}</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-1 sm:mb-2">
                        <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                        <span className="font-medium text-gray-700 text-sm sm:text-base">Student Details</span>
                      </div>
                      <p className="text-gray-600 text-sm">{selected.student?.name}</p>
                      <p className="text-xs sm:text-sm text-gray-500">Roll No: {selected.student?.rollNumber || selected.student?.roll || 'N/A'}</p>
                    </div>

                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-1 sm:mb-2">
                        <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                        <span className="font-medium text-gray-700 text-sm sm:text-base">Status Information</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        selected.currentStatus === 'Resolved' ? 'bg-green-100 text-green-800' :
                        selected.currentStatus === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                          selected.currentStatus === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                      }`}>
                        {selected.currentStatus}
                      </span>
                        {selected.isReopened && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Reopened
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-4 sm:mb-6">
                    <h4 className="font-medium text-gray-900 text-sm sm:text-base mb-2">Description</h4>
                    <p className="text-gray-600 bg-gray-50 p-3 sm:p-4 rounded-lg text-sm">{selected.description}</p>
                  </div>

                  <div className="mb-4 sm:mb-6">
                    <h4 className="font-medium text-gray-900 text-sm sm:text-base mb-3 sm:mb-4">Timeline</h4>
                    <div className="space-y-3 sm:space-y-4">
                      {timelineLoading ? (
                        <div className="flex justify-center py-4">
                          <LoadingSpinner size="md" />
                        </div>
                      ) : timeline.length > 0 ? (
                        timeline.map((item, index) => (
                          <TimelineItem
                            key={item.timestamp}
                            {...item}
                            isLast={index === timeline.length - 1}
                          />
                        ))
                      ) : (
                        <p className="text-gray-500 text-center py-4 text-sm">No timeline data available</p>
                          )}
                    </div>
                  </div>

                  {/* Feedback Section */}
                  {selected.currentStatus === 'Resolved' && !selected.feedback && (
                    <div className="border-t border-gray-100 pt-4 sm:pt-6">
                      <div className="font-medium text-blue-900 text-sm sm:text-base mb-3">Provide Feedback</div>
                      <div className="flex gap-3 sm:gap-4 mb-3 sm:mb-4">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setFeedback('satisfied')}
                          className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded-lg border text-sm ${
                            feedback === 'satisfied'
                              ? 'bg-green-50 border-green-200 text-green-700 shadow-inner'
                              : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                          } transition-all`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                            </svg>
                            Satisfied
                          </div>
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setFeedback('not-satisfied')}
                          className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded-lg border text-sm ${
                            feedback === 'not-satisfied'
                              ? 'bg-red-50 border-red-200 text-red-700 shadow-inner'
                              : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                          } transition-all`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                            </svg>
                            Not Satisfied
                          </div>
                        </motion.button>
                      </div>
                      {feedback && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-3"
                        >
                          <textarea
                            value={feedbackComment}
                            onChange={e => setFeedbackComment(e.target.value)}
                            placeholder="Additional comments (optional)"
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm text-sm"
                            rows="3"
                          />
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleFeedback}
                            disabled={submittingFeedback}
                            className={`w-full py-2 sm:py-3 px-4 sm:px-6 rounded-lg font-medium text-white text-sm transition-all duration-300 shadow-md ${
                              submittingFeedback 
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600'
                            }`}
                          >
                            {submittingFeedback ? (
                              <div className="flex items-center justify-center gap-2">
                                <LoadingSpinner size="sm" className="border-white" />
                                <span>Submitting...</span>
                              </div>
                            ) : (
                              'Submit Feedback'
                            )}
                          </motion.button>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyComplaints;