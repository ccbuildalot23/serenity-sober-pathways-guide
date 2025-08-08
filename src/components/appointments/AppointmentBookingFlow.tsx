import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Video, Phone, User, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { AppointmentService } from '@/services/appointmentService';
import { Provider } from '@/types/provider';
import { AppointmentSlot, BookingFormData } from '@/types/appointment';
import { format, addDays, isSameDay, parseISO } from 'date-fns';

interface AppointmentBookingFlowProps {
  provider: Provider;
  onBookingComplete?: (appointmentId: string) => void;
  onCancel?: () => void;
}

export const AppointmentBookingFlow: React.FC<AppointmentBookingFlowProps> = ({
  provider,
  onBookingComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [_selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AppointmentSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingData, setBookingData] = useState<Partial<BookingFormData>>({
    provider_id: provider.id,
    _appointment_type: 'consultation',
    _location_type: 'in_person',
    _duration_minutes: 60,
    is_recurring: false
  });

  const appointmentTypes = [
    { value: 'consultation', label: 'Initial Consultation', duration: 60 },
    { value: 'follow_up', label: 'Follow-up Session', duration: 45 },
    { value: 'therapy', label: 'Therapy Session', duration: 50 },
    { value: 'assessment', label: 'Assessment', duration: 90 }
  ];

  // Load available slots when date changes
  useEffect(() => {
    if (_selectedDate && bookingData._duration_minutes) {
      loadAvailableSlots();
    }
  }, [_selectedDate, bookingData._duration_minutes]);

  const loadAvailableSlots = async () => {
    try {
      setLoading(true);
      const _dateStr = format(_selectedDate, 'yyyy-MM-dd');
      const slots = await AppointmentService.getAvailableSlots(
        provider.id,
        _dateStr,
        bookingData._duration_minutes || 60
      );
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error loading slots:', error);
      toast.error('Failed to load available slots');
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedSlot) return;

    try {
      setLoading(true);
      
      const _appointmentData: BookingFormData = {
        provider_id: provider.id,
        _appointment_type: bookingData._appointment_type!,
        start_time: selectedSlot.slot_start,
        end_time: selectedSlot.slot_end,
        _duration_minutes: bookingData._duration_minutes!,
        _location_type: bookingData._location_type!,
        _title: bookingData._title,
        description: bookingData.description,
        _booking_notes: bookingData._booking_notes,
        is_recurring: bookingData.is_recurring,
        _recurrence_pattern: bookingData._recurrence_pattern
      };

      const appointment = await AppointmentService.bookAppointment(_appointmentData);
      
      toast.success('Appointment booked successfully!');
      onBookingComplete?.(appointment.id);
    } catch (error: unknown) {
      console.error('Error booking appointment:', error);
      if (error.message === 'Time slot is no longer available') {
        toast.error('This time slot is no longer available. Please select another time.');
        loadAvailableSlots(); // Refresh slots
      } else {
        toast.error('Failed to book appointment. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      {[1, 2, 3, 4].map((step) => (
        <React.Fragment key={step}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step <= currentStep 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground'
          }`}>
            {step}
          </div>
          {step < 4 && (
            <div className={`w-12 h-0.5 ${
              step < currentStep ? 'bg-primary' : 'bg-muted'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Select Appointment Type
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup
          value={bookingData._appointment_type}
          onValueChange={(value) => {
            const type = appointmentTypes.find(t => t.value === value);
            setBookingData(prev => ({
              ...prev,
              _appointment_type: value,
              _duration_minutes: type?.duration || 60
            }));
          }}
        >
          {appointmentTypes.map((type) => (
            <div key={type.value} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50">
              <RadioGroupItem value={type.value} id={type.value} />
              <Label htmlFor={type.value} className="flex-1 cursor-pointer">
                <div className="font-medium">{type.label}</div>
                <div className="text-sm text-muted-foreground">{type.duration} minutes</div>
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className="space-y-3">
          <Label>Location Type</Label>
          <RadioGroup
            value={bookingData._location_type}
            onValueChange={(value: unknown) => setBookingData(prev => ({ ...prev, _location_type: value }))}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="in_person" id="in_person" />
              <Label htmlFor="in_person" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                In-Person
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="telehealth" id="telehealth" />
              <Label htmlFor="telehealth" className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                Video Call
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="phone" id="phone" />
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Call
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => setCurrentStep(2)}>
            Next: Select Date & Time
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep2 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Select Date & Time
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Selector */}
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 14 }, (_, i) => {
            const date = addDays(new Date(), i);
            const isSelected = isSameDay(date, _selectedDate);
            const isPast = date < new Date();
            
            return (
              <Button
                key={i}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                disabled={isPast}
                onClick={() => setSelectedDate(date)}
                className="h-auto p-2 flex flex-col"
              >
                <div className="text-xs">{format(date, 'EEE')}</div>
                <div className="text-lg font-semibold">{format(date, 'd')}</div>
              </Button>
            );
          })}
        </div>

        {/* Time Slots */}
        <div>
          <Label className="text-base font-medium">Available Times</Label>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>No available slots for this date</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
              {availableSlots.filter(slot => slot.is_available).map((slot, index) => (
                <Button
                  key={index}
                  variant={selectedSlot === slot ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSlot(slot)}
                  className="h-auto p-2"
                >
                  {format(parseISO(slot.slot_start), 'h:mm a')}
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentStep(1)}>
            Back
          </Button>
          <Button 
            onClick={() => setCurrentStep(3)}
            disabled={!selectedSlot}
          >
            Next: Additional Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep3 = () => (
    <Card>
      <CardHeader>
        <CardTitle>Additional Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="_title">Appointment Title (_Optional)</Label>
          <input
            id="_title"
            className="w-full p-2 border rounded-md"
            placeholder="e.g., Initial consultation for anxiety"
            value={bookingData._title || ''}
            onChange={(e) => setBookingData(prev => ({ ...prev, _title: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes for Provider (_Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Any specific topics or concerns you'd like to discuss..."
            value={bookingData._booking_notes || ''}
            onChange={(e) => setBookingData(prev => ({ ...prev, _booking_notes: e.target.value }))}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="recurring"
              checked={bookingData.is_recurring}
              onCheckedChange={(checked) => 
                setBookingData(prev => ({ ...prev, is_recurring: checked as boolean }))
              }
            />
            <Label htmlFor="recurring">Make this a recurring appointment</Label>
          </div>

          {bookingData.is_recurring && (
            <div className="ml-6 space-y-2">
              <Label>Frequency</Label>
              <RadioGroup
                value={bookingData._recurrence_pattern?._frequency || 'weekly'}
                onValueChange={(value) => 
                  setBookingData(prev => ({
                    ...prev,
                    _recurrence_pattern: { ...prev._recurrence_pattern, _frequency: value as any }
                  }))
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="weekly" id="weekly" />
                  <Label htmlFor="weekly">Weekly</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="biweekly" id="biweekly" />
                  <Label htmlFor="biweekly">Every 2 weeks</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <Label htmlFor="monthly">Monthly</Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentStep(2)}>
            Back
          </Button>
          <Button onClick={() => setCurrentStep(4)}>
            Next: Review & Confirm
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep4 = () => (
    <Card>
      <CardHeader>
        <CardTitle>Review & Confirm</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-medium">Provider:</span>
            <span>{provider.name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium">Type:</span>
            <span>{appointmentTypes.find(t => t.value === bookingData._appointment_type)?.label}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium">Date & Time:</span>
            <span>
              {selectedSlot && format(parseISO(selectedSlot.slot_start), 'EEEE, MMMM d, yyyy')}
              <br />
              {selectedSlot && format(parseISO(selectedSlot.slot_start), 'h:mm a')} - 
              {selectedSlot && format(parseISO(selectedSlot.slot_end), 'h:mm a')}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium">Location:</span>
            <Badge variant="outline">
              {bookingData._location_type === 'in_person' && <MapPin className="h-3 w-3 mr-1" />}
              {bookingData._location_type === 'telehealth' && <Video className="h-3 w-3 mr-1" />}
              {bookingData._location_type === 'phone' && <Phone className="h-3 w-3 mr-1" />}
              {bookingData._location_type?.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          {bookingData.is_recurring && (
            <div className="flex justify-between items-center">
              <span className="font-medium">Recurring:</span>
              <span className="capitalize">{bookingData._recurrence_pattern?._frequency}</span>
            </div>
          )}
        </div>

        {bookingData._location_type === 'telehealth' && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              You'll receive a video call link after booking. Please test your camera and microphone before the appointment.
            </p>
          </div>
        )}

        <div className="flex justify-between gap-3">
          <Button variant="outline" onClick={() => setCurrentStep(3)}>
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleBookAppointment} disabled={loading}>
              {loading ? 'Booking...' : 'Confirm Booking'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {renderStepIndicator()}
      
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
      {currentStep === 4 && renderStep4()}
    </div>
  );
};