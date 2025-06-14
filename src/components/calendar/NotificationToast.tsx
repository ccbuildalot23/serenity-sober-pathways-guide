
import React from 'react';

interface NotificationToastProps {
  notification: { type: 'success' | 'error'; message: string } | null;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification }) => {
  if (!notification) return null;

  return (
    <div className={`
      fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50
      ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}
      text-white
    `}>
      {notification.message}
    </div>
  );
};

export default NotificationToast;
