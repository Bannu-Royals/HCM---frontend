import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { UserPlusIcon, TableCellsIcon, ArrowUpTrayIcon, PencilSquareIcon, TrashIcon, MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';

// Course and branch mappings
const COURSES = {
  'B.Tech': 'BTECH',
  'Diploma': 'DIPLOMA',
  'Pharmacy': 'PHARMACY',
  'Degree': 'DEGREE'
};

const BRANCHES = {
  BTECH: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL'],
  DIPLOMA: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL'],
  PHARMACY: ['B.Pharmacy'],
  DEGREE: ['B.Sc', 'B.Com', 'BBA']
};

const ROOM_NUMBERS = Array.from({ length: 11 }, (_, i) => (i + 30).toString());

const TABS = [
  { label: 'Add Student', value: 'add', icon: <UserPlusIcon className="w-5 h-5" /> },
  { label: 'Bulk Upload', value: 'bulkUpload', icon: <ArrowUpTrayIcon className="w-5 h-5" /> },
  { label: 'All Students', value: 'list', icon: <TableCellsIcon className="w-5 h-5" /> },
];

const initialForm = {
  name: '',
  rollNumber: '',
  course: '',
  year: '',
  branch: '',
  roomNumber: '',
  studentPhone: '',
  parentPhone: '',
};

const Students = () => {
  const [tab, setTab] = useState('add');
  const [form, setForm] = useState(initialForm);
  const [adding, setAdding] = useState(false);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    course: '',
    branch: '',
    roomNumber: ''
  });
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [generatedPassword, setGeneratedPassword] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // State for bulk upload
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkUploadResults, setBulkUploadResults] = useState(null);
  const [tempStudentsSummary, setTempStudentsSummary] = useState([]);
  const [loadingTempSummary, setLoadingTempSummary] = useState(false);

  // Debounce search term
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(filters.search);
    }, 500); // 500ms delay

    return () => {
      clearTimeout(timerId);
    };
  }, [filters.search]);

  // Fetch students when tab, currentPage, or filters (excluding direct search) change
  useEffect(() => {
    if (tab === 'list') {
      fetchStudents(true); // Pass true for initialLoad to use setLoading
    } else if (tab === 'bulkUpload') {
      fetchTempStudentsSummary();
    }
  }, [tab]); // Initial load for tab change

  useEffect(() => {
    if (tab === 'list') {
      fetchStudents(false); // Subsequent fetches don't use main setLoading
    }
  }, [currentPage, filters.course, filters.branch, filters.roomNumber, debouncedSearchTerm]);

  const fetchTempStudentsSummary = async () => {
    setLoadingTempSummary(true);
    try {
      const res = await api.get('/api/admin/students/temp-summary');
      if (res.data.success) {
        setTempStudentsSummary(res.data.data);
      } else {
        toast.error('Failed to fetch temporary students summary.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error fetching temporary students summary.');
    } finally {
      setLoadingTempSummary(false);
    }
  };

  const fetchStudents = useCallback(async (initialLoad = false) => {
    if (initialLoad) {
      setLoading(true);
    } else {
      setTableLoading(true);
    }
    setError(null);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        ...(filters.course && { course: filters.course }),
        ...(filters.branch && { branch: filters.branch }),
        ...(filters.roomNumber && { roomNumber: filters.roomNumber }),
        ...(debouncedSearchTerm && { search: debouncedSearchTerm }) // Add debounced search term
      });

      const res = await api.get(`/api/admin/students?${params}`);
      setStudents(res.data.data.students || []);
      setTotalPages(res.data.data.totalPages || 1);
    } catch (err) {
      setError('Failed to fetch students');
      toast.error(err.response?.data?.message || 'Failed to fetch students');
      setStudents([]); // Clear students on error
      setTotalPages(1); // Reset total pages on error
    } finally {
      if (initialLoad) {
        setLoading(false);
      } else {
        setTableLoading(false);
      }
    }
  }, [currentPage, filters.course, filters.branch, filters.roomNumber, debouncedSearchTerm]); // Add dependencies

  const handleFormChange = e => {
    const { name, value } = e.target;
    setForm(prev => {
      const newForm = { ...prev, [name]: value };
      
      // Reset branch when course changes
      if (name === 'course') {
        newForm.branch = '';
      }
      
      return newForm;
    });
  };

  const handleAddStudent = async e => {
    e.preventDefault();
    setAdding(true);
    try {
      // Send course label (e.g., 'B.Tech')
      const res = await api.post('/api/admin/students', form);
      toast.success('Student added successfully');
      setForm(initialForm);
      setGeneratedPassword(res.data.data.generatedPassword);
      setShowPasswordModal(true);
      if (tab === 'list') fetchStudents(); // Refresh list if current tab is 'list'
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add student');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/api/admin/students/${id}`);
      toast.success('Student deleted successfully');
      fetchStudents(); // Refresh list
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete student');
    } finally {
      setDeletingId(null);
    }
  };

  const openEditModal = student => {
    setEditId(student._id);
    setEditForm({
      name: student.name,
      rollNumber: student.rollNumber,
      course: student.course,
      year: student.year,
      branch: student.branch,
      roomNumber: student.roomNumber,
      studentPhone: student.studentPhone,
      parentPhone: student.parentPhone,
    });
    setEditModal(true);
  };

  const handleEditFormChange = e => {
    const { name, value } = e.target;
    setEditForm(prev => {
      const newForm = { ...prev, [name]: value };
      
      // Reset branch when course changes
      if (name === 'course') {
        newForm.branch = '';
      }
      
      return newForm;
    });
  };

  const handleEditSubmit = async e => {
    e.preventDefault();
    setEditing(true);
    try {
      // Send course label (e.g., 'B.Tech')
      await api.put(`/api/admin/students/${editId}`, editForm);
      toast.success('Student updated successfully');
      setEditModal(false);
      setEditId(null);
      fetchStudents(); // Refresh list
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update student');
    } finally {
      setEditing(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => {
      const newFilters = { ...prev, [name]: value };
      
      // Reset branch when course changes
      if (name === 'course') {
        newFilters.branch = '';
      }
      
      return newFilters;
    });
    setCurrentPage(1); // Reset to first page on filter change
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Bulk Upload Handlers
  const handleFileChange = (e) => {
    setBulkFile(e.target.files[0]);
    setBulkUploadResults(null); // Clear previous results
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!bulkFile) {
      toast.error('Please select an Excel file to upload.');
      return;
    }
    setBulkProcessing(true);
    setBulkUploadResults(null);
    const formData = new FormData();
    formData.append('file', bulkFile);

    try {
      const res = await api.post('/api/admin/students/bulk-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Bulk upload processed!');
        setBulkUploadResults(res.data.data);
        fetchTempStudentsSummary(); // Refresh summary table
        setBulkFile(null); // Clear file input
        if (document.getElementById('bulk-file-input')) {
          document.getElementById('bulk-file-input').value = null;
        }
        // Refresh the student list if we're on the list tab
        if (tab === 'list') {
          fetchStudents(true);
        }
      } else {
        toast.error(res.data.message || 'Bulk upload failed.');
        if(res.data.data && res.data.data.errors && res.data.data.errors.length > 0){
          setBulkUploadResults(res.data.data); // Show errors
        }
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'An error occurred during bulk upload.';
      toast.error(errorMsg);
      if(err.response?.data?.data && err.response?.data?.data.errors && err.response?.data?.data.errors.length > 0){
        setBulkUploadResults(err.response.data.data); // Show errors from server
      }
      console.error("Bulk upload error object:", err.response?.data || err);
    } finally {
      setBulkProcessing(false);
    }
  };

  const renderAddStudentForm = () => (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-blue-800">Add New Student</h2>
      <form onSubmit={handleAddStudent} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleFormChange}
              required
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
            <input
              type="text"
              name="rollNumber"
              value={form.rollNumber}
              onChange={handleFormChange}
              required
              pattern="[A-Z0-9]+"
              title="Uppercase letters and numbers only"
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
            <select
              name="course"
              value={form.course}
              onChange={handleFormChange}
              required
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Course</option>
              {Object.keys(COURSES).map(course => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              name="year"
              value={form.year}
              onChange={handleFormChange}
              required
              disabled={!form.course}
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Year</option>
              {form.course && Array.from(
                { length: COURSES[form.course] === 'BTECH' || COURSES[form.course] === 'PHARMACY' ? 4 : 3 },
                (_, i) => i + 1
              ).map(year => (
                <option key={year} value={year}>Year {year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
            <select
              name="branch"
              value={form.branch}
              onChange={handleFormChange}
              required
              disabled={!form.course}
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Branch</option>
              {form.course && BRANCHES[COURSES[form.course]].map(branch => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
            <select
              name="roomNumber"
              value={form.roomNumber}
              onChange={handleFormChange}
              required
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Room</option>
              {ROOM_NUMBERS.map(room => (
                <option key={room} value={room}>Room {room}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student Phone</label>
            <input
              type="tel"
              name="studentPhone"
              value={form.studentPhone}
              onChange={handleFormChange}
              required
              pattern="[0-9]{10}"
              title="10 digit phone number"
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent Phone</label>
            <input
              type="tel"
              name="parentPhone"
              value={form.parentPhone}
              onChange={handleFormChange}
              required
              pattern="[0-9]{10}"
              title="10 digit phone number"
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={adding}
            className={`px-4 sm:px-6 py-2 rounded-lg text-white font-medium transition-all duration-200 text-sm sm:text-base ${
              adding 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
            }`}
          >
            {adding ? 'Adding...' : 'Add Student'}
          </button>
        </div>
      </form>
    </div>
  );

  const renderStudentList = () => {
    // Show main loading spinner only on initial tab load, not on filter changes
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      );
    }

    if (error && !tableLoading) { // Show error only if not also table loading
      return <div className="text-center text-red-600 py-4">{error}</div>;
    }

    return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">All Students</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by name or roll..."
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                className="w-full pl-9 sm:pl-10 pr-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <select
              name="course"
              value={filters.course}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Courses</option>
              {Object.keys(COURSES).map(course => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              name="branch"
              value={filters.branch}
              onChange={handleFilterChange}
              disabled={!filters.course}
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Branches</option>
              {filters.course && BRANCHES[COURSES[filters.course]].map(branch => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              name="roomNumber"
              value={filters.roomNumber}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Rooms</option>
              {ROOM_NUMBERS.map(room => (
                <option key={room} value={room}>Room {room}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="relative">
        {tableLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex justify-center items-center z-10 rounded-b-xl">
            <LoadingSpinner />
          </div>
        )}
        {error && !students.length && !tableLoading && (
             <div className="text-center text-red-600 py-10">{error}</div>
        )}
        {!error && !tableLoading && students.length === 0 && (
            <div className="text-center text-gray-500 py-10">No students found matching your criteria.</div>
        )}
        {(!tableLoading || students.length > 0) && students.length > 0 && (
          <>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll Number</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map(student => (
                    <tr key={student._id}>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">{student.name}</td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">{student.rollNumber}</td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">{student.course}</td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">Year {student.year}</td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">{student.branch}</td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">Room {student.roomNumber}</td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">{student.studentPhone}</td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openEditModal(student)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 rounded-lg hover:bg-blue-50 transition-colors"
                          >
                            <PencilSquareIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(student._id)}
                            disabled={deletingId === student._id}
                            className="p-1.5 text-red-600 hover:text-red-800 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-6">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || tableLoading}
                className="p-1.5 sm:p-2 rounded-lg border border-gray-300 disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeftIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || tableLoading}
                className="p-1.5 sm:p-2 rounded-lg border border-gray-300 disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                <ChevronRightIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          )}
          </>
        )}
      </div>
    </div>
    );
  };

  // Password Modal
  const renderPasswordModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Student Added Successfully</h3>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-yellow-800 font-medium">Generated Password:</p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(generatedPassword);
                toast.success('Password copied to clipboard!');
              }}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-md transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy
            </button>
          </div>
          <p className="text-2xl font-mono bg-yellow-100 p-2 rounded text-center select-all">{generatedPassword}</p>
          <p className="text-sm text-yellow-700 mt-2">
            Please save this password securely. It will be needed for the student's first login.
          </p>
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => {
              setShowPasswordModal(false);
              setGeneratedPassword(null);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  // Edit Modal
  const renderEditModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Edit Student</h3>
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                name="name"
                value={editForm.name}
                onChange={handleEditFormChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
              <input
                type="text"
                value={editForm.rollNumber}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
              <select
                name="course"
                value={editForm.course}
                onChange={handleEditFormChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.keys(COURSES).map(course => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <select
                name="year"
                value={editForm.year}
                onChange={handleEditFormChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Array.from(
                  { length: COURSES[editForm.course] === 'BTECH' || COURSES[editForm.course] === 'PHARMACY' ? 4 : 3 },
                  (_, i) => i + 1
                ).map(year => (
                  <option key={year} value={year}>Year {year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <select
                name="branch"
                value={editForm.branch}
                onChange={handleEditFormChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {editForm.course && BRANCHES[COURSES[editForm.course]].map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
              <select
                name="roomNumber"
                value={editForm.roomNumber}
                onChange={handleEditFormChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {ROOM_NUMBERS.map(room => (
                  <option key={room} value={room}>Room {room}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student Phone</label>
              <input
                type="tel"
                name="studentPhone"
                value={editForm.studentPhone}
                onChange={handleEditFormChange}
                required
                pattern="[0-9]{10}"
                title="10 digit phone number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Phone</label>
              <input
                type="tel"
                name="parentPhone"
                value={editForm.parentPhone}
                onChange={handleEditFormChange}
                required
                pattern="[0-9]{10}"
                title="10 digit phone number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setEditModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editing}
              className={`px-4 py-2 rounded-lg text-white font-medium ${
                editing 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {editing ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // New render function for Bulk Upload form
  const renderBulkUploadForm = () => (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-blue-800">Bulk Upload Students</h2>
      <form onSubmit={handleBulkUpload} className="space-y-4">
        <div>
          <label htmlFor="bulk-file-input" className="block text-sm font-medium text-gray-700 mb-1">
            Upload .xlsx File
          </label>
          <input
            id="bulk-file-input"
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileChange}
            className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="mt-2 text-xs text-gray-500">
            Ensure your Excel file has columns: Name, RollNumber, Course, Branch, Year, RoomNumber, StudentPhone, ParentPhone.
          </p>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={bulkProcessing || !bulkFile}
            className={`px-4 sm:px-6 py-2 rounded-lg text-white font-medium transition-all duration-200 text-sm sm:text-base ${
              bulkProcessing || !bulkFile
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
            }`}
          >
            {bulkProcessing ? 'Processing...' : 'Upload Students'}
          </button>
        </div>
      </form>

      {bulkUploadResults && (
        <div className="mt-6 p-4 border rounded-lg bg-gray-50">
          <h3 className="text-md font-semibold mb-2 text-gray-800">Upload Summary:</h3>
          <p className="text-sm text-green-600">Successfully Added: {bulkUploadResults.successCount}</p>
          <p className="text-sm text-red-600">Failed: {bulkUploadResults.failureCount}</p>
          {bulkUploadResults.errors && bulkUploadResults.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-medium text-red-700">Error Details:</p>
              <ul className="list-disc list-inside max-h-40 overflow-y-auto text-xs text-red-600">
                {bulkUploadResults.errors.map((err, index) => (
                  <li key={index}>Row {err.row}: {err.error} {err.details ? `(${JSON.stringify(err.details)})` : ''}</li>
                ))}
              </ul>
            </div>
          )}
          {bulkUploadResults.addedStudents && bulkUploadResults.addedStudents.length > 0 && (
             <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Passwords for Successfully Added Students (Save Securely):</h4>
                <div className="max-h-60 overflow-y-auto text-xs space-y-1">
                {bulkUploadResults.addedStudents.map((student, index) => (
                    <div key={index} className="p-2 bg-gray-100 rounded flex justify-between items-center">
                        <span><strong>{student.name}</strong> ({student.rollNumber}): <code>{student.generatedPassword}</code></span>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(student.generatedPassword);
                                toast.success('Password copied!');
                            }}
                            className="p-1 text-gray-500 hover:text-blue-600"
                            title="Copy password"
                        >
                            <DocumentDuplicateIcon className="w-4 h-4"/>
                        </button>
                    </div>
                ))}
                </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // New render function for Temporary Students Summary Table
  const renderTempStudentsSummaryTable = () => (
    <div className="mt-8 bg-white rounded-xl shadow-md p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-blue-800">Students Pending First Password Reset</h2>
        <p className="text-sm text-gray-600 mt-1 sm:mt-0">
            {tempStudentsSummary.length > 0 
             ? `${tempStudentsSummary.length} student(s) yet to reset their initial password.`
             : "All bulk-uploaded students have reset their passwords or no students are pending."}
        </p>
      </div>
      
      {loadingTempSummary ? (
        <div className="flex justify-center items-center h-40"><LoadingSpinner /></div>
      ) : tempStudentsSummary.length === 0 ? (
        <p className="text-center text-gray-500 py-4">No students are currently pending password reset.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll Number</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated Password</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added On</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tempStudentsSummary.map(student => (
                <tr key={student._id}>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.name}</td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.rollNumber}</td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center justify-between">
                        <code>{student.generatedPassword}</code>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(student.generatedPassword);
                                toast.success('Password copied!');
                            }}
                            className="ml-2 p-1 text-gray-400 hover:text-blue-600"
                            title="Copy password"
                        >
                           <DocumentDuplicateIcon className="w-4 h-4"/>
                        </button>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.studentPhone}</td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(student.createdAt).toLocaleDateString()}</td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Pending Reset
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  if (loading && tab === 'list' && !tableLoading) { 
    return <div className="p-4 sm:p-6 max-w-[1400px] mx-auto mt-16 sm:mt-0"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto mt-16 sm:mt-0">
      <div className="flex flex-wrap gap-2 sm:gap-4 mb-6 sm:mb-8">
        {TABS.map(t => (
          <button
            key={t.value}
            className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 text-sm sm:text-base ${
              tab === t.value 
              ? 'bg-blue-600 text-white shadow-lg scale-105' 
              : 'bg-white text-gray-600 hover:bg-gray-50 shadow-md'
            }`}
            onClick={() => setTab(t.value)}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'add' && renderAddStudentForm()}
      {tab === 'bulkUpload' && (
        <>
          {renderBulkUploadForm()}
          {renderTempStudentsSummaryTable()}
        </>
      )}
      {tab === 'list' && renderStudentList()}
      {showPasswordModal && renderPasswordModal()}
      {editModal && renderEditModal()}
    </div>
  );
};

export default Students;