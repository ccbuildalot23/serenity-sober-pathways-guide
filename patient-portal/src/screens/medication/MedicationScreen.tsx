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
import {Card, Button, FAB, Progress, Chip} from 'react-native-paper';
import {format, isToday, isTomorrow, addDays} from 'date-fns';

import {useAuth} from '@contexts/AuthContext';
import {useTheme} from '@contexts/ThemeContext';
import {MedicationService} from '@services/medication';
import {NotificationService} from '@services/notifications';
import {HapticService} from '@services/haptic';
import MedicationCard from '@components/medication/MedicationCard';
import TodaysSchedule from '@components/medication/TodaysSchedule';
import AdherenceChart from '@components/medication/AdherenceChart';
import LoadingSpinner from '@components/common/LoadingSpinner';
import EmptyState from '@components/common/EmptyState';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: 'once_daily' | 'twice_daily' | 'three_times_daily' | 'four_times_daily' | 'as_needed';
  instructions: string;
  prescribedBy: string;
  startDate: string;
  endDate?: string;
  reminderTimes: string[];
  isActive: boolean;
  sideEffects?: string[];
  notes?: string;
  color: string;
  shape: 'round' | 'oval' | 'square' | 'capsule';
}

interface MedicationDose {
  id: string;
  medicationId: string;
  medicationName: string;
  scheduledTime: string;
  takenTime?: string;
  status: 'pending' | 'taken' | 'missed' | 'skipped';
  notes?: string;
  sideEffects?: string[];
}

interface AdherenceStats {
  todaysTaken: number;
  todaysTotal: number;
  weeklyAdherence: number;
  monthlyAdherence: number;
  streakDays: number;
  missedDoses: number;
}

