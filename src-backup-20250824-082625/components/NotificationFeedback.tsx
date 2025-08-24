
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { NotificationService } from '@/services/notificationService';

interface NotificationFeedbackProps {
  isOpen: boolean;
  onClose: () => void;
  notificationType?: string;
}

export default function NotificationFeedback({ isOpen, onClose, notificationType }: NotificationFeedbackProps) {
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (feedback) {
      await NotificationService.handleActionClick('feedback', {
        type: notificationType,
        rating: feedback,
        comment: comment.trim() || undefined
      });
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setFeedback(null);
        setComment('');
        setSubmitted(false);
      }, 2000);
    }
  };

  if (!isOpen) return null;

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="max-w-sm mx-auto">
          <CardContent className="p-6 text-center">
            <ThumbsUp className="w-12 h-12 text-[#10B981] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#1E3A8A] mb-2">Thank You!</h3>
            <p className="text-gray-600">Your feedback helps us support you better.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-[#1E3A8A] flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            How was this notification?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Your feedback helps us send you more helpful reminders.
          </p>
          
          <div className="flex justify-center gap-4">
            <Button
              variant={feedback === 'positive' ? 'default' : 'outline'}
              onClick={() => setFeedback('positive')}
              className={feedback === 'positive' ? 'bg-[#10B981] text-white' : 'border-[#10B981] text-[#10B981]'}
            >
              <ThumbsUp className="w-4 h-4 mr-2" />
              Helpful
            </Button>
            <Button
              variant={feedback === 'negative' ? 'default' : 'outline'}
              onClick={() => setFeedback('negative')}
              className={feedback === 'negative' ? 'bg-red-500 text-white' : 'border-red-500 text-red-500'}
            >
              <ThumbsDown className="w-4 h-4 mr-2" />
              Not Helpful
            </Button>
          </div>

          {feedback && (
            <div className="space-y-3">
              <textarea
                placeholder="Any additional thoughts? (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-[#10B981] focus:border-transparent"
                rows={3}
              />
              
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={onClose}>
                  Skip
                </Button>
                <Button 
                  onClick={handleSubmit}
                  className="bg-[#1E3A8A] text-white hover:bg-blue-800"
                >
                  Submit
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
