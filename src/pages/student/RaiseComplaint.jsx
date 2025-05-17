import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import LoadingSpinner from '../../components/LoadingSpinner';

const CATEGORIES = [
  { value: 'Canteen', label: 'Canteen' },
  { value: 'Internet', label: 'Internet' },
  { value: 'Maintenance', label: 'Maintenance' },
  { value: 'Others', label: 'Others' }
];

const MAINTENANCE_SUBCATEGORIES = [
  { value: 'Housekeeping', label: 'Housekeeping' },
  { value: 'Plumbing', label: 'Plumbing' },
  { value: 'Electricity', label: 'Electricity' }
];

const RaiseComplaint = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    category: '',
    subCategory: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!form.category) {
      newErrors.category = 'Please select a category';
    }
    
    if (form.category === 'Maintenance' && !form.subCategory) {
      newErrors.subCategory = 'Please select a maintenance type';
    }
    
    if (!form.description.trim()) {
      newErrors.description = 'Please provide a description';
    } else if (form.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters long';
    } else if (form.description.trim().length > 1000) {
      newErrors.description = 'Description cannot exceed 1000 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => {
      // Reset subCategory when category changes
      if (name === 'category') {
        return { ...prev, [name]: value, subCategory: '' };
      }
      return { ...prev, [name]: value };
    });
    // Clear error when field is modified
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in to submit a complaint');
      navigate('/login');
      return;
    }

    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await api.post('/api/complaints', form);
      
      if (response.data.success) {
        toast.success('Complaint submitted successfully');
        setForm({ category: '', subCategory: '', description: '' });
        
        // Dispatch event to notify other components
        window.dispatchEvent(new Event('complaint-submitted'));
        
        // Wait a bit before redirecting to ensure the complaint is saved
        setTimeout(() => {
          navigate('/student/my-complaints');
        }, 1000);
      }
    } catch (err) {
      console.error('Error submitting complaint:', err);
      if (err.response?.status === 401) {
        toast.error('Your session has expired. Please log in again.');
        // The axios interceptor will handle the redirect
      } else {
        const errorMessage = err.response?.data?.message || 'Failed to submit complaint. Please try again.';
        toast.error(errorMessage);
        // Set server validation errors if any
        if (err.response?.data?.errors) {
          setErrors(err.response.data.errors);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 mt-12 sm:mt-0">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl shadow-lg shadow-blue-100">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">
            Raise a Complaint
          </h2>
          <p className="text-gray-600 text-sm mt-1">Submit your complaints and concerns</p>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden"
      >
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type of Issue
              </label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                  errors.category ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              >
                <option value="">Select a category</option>
                {CATEGORIES.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="mt-1 text-sm text-red-600">{errors.category}</p>
              )}
            </div>

            {/* Sub-category Selection (only for Maintenance) */}
            {form.category === 'Maintenance' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maintenance Type
                </label>
                <select
                  name="subCategory"
                  value={form.subCategory}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                    errors.subCategory ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value="">Select maintenance type</option>
                  {MAINTENANCE_SUBCATEGORIES.map(sub => (
                    <option key={sub.value} value={sub.value}>
                      {sub.label}
                    </option>
                  ))}
                </select>
                {errors.subCategory && (
                  <p className="mt-1 text-sm text-red-600">{errors.subCategory}</p>
                )}
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
                <span className="text-gray-500 text-xs ml-2">
                  ({form.description.length}/1000 characters)
                </span>
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows="4"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Please describe your issue in detail (minimum 10 characters)..."
                required
                maxLength={1000}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className={`px-6 py-2 rounded-lg text-white font-medium transition-all duration-200 ${
                  loading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                }`}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    Submitting...
                  </span>
                ) : (
                  'Submit Complaint'
                )}
              </button>
            </div>
          </form>
        </div>
        
        <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Your complaints will be addressed within 24-48 hours
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default RaiseComplaint;