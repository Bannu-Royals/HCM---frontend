import React, { useEffect, useState } from 'react';
import axios from 'axios';
import LoadingSpinner from '../../components/LoadingSpinner';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNotifications();
    const handler = () => fetchNotifications();
    window.addEventListener('refresh-notifications', handler);
    return () => window.removeEventListener('refresh-notifications', handler);
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/notifications');
      setNotifications(res.data);
    } catch (err) {
      setError('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="font-bold mb-4">Notifications</h2>      {loading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : notifications.length === 0 ? (
        <div className="bg-gray-50 p-4 rounded border text-sm">No notifications yet.</div>
      ) : (
        <ul className="space-y-3">
          {notifications.map(n => (
            <li key={n._id} className={`p-3 rounded border ${n.isRead ? 'bg-gray-50' : 'bg-primary-50 border-primary-200'}`}>
              <div className="font-semibold">{n.title}</div>
              <div className="text-gray-700 text-sm mb-1">{n.message}</div>
              <div className="text-xs text-gray-500">{new Date(n.createdAt).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Notifications;