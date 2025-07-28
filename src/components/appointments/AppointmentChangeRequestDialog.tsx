import React, { useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AppointmentService } from '@/services/appointmentService';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AppointmentChangeRequestDialogProps {
  open: boolean;
  appointmentId: string;
  requestType: 'reschedule' | 'cancel';
  onClose: () => void;
  onSuccess: () => void;
}

export const AppointmentChangeRequestDialog: React.FC<AppointmentChangeRequestDialogProps> = ({
  open,
  appointmentId,
  requestType,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [newDate, setNewDate] = useState<Date>();
  const [newTime, setNewTime] = useState('');

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for the change');
      return;
    }

    if (requestType === 'reschedule' && (!newDate || !newTime)) {
      toast.error('Please select a new date and time');
      return;
    }

    try {
      setLoading(true);
      
      let newStartTime: string | undefined;
      let newEndTime: string | undefined;

      if (requestType === 'reschedule' && newDate && newTime) {
        const [hours, minutes] = newTime.split(':').map(Number);
        const startDateTime = new Date(newDate);
        startDateTime.setHours(hours, minutes, 0, 0);
        
        // Assume 1 hour duration for now (could be made configurable)
        const endDateTime = new Date(startDateTime);
        endDateTime.setHours(hours + 1, minutes, 0, 0);
        
        newStartTime = startDateTime.toISOString();
        newEndTime = endDateTime.toISOString();
      }

      await AppointmentService.createChangeRequest(
        appointmentId,
        requestType,
        reason,
        newStartTime,
        newEndTime
      );

      toast.success(
        requestType === 'reschedule' 
          ? 'Reschedule request submitted successfully' 
          : 'Cancellation request submitted successfully'
      );
      
      onSuccess();
    } catch (error) {
      console.error('Error submitting change request:', error);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {requestType === 'reschedule' ? 'Request Reschedule' : 'Cancel Appointment'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {requestType === 'reschedule' && (
            <>
              <div className="space-y-2">
                <Label>New Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !newDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {newDate ? format(newDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={newDate}
                      onSelect={setNewDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Preferred Time</Label>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map((time) => (
                    <Button
                      key={time}
                      variant={newTime === time ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNewTime(time)}
                      className="text-xs"
                    >
                      {time}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason for {requestType === 'reschedule' ? 'rescheduling' : 'cancellation'}
            </Label>
            <Textarea
              id="reason"
              placeholder={`Please explain why you need to ${requestType} this appointment...`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <div className="text-sm text-muted-foreground bg-accent/50 p-3 rounded">
            <p>
              Your {requestType} request will be sent to the provider for approval. 
              You'll receive a notification once they respond.
            </p>
            {requestType === 'cancel' && (
              <p className="mt-1 text-orange-600">
                Note: Cancellations within 24 hours may incur a fee.
              </p>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Submitting...' : `Submit ${requestType === 'reschedule' ? 'Reschedule' : 'Cancellation'} Request`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};