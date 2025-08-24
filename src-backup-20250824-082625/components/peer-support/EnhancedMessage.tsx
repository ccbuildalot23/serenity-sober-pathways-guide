import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal, Edit2, Trash2, Reply, Bookmark, 
  Smile, Heart, ThumbsUp, Clock, Check, CheckCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedMessageProps {
  message: {
    id: string;
    message_text: string;
    sender_type: string;
    sender_id: string;
    created_at: string;
    edited_at?: string;
    deleted_at?: string;
    reply_to_message_id?: string;
    reactions?: Record<string, string[]>;
    file_url?: string;
    file_type?: string;
    delivered_at?: string;
    read_at?: string;
  };
  currentUserId: string;
  isOwn: boolean;
  onEdit?: (messageId: string, newText: string) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (messageId: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  onBookmark?: (messageId: string) => void;
  replyToMessage?: {
    id: string;
    message_text: string;
    sender_type: string;
  } | null;
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

export const EnhancedMessage: React.FC<EnhancedMessageProps> = ({
  message,
  currentUserId,
  isOwn,
  onEdit,
  onDelete,
  onReply,
  onReaction,
  onBookmark,
  replyToMessage
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.message_text);
  const [showReactions, setShowReactions] = useState(false);

  const handleEdit = () => {
    if (onEdit && editText.trim()) {
      onEdit(message.id, editText.trim());
      setIsEditing(false);
    }
  };

  const handleReaction = (emoji: string) => {
    if (onReaction) {
      onReaction(message.id, emoji);
    }
    setShowReactions(false);
  };

  const renderReactions = () => {
    if (!message.reactions || Object.keys(message.reactions).length === 0) {
      return null;
    }

    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {Object.entries(message.reactions).map(([emoji, userIds]) => (
          <Button
            key={emoji}
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 px-2 py-0 text-xs rounded-full",
              userIds.includes(currentUserId) 
                ? "bg-blue-100 text-blue-700 border border-blue-200" 
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
            onClick={() => handleReaction(emoji)}
          >
            {emoji} {userIds.length > 1 && userIds.length}
          </Button>
        ))}
      </div>
    );
  };

  const renderFileAttachment = () => {
    if (!message.file_url) return null;

    const isImage = message.file_type?.startsWith('image/');

    return (
      <div className="mt-2">
        {isImage ? (
          <img 
            src={message.file_url} 
            alt="Shared image" 
            className="max-w-xs rounded-lg border"
          />
        ) : (
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
            <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
              📎
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {message.file_url.split('/').pop()}
              </p>
              <p className="text-xs text-gray-500">
                {message.file_type}
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <a href={message.file_url} download>
                Download
              </a>
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderDeliveryStatus = () => {
    if (!isOwn) return null;

    return (
      <div className="flex items-center gap-1 mt-1">
        <div className="text-xs text-gray-500 flex items-center gap-1">
          {message.read_at ? (
            <>
              <CheckCheck className="w-3 h-3 text-blue-500" />
              Read
            </>
          ) : message.delivered_at ? (
            <>
              <Check className="w-3 h-3" />
              Delivered
            </>
          ) : (
            <>
              <Clock className="w-3 h-3" />
              Sending
            </>
          )}
        </div>
      </div>
    );
  };

  if (message.deleted_at) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
        <div className="max-w-[70%] p-3 rounded-lg bg-gray-100 text-gray-500 italic">
          <p className="text-sm">This message was deleted</p>
          <p className="text-xs mt-1">
            {new Date(message.created_at).toLocaleTimeString()}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3 group`}>
      <div className={`max-w-[70%] ${isOwn ? 'ml-4' : 'mr-4'}`}>
        {/* Reply to message */}
        {replyToMessage && (
          <div className="mb-1 p-2 bg-gray-50 rounded-t-lg border-l-2 border-blue-500">
            <p className="text-xs text-gray-600 font-medium">
              Reply to {replyToMessage.sender_type}
            </p>
            <p className="text-xs text-gray-700 truncate">
              {replyToMessage.message_text}
            </p>
          </div>
        )}

        {/* Main message */}
        <div
          className={cn(
            "p-3 rounded-lg relative",
            isOwn
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-900",
            replyToMessage && "rounded-t-none"
          )}
        >
          {/* Message content */}
          {isEditing ? (
            <div className="space-y-2">
              <Input
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="text-sm"
                onKeyPress={(e) => e.key === 'Enter' && handleEdit()}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleEdit}>
                  Save
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm whitespace-pre-wrap">{message.message_text}</p>
              {message.edited_at && (
                <p className="text-xs opacity-70 mt-1">(edited)</p>
              )}
            </>
          )}

          {/* File attachment */}
          {renderFileAttachment()}

          {/* Timestamp and actions */}
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs opacity-70">
              {new Date(message.created_at).toLocaleTimeString()}
            </p>

            {/* Message actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Quick reactions */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setShowReactions(!showReactions)}
                >
                  <Smile className="w-3 h-3" />
                </Button>
                
                {showReactions && (
                  <div className="absolute bottom-full right-0 mb-1 bg-white border rounded-lg shadow-lg p-2 flex gap-1 z-10">
                    {COMMON_EMOJIS.map(emoji => (
                      <Button
                        key={emoji}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-gray-100"
                        onClick={() => handleReaction(emoji)}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {/* More actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onReply?.(message.id)}>
                    <Reply className="w-4 h-4 mr-2" />
                    Reply
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onBookmark?.(message.id)}>
                    <Bookmark className="w-4 h-4 mr-2" />
                    Bookmark
                  </DropdownMenuItem>
                  {isOwn && !message.edited_at && (
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {isOwn && (
                    <DropdownMenuItem 
                      onClick={() => onDelete?.(message.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Reactions */}
          {renderReactions()}
        </div>

        {/* Delivery status */}
        {renderDeliveryStatus()}
      </div>
    </div>
  );
};