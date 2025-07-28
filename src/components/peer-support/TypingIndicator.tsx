import React from 'react';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  typingUsers: Array<{
    user_id: string;
    display_name?: string;
  }>;
  className?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  typingUsers,
  className
}) => {
  if (typingUsers.length === 0) return null;

  const getTypingText = () => {
    const names = typingUsers.map(user => 
      user.display_name || (user.user_id.includes('supporter') ? 'Supporter' : 'Someone')
    );

    if (names.length === 1) {
      return `${names[0]} is typing...`;
    } else if (names.length === 2) {
      return `${names[0]} and ${names[1]} are typing...`;
    } else if (names.length === 3) {
      return `${names[0]}, ${names[1]}, and ${names[2]} are typing...`;
    } else {
      return `${names[0]}, ${names[1]}, and ${names.length - 2} others are typing...`;
    }
  };

  return (
    <div className={cn("flex items-center gap-2 px-4 py-2 text-sm text-gray-600", className)}>
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
      </div>
      <span className="text-xs font-medium">{getTypingText()}</span>
    </div>
  );
};