const MedicationScreen: React.FC = () => {
  const navigation = useNavigation();
  const {user} = useAuth();
  const {colors} = useTheme();
  
  const [medications, setMedications] = useState<Medication[]>([]);
  const [todaysDoses, setTodaysDoses] = useState<MedicationDose[]>([]);
  const [adherenceStats, setAdherenceStats] = useState<AdherenceStats>({
    todaysTaken: 0,
    todaysTotal: 0,
    weeklyAdherence: 0,
    monthlyAdherence: 0,
    streakDays: 0,
    missedDoses: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'today' | 'medications' | 'history'>('today');

  useEffect(() => {
    loadMedicationData();
  }, []);

  useEffect(() => {
    // Set up medication reminders
    setupMedicationReminders();
  }, [medications]);

  const loadMedicationData = async () => {
    try {
      setLoading(true);
      
      const [medsData, dosesData, statsData] = await Promise.all([
        MedicationService.getMedications(user?.id!),
        MedicationService.getTodaysDoses(user?.id!),
        MedicationService.getAdherenceStats(user?.id!),
      ]);
      
      setMedications(medsData);
      setTodaysDoses(dosesData);
      setAdherenceStats(statsData);
    } catch (error) {
      console.error('Failed to load medication data:', error);
      Alert.alert('Error', 'Failed to load medication data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMedicationData();
    setRefreshing(false);
  };

  const setupMedicationReminders = async () => {
    try {
      // Cancel existing reminders
      await NotificationService.cancelMedicationReminders(user?.id!);
      
      // Set up new reminders for active medications
      for (const medication of medications.filter(m => m.isActive)) {
        await NotificationService.scheduleMedicationReminders({
          userId: user?.id!,
          medicationId: medication.id,
          medicationName: medication.name,
          dosage: medication.dosage,
          reminderTimes: medication.reminderTimes,
          startDate: medication.startDate,
          endDate: medication.endDate,
        });
      }
    } catch (error) {
      console.error('Failed to setup medication reminders:', error);
    }
  };

  const takeMedication = async (dose: MedicationDose) => {
    try {
      HapticService.impact('light');
      
      const result = await MedicationService.recordDose({
        doseId: dose.id,
        userId: user?.id!,
        takenTime: new Date().toISOString(),
        status: 'taken',
      });
      
      if (result.success) {
        // Update local state
        setTodaysDoses(prevDoses =>
          prevDoses.map(d =>
            d.id === dose.id
              ? {...d, status: 'taken', takenTime: new Date().toISOString()}
              : d
          )
        );
        
        // Update adherence stats
        setAdherenceStats(prevStats => ({
          ...prevStats,
          todaysTaken: prevStats.todaysTaken + 1,
        }));
        
        HapticService.success();
        
        // Show success message
        Alert.alert(
          'Medication Taken',
          `${dose.medicationName} recorded successfully.`,
          [{text: 'OK'}]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to record medication.');
      }
    } catch (error) {
      console.error('Failed to take medication:', error);
      Alert.alert('Error', 'Failed to record medication. Please try again.');
    }
  };

  const skipMedication = async (dose: MedicationDose) => {
    Alert.alert(
      'Skip Medication',
      `Are you sure you want to skip ${dose.medicationName}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Skip',
          style: 'destructive',
          onPress: async () => {
            try {
              await MedicationService.recordDose({
                doseId: dose.id,
                userId: user?.id!,
                status: 'skipped',
              });
              
              setTodaysDoses(prevDoses =>
                prevDoses.map(d =>
                  d.id === dose.id ? {...d, status: 'skipped'} : d
                )
              );
              
              HapticService.impact('medium');
            } catch (error) {
              console.error('Failed to skip medication:', error);
              Alert.alert('Error', 'Failed to skip medication. Please try again.');
            }
          },
        },
      ]
    );
  };

  const addMedication = () => {
    navigation.navigate('AddMedication');
  };

  const editMedication = (medication: Medication) => {
    navigation.navigate('EditMedication', {medicationId: medication.id});
  };

  const deleteMedication = async (medication: Medication) => {
    Alert.alert(
      'Delete Medication',
      `Are you sure you want to delete ${medication.name}? This will also cancel all future reminders.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await MedicationService.deleteMedication(medication.id, user?.id!);
              await NotificationService.cancelMedicationReminders(user?.id!, medication.id);
              
              setMedications(prevMeds => prevMeds.filter(m => m.id !== medication.id));
              setTodaysDoses(prevDoses => prevDoses.filter(d => d.medicationId !== medication.id));
              
              HapticService.success();
            } catch (error) {
              console.error('Failed to delete medication:', error);
              Alert.alert('Error', 'Failed to delete medication. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderTodaysOverview = () => {
    const todaysProgress = adherenceStats.todaysTotal > 0 
      ? adherenceStats.todaysTaken / adherenceStats.todaysTotal 
      : 0;

    return (
      <Card style={[styles.overviewCard, {backgroundColor: colors.surface}]} elevation={2}>
        <View style={styles.overviewContent}>
          <View style={styles.progressSection}>
            <Text style={[styles.overviewTitle, {color: colors.text.primary}]}>
              Today's Progress
            </Text>
            <View style={styles.progressContainer}>
              <Progress.Circle
                size={80}
                progress={todaysProgress}
                color={colors.primary}
                unfilledColor={colors.outline}
                borderWidth={0}
                thickness={8}
                showsText
                textStyle={[styles.progressText, {color: colors.text.primary}]}
              />
              <View style={styles.progressInfo}>
                <Text style={[styles.progressLabel, {color: colors.text.secondary}]}>
                  {adherenceStats.todaysTaken} of {adherenceStats.todaysTotal} doses
                </Text>
                <Text style={[styles.progressSubLabel, {color: colors.text.secondary}]}>
                  {Math.round(todaysProgress * 100)}% complete
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, {color: colors.primary}]}>
                {adherenceStats.streakDays}
              </Text>
              <Text style={[styles.statLabel, {color: colors.text.secondary}]}>
                Day Streak
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, {color: colors.secondary}]}>
                {Math.round(adherenceStats.weeklyAdherence * 100)}%
              </Text>
              <Text style={[styles.statLabel, {color: colors.text.secondary}]}>
                Weekly
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, {color: colors.accent}]}>
                {Math.round(adherenceStats.monthlyAdherence * 100)}%
              </Text>
              <Text style={[styles.statLabel, {color: colors.text.secondary}]}>
                Monthly
              </Text>
            </View>
          </View>
        </View>
      </Card>
    );
  };

  const renderTodaysSchedule = () => {
    const upcomingDoses = todaysDoses
      .filter(dose => dose.status === 'pending')
      .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());

    const completedDoses = todaysDoses
      .filter(dose => dose.status === 'taken')
      .sort((a, b) => new Date(b.takenTime!).getTime() - new Date(a.takenTime!).getTime());

    return (
      <Card style={[styles.scheduleCard, {backgroundColor: colors.surface}]} elevation={2}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, {color: colors.text.primary}]}>
            Today's Schedule
          </Text>
          <Chip
            mode="outlined"
            style={{borderColor: colors.primary}}
            textStyle={{color: colors.primary}}
          >
            {format(new Date(), 'MMM dd')}
          </Chip>
        </View>

        {upcomingDoses.length > 0 && (
          <View style={styles.dosesSection}>
            <Text style={[styles.sectionTitle, {color: colors.text.primary}]}>
              Upcoming ({upcomingDoses.length})
            </Text>
            {upcomingDoses.map((dose) => (
              <View key={dose.id} style={[styles.doseItem, {borderLeftColor: colors.primary}]}>
                <View style={styles.doseInfo}>
                  <Text style={[styles.doseMedication, {color: colors.text.primary}]}>
                    {dose.medicationName}
                  </Text>
                  <Text style={[styles.doseTime, {color: colors.text.secondary}]}>
                    {format(new Date(dose.scheduledTime), 'HH:mm')}
                  </Text>
                </View>
                
                <View style={styles.doseActions}>
                  <Button
                    mode="text"
                    onPress={() => skipMedication(dose)}
                    textColor={colors.error}
                    compact
                  >
                    Skip
                  </Button>
                  <Button
                    mode="contained"
                    onPress={() => takeMedication(dose)}
                    buttonColor={colors.primary}
                    compact
                  >
                    Take
                  </Button>
                </View>
              </View>
            ))}
          </View>
        )}

        {completedDoses.length > 0 && (
          <View style={styles.dosesSection}>
            <Text style={[styles.sectionTitle, {color: colors.text.primary}]}>
              Completed ({completedDoses.length})
            </Text>
            {completedDoses.slice(0, 3).map((dose) => (
              <View key={dose.id} style={[styles.doseItem, {borderLeftColor: colors.outline}]}>
                <View style={styles.doseInfo}>
                  <Text style={[styles.doseMedication, {color: colors.text.secondary}]}>
                    {dose.medicationName}
                  </Text>
                  <Text style={[styles.doseTime, {color: colors.text.secondary}]}>
                    Taken at {format(new Date(dose.takenTime!), 'HH:mm')}
                  </Text>
                </View>
                
                <Icon name="check-circle" size={24} color={colors.primary} />
              </View>
            ))}
          </View>
        )}

        {upcomingDoses.length === 0 && completedDoses.length === 0 && (
          <View style={styles.emptySchedule}>
            <Icon name="medication" size={48} color={colors.outline} />
            <Text style={[styles.emptyText, {color: colors.text.secondary}]}>
              No medications scheduled for today
            </Text>
          </View>
        )}
      </Card>
    );
  };

  const renderMedicationsList = () => (
    <View style={styles.medicationsSection}>
      {medications.map((medication) => (
        <MedicationCard
          key={medication.id}
          medication={medication}
          onEdit={() => editMedication(medication)}
          onDelete={() => deleteMedication(medication)}
          onToggleActive={async (isActive) => {
            try {
              await MedicationService.updateMedication(medication.id, {isActive}, user?.id!);
              setMedications(prevMeds =>
                prevMeds.map(m => m.id === medication.id ? {...m, isActive} : m)
              );
            } catch (error) {
              console.error('Failed to update medication:', error);
            }
          }}
        />
      ))}
    </View>
  );

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'today':
        return (
          <View>
            {renderTodaysOverview()}
            {renderTodaysSchedule()}
          </View>
        );
      case 'medications':
        return medications.length > 0 ? (
          renderMedicationsList()
        ) : (
          <EmptyState
            icon="medication"
            title="No medications added"
            message="Add your medications to track doses and set up reminders."
            actionText="Add Medication"
            onAction={addMedication}
          />
        );
      case 'history':
        return <AdherenceChart userId={user?.id!} />;
      default:
        return null;
    }
  };

  const renderTabs = () => (
    <View style={[styles.tabContainer, {backgroundColor: colors.surface}]}>
      {(['today', 'medications', 'history'] as const).map((tab) => (
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

  if (loading) {
    return <LoadingSpinner message="Loading medications..." />;
  }

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, {color: colors.text.primary}]}>
          Medications
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
        onPress={addMedication}
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
  overviewCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  overviewContent: {
    padding: 20,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  progressText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressInfo: {
    flex: 1,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  progressSubLabel: {
    fontSize: 14,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  scheduleCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  dosesSection: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  doseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  doseInfo: {
    flex: 1,
  },
  doseMedication: {
    fontSize: 16,
    fontWeight: '500',
  },
  doseTime: {
    fontSize: 14,
    marginTop: 2,
  },
  doseActions: {
    flexDirection: 'row',
    gap: 8,
  },
  emptySchedule: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 12,
    textAlign: 'center',
  },
  medicationsSection: {
    gap: 12,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default MedicationScreen;