import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface NotificationToastProps {
  notification: { type: 'success' | 'error'; message: string } | null;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification }) => {
  if (!notification) return null;

  const isSuccess = notification.type === 'success';

  return (
    <div className={`
      fixed top-4 right-4 p-4 rounded-xl shadow-xl z-50 
      flex items-center gap-3 min-w-[300px] max-w-md
      transform transition-all duration-300 animate-slide-in-right
      ${isSuccess 
        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white' 
        : 'bg-gradient-to-r from-rose-500 to-rose-600 text-white'
      }
    `}>
      {isSuccess ? (
        <CheckCircle className="h-5 w-5 flex-shrink-0" />
      ) : (
        <XCircle className="h-5 w-5 flex-shrink-0" />
      )}
      <p className="font-medium">{notification.message}</p>
    </div>
  );
};

export default NotificationToast;
