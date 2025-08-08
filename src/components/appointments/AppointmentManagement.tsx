import React, { useState, useEffect } from 'react';
import { Calendar, Filter, Search, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppointmentCard } from './AppointmentCard';
import { AppointmentBookingFlow } from './AppointmentBookingFlow';
import { AppointmentChangeRequestDialog } from './AppointmentChangeRequestDialog';
import { TelehealthWaitingRoom } from './TelehealthWaitingRoom';
import { AppointmentService } from '@/services/appointmentService';
import { Appointment } from '@/types/appointment';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

interface AppointmentManagementProps {
  userRole: 'patient' | 'provider';
  providerId?: string;
}

export const AppointmentManagement: React.FC<AppointmentManagementProps> = ({
  userRole,
  providerId
}) => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [_dateRange, setDateRange] = useState<string>('week');
  const [showBookingFlow, setShowBookingFlow] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<unknown>(_null);
  const [changeRequestDialog, setChangeRequestDialog] = useState<{
    open: boolean;
    _appointmentId: string;
    _type: 'reschedule' | 'cancel';
  }>({ open: false, _appointmentId: '', _type: 'reschedule' });
  const [telehealthSession, setTelehealthSession] = useState<{
    open: boolean;
    _appointmentId: string;
  }>({ open: false, _appointmentId: '' });

  useEffect(() => {
    loadAppointments();
  }, [statusFilter, _dateRange]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      
      let _startDate: string | undefined;
      let _endDate: string | undefined;

      const now = new Date();
      switch (_dateRange) {
        case 'week':
          _startDate = startOfWeek(now).toISOString();
          _endDate = endOfWeek(now).toISOString();
          break;
        case 'month':
          _startDate = startOfMonth(now).toISOString();
          _endDate = endOfMonth(now).toISOString();
          break;
        case 'upcoming':
          _startDate = now.toISOString();
          break;
      }

      const _data = await AppointmentService.getUserAppointments(
        user?.id,
        statusFilter === 'all' ? undefined : statusFilter,
        _startDate,
        _endDate
      );
      
      setAppointments(_data);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = (_appointmentId: string) => {
    setChangeRequestDialog({
      open: true,
      _appointmentId,
      _type: 'reschedule'
    });
  };

  const handleCancel = (_appointmentId: string) => {
    setChangeRequestDialog({
      open: true,
      _appointmentId,
      _type: 'cancel'
    });
  };

  const handleJoinVideo = (_appointmentId: string) => {
    setTelehealthSession({
      open: true,
      _appointmentId
    });
  };

  const handleMarkComplete = async (_appointmentId: string) => {
    try {
      await AppointmentService.updateAppointmentStatus(_appointmentId, 'completed');
      toast.success('Appointment marked as completed');
      loadAppointments();
    } catch (error) {
      toast.error('Failed to update appointment status');
    }
  };

  const handleMarkNoShow = async (_appointmentId: string) => {
    try {
      await AppointmentService.updateAppointmentStatus(_appointmentId, 'no_show');
      toast.success('Appointment marked as no show');
      loadAppointments();
    } catch (error) {
      toast.error('Failed to update appointment status');
    }
  };

  const filteredAppointments = appointments.filter(appointment => {
    if (searchTerm) {
      const _searchLower = searchTerm.toLowerCase();
      return (
        appointment.title?.toLowerCase().includes(_searchLower) ||
        appointment.appointment_type.toLowerCase().includes(_searchLower) ||
        (appointment as any).provider?.name?.toLowerCase().includes(_searchLower) ||
        (appointment as any).patient?.full_name?.toLowerCase().includes(_searchLower)
      );
    }
    return true;
  });

  const getTabCounts = () => {
    const now = new Date();
    return {
      upcoming: appointments.filter(apt => new Date(apt.start_time) > now).length,
      past: appointments.filter(apt => new Date(apt.start_time) <= now).length,
      cancelled: appointments.filter(apt => apt.status === 'cancelled').length
    };
  };

  const tabCounts = getTabCounts();

  if (showBookingFlow && selectedProvider) {
    return (
      <AppointmentBookingFlow
        provider={selectedProvider}
        onBookingComplete={(_appointmentId) => {
          setShowBookingFlow(false);
          setSelectedProvider(_null);
          loadAppointments();
          toast.success('Appointment booked successfully!');
        }}
        onCancel={() => {
          setShowBookingFlow(false);
          setSelectedProvider(_null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-muted-foreground">
            {userRole === 'patient' ? 'Manage your appointments' : 'Manage patient appointments'}
          </p>
        </div>
        
        {userRole === 'patient' && (
          <Button onClick={() => setShowBookingFlow(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Book Appointment
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search appointments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={_dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Appointments Tabs */}
      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({tabCounts.upcoming})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({tabCounts.past})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled ({tabCounts.cancelled})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredAppointments.filter(apt => 
            new Date(apt.start_time) > new Date() && apt.status !== 'cancelled'
          ).length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No upcoming appointments</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredAppointments
                .filter(apt => new Date(apt.start_time) > new Date() && apt.status !== 'cancelled')
                .map(appointment => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    userRole={userRole}
                    onReschedule={handleReschedule}
                    onCancel={handleCancel}
                    onJoinVideo={handleJoinVideo}
                    onMarkComplete={handleMarkComplete}
                    onMarkNoShow={handleMarkNoShow}
                  />
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {filteredAppointments
            .filter(apt => new Date(apt.start_time) <= new Date() && apt.status !== 'cancelled')
            .map(appointment => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                userRole={userRole}
                onJoinVideo={handleJoinVideo}
              />
            ))}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4">
          {filteredAppointments
            .filter(apt => apt.status === 'cancelled')
            .map(appointment => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                userRole={userRole}
              />
            ))}
        </TabsContent>
      </Tabs>

      {/* Change Request Dialog */}
      <AppointmentChangeRequestDialog
        open={changeRequestDialog.open}
        _appointmentId={changeRequestDialog._appointmentId}
        requestType={changeRequestDialog._type}
        onClose={() => setChangeRequestDialog({ open: false, _appointmentId: '', _type: 'reschedule' })}
        onSuccess={() => {
          setChangeRequestDialog({ open: false, _appointmentId: '', _type: 'reschedule' });
          loadAppointments();
        }}
      />

      {/* Telehealth Waiting Room */}
      <TelehealthWaitingRoom
        open={telehealthSession.open}
        _appointmentId={telehealthSession._appointmentId}
        userRole={userRole}
        onClose={() => setTelehealthSession({ open: false, _appointmentId: '' })}
      />
    </div>
  );
};