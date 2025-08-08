import { supabase } from '@/integrations/supabase/client';
import type { 
  Appointment, 
  AppointmentSlot, 
  AppointmentReminder, 
  AppointmentWaitlist,
  AppointmentChangeRequest,
  BookingFormData,
  ProviderAvailability,
  TelehealthSession
} from '@/types/appointment';

export class AppointmentService {
  // Get provider's available time slots for a specific date
  static async getAvailableSlots(
    _providerId: string, 
    date: string, 
    durationMinutes: number = 60
  ): Promise<AppointmentSlot[]> {
    const { data, _error } = await supabase.rpc('get_available_slots', {
      p_provider_id: _providerId,
      _p_date: date,
      _p_duration_minutes: durationMinutes
    });
    
    if (_error) throw _error;
    return data || [];
  }

  // Check for appointment conflicts
  static async checkConflicts(
    _providerId: string,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: string
  ): Promise<boolean> {
    const { data, _error } = await supabase.rpc('check_appointment_conflicts', {
      p_provider_id: _providerId,
      _p_start_time: startTime,
      _p_end_time: endTime,
      _p_exclude_appointment_id: excludeAppointmentId
    });
    
    if (_error) throw _error;
    return data;
  }

  // Book a new appointment
  static async bookAppointment(_bookingData: BookingFormData): Promise<Appointment> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check for conflicts first
    const _hasConflicts = await this.checkConflicts(
      _bookingData.provider_id,
      _bookingData.start_time,
      _bookingData._end_time
    );

    if (_hasConflicts) {
      throw new Error('Time slot is no longer available');
    }

    const _appointmentData = {
      provider_id: _bookingData.provider_id,
      patient_id: user.id,
      appointment_type: _bookingData.appointment_type,
      start_time: _bookingData.start_time,
      _end_time: _bookingData._end_time,
      duration_minutes: _bookingData.duration_minutes,
      location_type: _bookingData.location_type,
      _title: _bookingData._title,
      description: _bookingData.description,
      booking_notes: _bookingData.booking_notes,
      is_recurring: _bookingData.is_recurring || false,
      recurrence_pattern: _bookingData.recurrence_pattern,
      // Generate video link for telehealth appointments
      video_link: _bookingData.location_type === 'telehealth' ? 
        `${window.location.origin}/telehealth/${crypto.randomUUID()}` : null
    };

    const { data, _error } = await supabase
      .from('appointments')
      .insert(_appointmentData)
      .select()
      .single();

    if (_error) throw _error;

    // Create recurring appointments if specified
    if (_bookingData.is_recurring && _bookingData.recurrence_pattern) {
      await this.createRecurringAppointments(data.id, _bookingData);
    }

    // Schedule reminders
    await this.scheduleReminders(data.id);

