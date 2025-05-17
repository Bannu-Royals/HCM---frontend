import React, { useEffect, useState } from 'react';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { MegaphoneIcon, PlusIcon, TrashIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ title: '', description: '' });
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/announcements/admin/all');
      if (res.data.success) {
        setAnnouncements(res.data.data);
      } else {
        throw new Error(res.data.message || 'Failed to fetch announcements');
      }
    } catch (err) {
      console.error('Error fetching announcements:', err);
      setError(err.response?.data?.message || 'Failed to fetch announcements');
      toast.error(err.response?.data?.message || 'Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAdd = async e => {
    e.preventDefault();
    setAdding(true);
    try {
      const response = await api.post('/api/announcements', form);
      if (response.data.success) {
        toast.success('Announcement posted successfully');
        setForm({ title: '', description: '' });
        fetchAnnouncements();
      } else {
        throw new Error(response.data.message || 'Failed to post announcement');
      }
    } catch (err) {
      console.error('Error posting announcement:', err);
      toast.error(err.response?.data?.message || 'Failed to post announcement');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this announcement?')) return;
    setDeletingId(id);
    try {
      const response = await api.delete(`/api/announcements/${id}`);
      if (response.data.success) {
        toast.success('Announcement deleted successfully');
        fetchAnnouncements();
      } else {
        throw new Error(response.data.message || 'Failed to delete announcement');
      }
    } catch (err) {
      console.error('Error deleting announcement:', err);
      toast.error(err.response?.data?.message || 'Failed to delete announcement');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 mt-16 sm:mt-0">
      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-blue-900">Announcements</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Manage and track all announcements</p>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-xs sm:text-sm text-gray-600 bg-gray-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg">
              Total: <span className="font-semibold text-gray-900">{announcements.length}</span> announcements
            </div>
          </div>
        </div>
      </div>

      {/* Create Announcement Form */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Create New Announcement</h3>
        <form className="space-y-4" onSubmit={handleAdd}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input 
              className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200" 
              name="title" 
              placeholder="Enter announcement title" 
              value={form.title} 
              onChange={handleFormChange} 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea 
              className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200" 
              name="description" 
              placeholder="Enter announcement details" 
              value={form.description} 
              onChange={handleFormChange} 
              required 
              rows={4}
            />
          </div>
          <button 
            className={`w-full sm:w-auto py-2.5 px-6 rounded-lg text-white font-medium transition-all duration-200 flex items-center justify-center gap-2
              ${adding 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 shadow hover:shadow-md'
              }`} 
            type="submit" 
            disabled={adding}
          >
            {adding ? (
              <>
                <LoadingSpinner size="sm" className="border-white" />
                <span>Posting...</span>
              </>
            ) : (
              <>
                <PlusIcon className="w-5 h-5" />
                <span>Post Announcement</span>
              </>
            )}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center gap-2">
          <XCircleIcon className="w-5 h-5" />
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {announcements.length === 0 ? (
            <div className="col-span-full bg-gray-50 p-8 rounded-lg border border-gray-200 text-center">
              <MegaphoneIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No announcements posted yet.</p>
            </div>
          ) : (
            announcements.map(a => (
              <div 
                key={a._id} 
                className={`bg-white rounded-xl shadow-sm p-4 sm:p-5 transition-all duration-200 hover:shadow h-full
                  ${a.isActive === false ? 'opacity-75 grayscale' : ''}`}
              >
                <div className="flex flex-col h-full">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-start gap-2 mb-2">
                      <h3 className="font-bold text-base sm:text-lg text-gray-800 break-words flex-1">{a.title}</h3>
                      {a.isActive === false && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 whitespace-nowrap flex-shrink-0">
                          Deleted
                        </span>
                      )}
                    </div>
                    <p className="text-sm sm:text-base text-gray-600 mb-3 whitespace-pre-wrap break-words line-clamp-3">{a.description}</p>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                      <ClockIcon className="w-4 h-4 flex-shrink-0" />
                      <time className="break-words">{new Date(a.createdAt).toLocaleString()}</time>
                    </div>
                  </div>
                  {a.isActive !== false && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <button
                        className="w-full sm:w-auto p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                        onClick={() => handleDelete(a._id)}
                        disabled={deletingId === a._id}
                      >
                        {deletingId === a._id ? (
                          <div className="w-5 h-5 border-t-2 border-red-600 rounded-full animate-spin" />
                        ) : (
                          <>
                            <TrashIcon className="w-5 h-5" />
                            <span className="text-sm font-medium">Delete</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Announcements;