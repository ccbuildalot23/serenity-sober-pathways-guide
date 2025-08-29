import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Card, Button, FAB, Chip, Avatar} from 'react-native-paper';
import {Calendar} from 'react-native-calendars';
import {format, isToday, isTomorrow, addDays, startOfDay} from 'date-fns';

import {useAuth} from '@contexts/AuthContext';
import {useTheme} from '@contexts/ThemeContext';
import {AppointmentService} from '@services/appointments';
import {VideoCallService} from '@services/videocall';
import {HapticService} from '@services/haptic';
import AppointmentCard from '@components/appointments/AppointmentCard';
import ProviderCard from '@components/appointments/ProviderCard';
import LoadingSpinner from '@components/common/LoadingSpinner';
import EmptyState from '@components/common/EmptyState';

interface Provider {
  id: string;
  name: string;
  title: string;
  specialty: string;
  credentials: string;
  avatar?: string;
  isOnline: boolean;
  rating: number;
  reviewCount: number;
  nextAvailable: string;
  languages: string[];
  acceptsInsurance: boolean;
}

interface Appointment {
  id: string;
  providerId: string;
  providerName: string;
  providerAvatar?: string;
  type: 'therapy' | 'psychiatry' | 'consultation' | 'check_in' | 'group';
  format: 'in_person' | 'video' | 'phone';
  scheduledTime: string;
  duration: number; // in minutes
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  location?: string;
  videoCallUrl?: string;
  notes?: string;
  documents?: string[];
  isRecurring: boolean;
  recurringPattern?: string;
  reminders: boolean;
  cost?: number;
  insuranceCovered: boolean;
}

interface TimeSlot {
  time: string;
  available: boolean;
  providerId: string;
}