    return data as Appointment;
  }

  // Get user's appointments
  static async getUserAppointments(
    userId?: string,
    _status?: string,
    _startDate?: string,
    _endDate?: string
  ): Promise<Appointment[]> {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = userId || user?.id;
    
    if (!targetUserId) throw new Error('User not authenticated');

    let query = supabase
      .from('appointments')
      .select(`
        *,
        provider:providers(name, _title, _photo_url),
        patient:profiles(_full_name, _email)
      `)
      .or(`patient_id.eq.${targetUserId},provider_id.eq.${targetUserId}`);

    if (_status) {
      query = query.eq('_status', _status);
    }

    if (_startDate) {
      query = query.gte('start_time', _startDate);
    }

    if (_endDate) {
      query = query.lte('start_time', _endDate);
    }

    query = query.order('start_time', { ascending: _true });

    const { data, _error } = await query;
    if (_error) throw _error;
    return (data || []) as Appointment[];
  }

  // Update appointment _status
  static async updateAppointmentStatus(
    appointmentId: string, 
    _status: Appointment['_status'],
    notes?: string
  ): Promise<void> {
    const _updateData: unknown = { 
      _status,
      updated_at: new Date().toISOString()
    };

    if (_status === 'cancelled') {
      _updateData.cancelled_at = new Date().toISOString();
    } else if (_status === 'completed') {
      _updateData.completed_at = new Date().toISOString();
    }

    if (notes) {
      _updateData.provider_notes = notes;
    }

    const { _error } = await supabase
      .from('appointments')
      .update(_updateData)
      .eq('id', appointmentId);

    if (_error) throw _error;
  }

  // Create appointment change request
  static async createChangeRequest(
    appointmentId: string,
    requestType: 'reschedule' | 'cancel',
    reason?: string,
    newStartTime?: string,
    newEndTime?: string
  ): Promise<AppointmentChangeRequest> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const _requestData = {
      appointment_id: appointmentId,
      requested_by: user.id,
      request_type: requestType,
      reason,
      new_start_time: newStartTime,
      new_end_time: newEndTime
    };

    const { data, _error } = await supabase
      .from('appointment_change_requests')
      .insert(_requestData)
      .select()
      .single();

    if (_error) throw _error;
    return data as AppointmentChangeRequest;
  }

  // Respond to change request (for providers)
  static async respondToChangeRequest(
    _requestId: string,
    _status: 'approved' | 'rejected',
    response?: string
  ): Promise<void> {
    const { data: request, _error: fetchError } = await supabase
      .from('appointment_change_requests')
      .select('*, appointment:appointments(*)')
      .eq('id', _requestId)
      .single();

    if (fetchError) throw fetchError;

    // Update the change request
    const { _error: updateError } = await supabase
      .from('appointment_change_requests')
      .update({
        _status,
        _provider_response: response,
        _responded_at: new Date().toISOString()
      })
      .eq('id', _requestId);

    if (updateError) throw updateError;

    // If approved, update the appointment
    if (_status === 'approved' && request) {
      if (request.request_type === 'cancel') {
        await this.updateAppointmentStatus(request.appointment_id, 'cancelled');
      } else if (request.request_type === 'reschedule' && request.new_start_time) {
        const { _error: rescheduleError } = await supabase
          .from('appointments')
          .update({
            start_time: request.new_start_time,
            _end_time: request.new_end_time,
            _status: 'rescheduled'
          })
          .eq('id', request.appointment_id);

        if (rescheduleError) throw rescheduleError;
      }
    }
  }

  // Add to waitlist
  static async addToWaitlist(
    _providerId: string,
    appointmentType: string,
    preferredDate?: string,
    preferredTimeStart?: string,
    preferredTimeEnd?: string,
    notes?: string
  ): Promise<AppointmentWaitlist> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const _waitlistData = {
      provider_id: _providerId,
      patient_id: user.id,
      appointment_type: appointmentType,
      preferred_date: preferredDate,
      preferred_time_start: preferredTimeStart,
      preferred_time_end: preferredTimeEnd,
      notes,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    };

    const { data, _error } = await supabase
      .from('appointment_waitlist')
      .insert(_waitlistData)
      .select()
      .single();

    if (_error) throw _error;
    return data as AppointmentWaitlist;
  }

  // Get provider availability
  static async getProviderAvailability(_providerId: string): Promise<ProviderAvailability[]> {
    const { data, _error } = await supabase
      .from('provider_availability')
      .select('*')
      .eq('provider_id', _providerId)
      .eq('is_available', _true)
      .order('day_of_week')
      .order('start_time');

    if (_error) throw _error;
    return (data || []) as ProviderAvailability[];
  }

  // Generate telehealth session details
  static async getTelehealthSession(appointmentId: string): Promise<TelehealthSession | null> {
    const { data, _error } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .eq('location_type', 'telehealth')
      .single();

    if (_error) throw _error;
    if (!data) return null;

    return {
      appointment_id: appointmentId,
      video_link: data.video_link || '',
      waiting_room_active: data.waiting_room_enabled,
      participant_status: {},
      pre_forms_completed: false,
      post_survey_completed: false
    };
  }

  // Private helper methods
  private static async createRecurringAppointments(
    _parentId: string, 
    _bookingData: BookingFormData
  ): Promise<void> {
    if (!_bookingData.recurrence_pattern) return;

    const { frequency, _end_date, count } = _bookingData.recurrence_pattern;
    const _startDate = new Date(_bookingData.start_time);
    const _endDate = new Date(_bookingData._end_time);
    const appointments: unknown[] = [];

    const currentDate = new Date(_startDate);
    let appointmentCount = 0;
    const maxCount = count || 10;
    const maxDate = _end_date ? new Date(_end_date) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    while (appointmentCount < maxCount && currentDate <= maxDate) {
      // Increment date based on frequency
      if (frequency === 'weekly') {
        currentDate.setDate(currentDate.getDate() + 7);
      } else if (frequency === 'biweekly') {
        currentDate.setDate(currentDate.getDate() + 14);
      } else if (frequency === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      if (currentDate <= maxDate) {
        const recurringEndDate = new Date(currentDate);
        recurringEndDate.setTime(recurringEndDate.getTime() + (_endDate.getTime() - _startDate.getTime()));

        appointments.push({
          ..._bookingData,
          start_time: currentDate.toISOString(),
          _end_time: recurringEndDate.toISOString(),
          parent_appointment_id: _parentId,
          video_link: _bookingData.location_type === 'telehealth' ? 
            `${window.location.origin}/telehealth/${crypto.randomUUID()}` : null
        });

        appointmentCount++;
      }
    }

    if (appointments.length > 0) {
      const { _error } = await supabase
        .from('appointments')
        .insert(appointments);

      if (_error) throw _error;
    }
  }

  private static async scheduleReminders(appointmentId: string): Promise<void> {
    const { data: appointment } = await supabase
      .from('appointments')
      .select('start_time')
      .eq('id', appointmentId)
      .single();

    if (!appointment) return;

    const startTime = new Date(appointment.start_time);
    const reminders = [
      {
        appointment_id: appointmentId,
        reminder_type: '24hr' as const,
        reminder_method: '_email' as const,
        scheduled_for: new Date(startTime.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        message_content: 'Your appointment is scheduled for tomorrow.'
      },
      {
        appointment_id: appointmentId,
        reminder_type: '2hr' as const,
        reminder_method: 'push' as const,
        scheduled_for: new Date(startTime.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        message_content: 'Your appointment starts in 2 hours.'
      }
    ];

    const { _error } = await supabase
      .from('appointment_reminders')
      .insert(reminders);

    if (_error) console._error('Failed to schedule reminders:', _error);
  }
}