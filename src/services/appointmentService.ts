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
    providerId: string, 
    date: string, 
    durationMinutes: number = 60
  ): Promise<AppointmentSlot[]> {
    const { data, error } = await supabase.rpc('get_available_slots', {
      p_provider_id: providerId,
      p_date: date,
      p_duration_minutes: durationMinutes
    });
    
    if (error) throw error;
    return data || [];
  }

  // Check for appointment conflicts
  static async checkConflicts(
    providerId: string,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: string
  ): Promise<boolean> {
    const { data, error } = await supabase.rpc('check_appointment_conflicts', {
      p_provider_id: providerId,
      p_start_time: startTime,
      p_end_time: endTime,
      p_exclude_appointment_id: excludeAppointmentId
    });
    
    if (error) throw error;
    return data;
  }

  // Book a new appointment
  static async bookAppointment(bookingData: BookingFormData): Promise<Appointment> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check for conflicts first
    const hasConflicts = await this.checkConflicts(
      bookingData.provider_id,
      bookingData.start_time,
      bookingData.end_time
    );

    if (hasConflicts) {
      throw new Error('Time slot is no longer available');
    }

    const appointmentData = {
      provider_id: bookingData.provider_id,
      patient_id: user.id,
      appointment_type: bookingData.appointment_type,
      start_time: bookingData.start_time,
      end_time: bookingData.end_time,
      duration_minutes: bookingData.duration_minutes,
      location_type: bookingData.location_type,
      title: bookingData.title,
      description: bookingData.description,
      booking_notes: bookingData.booking_notes,
      is_recurring: bookingData.is_recurring || false,
      recurrence_pattern: bookingData.recurrence_pattern,
      // Generate video link for telehealth appointments
      video_link: bookingData.location_type === 'telehealth' ? 
        `${window.location.origin}/telehealth/${crypto.randomUUID()}` : null
    };

    const { data, error } = await supabase
      .from('appointments')
      .insert(appointmentData)
      .select()
      .single();

    if (error) throw error;

    // Create recurring appointments if specified
    if (bookingData.is_recurring && bookingData.recurrence_pattern) {
      await this.createRecurringAppointments(data.id, bookingData);
    }

    // Schedule reminders
    await this.scheduleReminders(data.id);

    return data as Appointment;
  }

  // Get user's appointments
  static async getUserAppointments(
    userId?: string,
    status?: string,
    startDate?: string,
    endDate?: string
  ): Promise<Appointment[]> {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = userId || user?.id;
    
    if (!targetUserId) throw new Error('User not authenticated');

    let query = supabase
      .from('appointments')
      .select(`
        *,
        provider:providers(name, title, photo_url),
        patient:profiles(full_name, email)
      `)
      .or(`patient_id.eq.${targetUserId},provider_id.eq.${targetUserId}`);

    if (status) {
      query = query.eq('status', status);
    }

    if (startDate) {
      query = query.gte('start_time', startDate);
    }

    if (endDate) {
      query = query.lte('start_time', endDate);
    }

    query = query.order('start_time', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as Appointment[];
  }

  // Update appointment status
  static async updateAppointmentStatus(
    appointmentId: string, 
    status: Appointment['status'],
    notes?: string
  ): Promise<void> {
    const updateData: any = { 
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString();
    } else if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    if (notes) {
      updateData.provider_notes = notes;
    }

    const { error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId);

    if (error) throw error;
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

    const requestData = {
      appointment_id: appointmentId,
      requested_by: user.id,
      request_type: requestType,
      reason,
      new_start_time: newStartTime,
      new_end_time: newEndTime
    };

    const { data, error } = await supabase
      .from('appointment_change_requests')
      .insert(requestData)
      .select()
      .single();

    if (error) throw error;
    return data as AppointmentChangeRequest;
  }

  // Respond to change request (for providers)
  static async respondToChangeRequest(
    requestId: string,
    status: 'approved' | 'rejected',
    response?: string
  ): Promise<void> {
    const { data: request, error: fetchError } = await supabase
      .from('appointment_change_requests')
      .select('*, appointment:appointments(*)')
      .eq('id', requestId)
      .single();

    if (fetchError) throw fetchError;

    // Update the change request
    const { error: updateError } = await supabase
      .from('appointment_change_requests')
      .update({
        status,
        provider_response: response,
        responded_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateError) throw updateError;

    // If approved, update the appointment
    if (status === 'approved' && request) {
      if (request.request_type === 'cancel') {
        await this.updateAppointmentStatus(request.appointment_id, 'cancelled');
      } else if (request.request_type === 'reschedule' && request.new_start_time) {
        const { error: rescheduleError } = await supabase
          .from('appointments')
          .update({
            start_time: request.new_start_time,
            end_time: request.new_end_time,
            status: 'rescheduled'
          })
          .eq('id', request.appointment_id);

        if (rescheduleError) throw rescheduleError;
      }
    }
  }

  // Add to waitlist
  static async addToWaitlist(
    providerId: string,
    appointmentType: string,
    preferredDate?: string,
    preferredTimeStart?: string,
    preferredTimeEnd?: string,
    notes?: string
  ): Promise<AppointmentWaitlist> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const waitlistData = {
      provider_id: providerId,
      patient_id: user.id,
      appointment_type: appointmentType,
      preferred_date: preferredDate,
      preferred_time_start: preferredTimeStart,
      preferred_time_end: preferredTimeEnd,
      notes,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    };

    const { data, error } = await supabase
      .from('appointment_waitlist')
      .insert(waitlistData)
      .select()
      .single();

    if (error) throw error;
    return data as AppointmentWaitlist;
  }

  // Get provider availability
  static async getProviderAvailability(providerId: string): Promise<ProviderAvailability[]> {
    const { data, error } = await supabase
      .from('provider_availability')
      .select('*')
      .eq('provider_id', providerId)
      .eq('is_available', true)
      .order('day_of_week')
      .order('start_time');

    if (error) throw error;
    return (data || []) as ProviderAvailability[];
  }

  // Generate telehealth session details
  static async getTelehealthSession(appointmentId: string): Promise<TelehealthSession | null> {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .eq('location_type', 'telehealth')
      .single();

    if (error) throw error;
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
    parentId: string, 
    bookingData: BookingFormData
  ): Promise<void> {
    if (!bookingData.recurrence_pattern) return;

    const { frequency, end_date, count } = bookingData.recurrence_pattern;
    const startDate = new Date(bookingData.start_time);
    const endDate = new Date(bookingData.end_time);
    const appointments: any[] = [];

    const currentDate = new Date(startDate);
    let appointmentCount = 0;
    const maxCount = count || 10;
    const maxDate = end_date ? new Date(end_date) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

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
        recurringEndDate.setTime(recurringEndDate.getTime() + (endDate.getTime() - startDate.getTime()));

        appointments.push({
          ...bookingData,
          start_time: currentDate.toISOString(),
          end_time: recurringEndDate.toISOString(),
          parent_appointment_id: parentId,
          video_link: bookingData.location_type === 'telehealth' ? 
            `${window.location.origin}/telehealth/${crypto.randomUUID()}` : null
        });

        appointmentCount++;
      }
    }

    if (appointments.length > 0) {
      const { error } = await supabase
        .from('appointments')
        .insert(appointments);

      if (error) throw error;
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
        reminder_method: 'email' as const,
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

    const { error } = await supabase
      .from('appointment_reminders')
      .insert(reminders);

    if (error) console.error('Failed to schedule reminders:', error);
  }
}