const AppointmentsScreen: React.FC = () => {
  const navigation = useNavigation();
  const {user, profile} = useAuth();
  const {colors} = useTheme();
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTab, setSelectedTab] = useState<'upcoming' | 'calendar' | 'providers'>('upcoming');
  const [calendarMarks, setCalendarMarks] = useState({});

  useEffect(() => {
    loadAppointmentData();
  }, []);

  useEffect(() => {
    generateCalendarMarks();
  }, [appointments]);

  const loadAppointmentData = async () => {
    try {
      setLoading(true);
      
      const [appointmentsData, providersData] = await Promise.all([
        AppointmentService.getAppointments(user?.id!),
        AppointmentService.getProviders(),
      ]);
      
      setAppointments(appointmentsData);
      setProviders(providersData);
    } catch (error) {
      console.error('Failed to load appointment data:', error);
      Alert.alert('Error', 'Failed to load appointments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppointmentData();
    setRefreshing(false);
  };

  const generateCalendarMarks = () => {
    const marks: any = {};
    
    appointments.forEach(appointment => {
      const date = format(new Date(appointment.scheduledTime), 'yyyy-MM-dd');
      
      if (!marks[date]) {
        marks[date] = {
          dots: [],
          selected: date === selectedDate,
          selectedColor: colors.primary,
        };
      }
      
      // Add dot for appointment type
      const dotColor = getAppointmentColor(appointment.type);
      marks[date].dots.push({color: dotColor});
    });
    
    // Add selection for current date if no appointment
    if (!marks[selectedDate]) {
      marks[selectedDate] = {
        selected: true,
        selectedColor: colors.primary,
        dots: [],
      };
    }
    
    setCalendarMarks(marks);
  };

  const getAppointmentColor = (type: Appointment['type']) => {
    switch (type) {
      case 'therapy':
        return colors.primary;
      case 'psychiatry':
        return colors.secondary;
      case 'consultation':
        return colors.accent;
      case 'check_in':
        return '#4CAF50';
      case 'group':
        return '#FF9800';
      default:
        return colors.outline;
    }
  };

  const scheduleAppointment = () => {
    navigation.navigate('ScheduleAppointment');
  };

  const joinVideoCall = async (appointment: Appointment) => {
    try {
      if (!appointment.videoCallUrl) {
        Alert.alert('Error', 'Video call link not available.');
        return;
      }

      // Check if appointment is within 15 minutes of start time
      const appointmentTime = new Date(appointment.scheduledTime);
      const now = new Date();
      const timeDiff = appointmentTime.getTime() - now.getTime();
      const minutesToStart = Math.floor(timeDiff / (1000 * 60));

      if (minutesToStart > 15) {
        Alert.alert(
          'Too Early',
          `Your appointment starts in ${minutesToStart} minutes. You can join 15 minutes before.`,
          [{text: 'OK'}]
        );
        return;
      }

      // Initialize video call
      await VideoCallService.joinCall(appointment.videoCallUrl, {
        userId: user?.id!,
        userName: `${profile?.firstName} ${profile?.lastName}`,
        appointmentId: appointment.id,
      });

      HapticService.impact('light');
    } catch (error) {
      console.error('Failed to join video call:', error);
      Alert.alert('Error', 'Failed to join video call. Please try again.');
    }
  };

  const cancelAppointment = async (appointment: Appointment) => {
    Alert.alert(
      'Cancel Appointment',
      `Are you sure you want to cancel your appointment with ${appointment.providerName}?`,
      [
        {text: 'No', style: 'cancel'},
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await AppointmentService.cancelAppointment(appointment.id, user?.id!);
              
              setAppointments(prevAppointments =>
                prevAppointments.map(apt =>
                  apt.id === appointment.id ? {...apt, status: 'cancelled'} : apt
                )
              );
              
              HapticService.success();
              Alert.alert('Cancelled', 'Your appointment has been cancelled.');
            } catch (error) {
              console.error('Failed to cancel appointment:', error);
              Alert.alert('Error', 'Failed to cancel appointment. Please try again.');
            }
          },
        },
      ]
    );
  };

  const rescheduleAppointment = (appointment: Appointment) => {
    navigation.navigate('ScheduleAppointment', {
      rescheduleId: appointment.id,
      providerId: appointment.providerId,
    });
  };

  const viewProvider = (providerId: string) => {
    navigation.navigate('ProviderDetails', {providerId});
  };

  const renderUpcomingTab = () => {
    const now = new Date();
    const upcomingAppointments = appointments
      .filter(apt => 
        apt.status === 'scheduled' || apt.status === 'confirmed'
      )
      .filter(apt => new Date(apt.scheduledTime) >= now)
      .sort((a, b) => 
        new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
      );

    const todayAppointments = upcomingAppointments.filter(apt =>
      isToday(new Date(apt.scheduledTime))
    );

    const futureAppointments = upcomingAppointments.filter(apt =>
      !isToday(new Date(apt.scheduledTime))
    );

    return (
      <View>
        {todayAppointments.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: colors.text.primary}]}>
              Today
            </Text>
            {todayAppointments.map(appointment => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onJoinCall={() => joinVideoCall(appointment)}
                onCancel={() => cancelAppointment(appointment)}
                onReschedule={() => rescheduleAppointment(appointment)}
                onViewProvider={() => viewProvider(appointment.providerId)}
              />
            ))}
          </View>
        )}

        {futureAppointments.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: colors.text.primary}]}>
              Upcoming
            </Text>
            {futureAppointments.slice(0, 5).map(appointment => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onJoinCall={() => joinVideoCall(appointment)}
                onCancel={() => cancelAppointment(appointment)}
                onReschedule={() => rescheduleAppointment(appointment)}
                onViewProvider={() => viewProvider(appointment.providerId)}
              />
            ))}
            
            {futureAppointments.length > 5 && (
              <Button
                mode="text"
                onPress={() => navigation.navigate('AppointmentHistory')}
                style={styles.viewAllButton}
              >
                View All Appointments
              </Button>
            )}
          </View>
        )}

        {upcomingAppointments.length === 0 && (
          <EmptyState
            icon="event"
            title="No upcoming appointments"
            message="Schedule an appointment with a provider to get started on your mental health journey."
            actionText="Schedule Appointment"
            onAction={scheduleAppointment}
          />
        )}
      </View>
    );
  };

  const renderCalendarTab = () => {
    const selectedDateAppointments = appointments
      .filter(apt => {
        const aptDate = format(new Date(apt.scheduledTime), 'yyyy-MM-dd');
        return aptDate === selectedDate;
      })
      .sort((a, b) => 
        new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
      );

    return (
      <View>
        <Card style={[styles.calendarCard, {backgroundColor: colors.surface}]} elevation={2}>
          <Calendar
            current={selectedDate}
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markingType="multi-dot"
            markedDates={calendarMarks}
            theme={{
              backgroundColor: colors.surface,
              calendarBackground: colors.surface,
              textSectionTitleColor: colors.text.primary,
              selectedDayBackgroundColor: colors.primary,
              selectedDayTextColor: '#FFFFFF',
              todayTextColor: colors.primary,
              dayTextColor: colors.text.primary,
              textDisabledColor: colors.text.disabled,
              dotColor: colors.primary,
              selectedDotColor: '#FFFFFF',
              arrowColor: colors.primary,
              monthTextColor: colors.text.primary,
              indicatorColor: colors.primary,
            }}
          />
        </Card>

        <View style={styles.selectedDateSection}>
          <Text style={[styles.selectedDateTitle, {color: colors.text.primary}]}>
            {format(new Date(selectedDate), 'EEEE, MMMM d')}
          </Text>
          
          {selectedDateAppointments.length > 0 ? (
            selectedDateAppointments.map(appointment => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onJoinCall={() => joinVideoCall(appointment)}
                onCancel={() => cancelAppointment(appointment)}
                onReschedule={() => rescheduleAppointment(appointment)}
                onViewProvider={() => viewProvider(appointment.providerId)}
                compact
              />
            ))
          ) : (
            <View style={styles.noAppointments}>
              <Icon name="event-available" size={32} color={colors.outline} />
              <Text style={[styles.noAppointmentsText, {color: colors.text.secondary}]}>
                No appointments on this date
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderProvidersTab = () => {
    const availableProviders = providers
      .filter(provider => provider.isOnline)
      .sort((a, b) => b.rating - a.rating);

    return (
      <View>
        <Text style={[styles.sectionTitle, {color: colors.text.primary}]}>
          Available Providers
        </Text>
        
        {availableProviders.map(provider => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            onSchedule={() => navigation.navigate('ScheduleAppointment', {providerId: provider.id})}
            onViewDetails={() => viewProvider(provider.id)}
          />
        ))}
        
        {availableProviders.length === 0 && (
          <EmptyState
            icon="medical-services"
            title="No providers available"
            message="All providers are currently busy. Please try again later or schedule for a future time."
          />
        )}
      </View>
    );
  };

  const renderTabs = () => (
    <View style={[styles.tabContainer, {backgroundColor: colors.surface}]}>
      {(['upcoming', 'calendar', 'providers'] as const).map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[
            styles.tab,
            selectedTab === tab && {backgroundColor: colors.primary},
          ]}
          onPress={() => setSelectedTab(tab)}
        >
          <Text
            style={[
              styles.tabText,
              {color: selectedTab === tab ? '#FFFFFF' : colors.text.secondary},
            ]}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'upcoming':
        return renderUpcomingTab();
      case 'calendar':
        return renderCalendarTab();
      case 'providers':
        return renderProvidersTab();
      default:
        return null;
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading appointments..." />;
  }

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, {color: colors.text.primary}]}>
          Appointments
        </Text>
      </View>

      {renderTabs()}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {renderTabContent()}
      </ScrollView>

      <FAB
        style={[styles.fab, {backgroundColor: colors.primary}]}
        icon="add"
        label="Schedule"
        onPress={scheduleAppointment}
        color="#FFFFFF"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  viewAllButton: {
    marginTop: 8,
  },
  calendarCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  selectedDateSection: {
    marginTop: 8,
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  noAppointments: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noAppointmentsText: {
    marginTop: 8,
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default AppointmentsScreen;