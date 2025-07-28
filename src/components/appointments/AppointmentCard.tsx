import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Video, Phone, User, MoreVertical, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Appointment } from '@/types/appointment';
import { format, parseISO, isBefore, isAfter, addHours } from 'date-fns';

interface AppointmentCardProps {
  appointment: Appointment;
  userRole: 'patient' | 'provider';
  onReschedule?: (appointmentId: string) => void;
  onCancel?: (appointmentId: string) => void;
  onJoinVideo?: (appointmentId: string) => void;
  onMarkComplete?: (appointmentId: string) => void;
  onMarkNoShow?: (appointmentId: string) => void;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  userRole,
  onReschedule,
  onCancel,
  onJoinVideo,
  onMarkComplete,
  onMarkNoShow
}) => {
  const startTime = parseISO(appointment.start_time);
  const endTime = parseISO(appointment.end_time);
  const now = new Date();
  const isUpcoming = isAfter(startTime, now);
  const isActive = isBefore(now, endTime) && isAfter(now, startTime);
  const isPast = isBefore(endTime, now);
  const canJoinVideo = appointment.location_type === 'telehealth' && 
    (isActive || isBefore(now, addHours(startTime, 0.25))); // Can join 15 min before

  const getStatusBadge = () => {
    const statusConfig = {
      scheduled: { variant: 'default' as const, label: 'Scheduled' },
      confirmed: { variant: 'default' as const, label: 'Confirmed' },
      cancelled: { variant: 'destructive' as const, label: 'Cancelled' },
      completed: { variant: 'secondary' as const, label: 'Completed' },
      no_show: { variant: 'destructive' as const, label: 'No Show' },
      rescheduled: { variant: 'secondary' as const, label: 'Rescheduled' }
    };

    const config = statusConfig[appointment.status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getLocationIcon = () => {
    switch (appointment.location_type) {
      case 'telehealth':
        return <Video className="h-4 w-4" />;
      case 'phone':
        return <Phone className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  const canReschedule = isUpcoming && ['scheduled', 'confirmed'].includes(appointment.status);
  const canCancel = isUpcoming && ['scheduled', 'confirmed'].includes(appointment.status);

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${
      isActive ? 'ring-2 ring-primary' : ''
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">
                {appointment.title || `${appointment.appointment_type.replace('_', ' ').toUpperCase()} Session`}
              </h3>
              {getStatusBadge()}
            </div>

            {/* Participant Info */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>
                {userRole === 'patient' 
                  ? `with ${(appointment as any).provider?.name || 'Provider'}`
                  : `with ${(appointment as any).patient?.full_name || 'Patient'}`
                }
              </span>
            </div>

            {/* Date & Time */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(startTime, 'EEEE, MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                </span>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-2 text-sm">
              {getLocationIcon()}
              <span className="capitalize">
                {appointment.location_type.replace('_', ' ')}
                {appointment.location_type === 'in_person' && appointment.location_details?.address && (
                  <span className="text-muted-foreground ml-1">
                    • {appointment.location_details.address}
                  </span>
                )}
              </span>
            </div>

            {/* Notes */}
            {appointment.booking_notes && (
              <div className="text-sm text-muted-foreground bg-accent/50 p-2 rounded">
                <strong>Notes:</strong> {appointment.booking_notes}
              </div>
            )}

            {/* Recurring indicator */}
            {appointment.is_recurring && (
              <div className="flex items-center gap-1 text-xs text-blue-600">
                <AlertCircle className="h-3 w-3" />
                <span>Recurring appointment</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canJoinVideo && (
                <DropdownMenuItem onClick={() => onJoinVideo?.(appointment.id)}>
                  <Video className="h-4 w-4 mr-2" />
                  Join Video Call
                </DropdownMenuItem>
              )}
              
              {canReschedule && (
                <DropdownMenuItem onClick={() => onReschedule?.(appointment.id)}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Request Reschedule
                </DropdownMenuItem>
              )}
              
              {canCancel && (
                <DropdownMenuItem onClick={() => onCancel?.(appointment.id)}>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Cancel Appointment
                </DropdownMenuItem>
              )}

              {userRole === 'provider' && isActive && (
                <>
                  <DropdownMenuItem onClick={() => onMarkComplete?.(appointment.id)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Complete
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onMarkNoShow?.(appointment.id)}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Mark No Show
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          {canJoinVideo && (
            <Button 
              onClick={() => onJoinVideo?.(appointment.id)}
              className="flex items-center gap-2"
              size="sm"
            >
              <Video className="h-4 w-4" />
              Join Call
            </Button>
          )}
          
          {isActive && appointment.location_type === 'phone' && (
            <Button 
              variant="outline"
              size="sm"
              onClick={() => window.open(`tel:${appointment.location_details?.phone_number || ''}`)}
            >
              <Phone className="h-4 w-4 mr-2" />
              Call Now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};