import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Card, Button, ProgressBar} from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';
import {format, isToday, differenceInDays} from 'date-fns';

import {useAuth} from '@contexts/AuthContext';
import {useTheme} from '@contexts/ThemeContext';
import {CheckinService} from '@services/checkin';
import {HapticService} from '@services/haptic';
import {VoiceService} from '@services/voice';
import MoodSelector from '@components/checkin/MoodSelector';
import AnxietyScale from '@components/checkin/AnxietyScale';
import SleepTracker from '@components/checkin/SleepTracker';
import SubstanceTracker from '@components/checkin/SubstanceTracker';
import LoadingSpinner from '@components/common/LoadingSpinner';

const {width} = Dimensions.get('window');

interface CheckinData {
  id?: string;
  mood: number;
  anxiety: number;
  sleep: {
    hours: number;
    quality: number;
    sleepTime?: string;
    wakeTime?: string;
  };
  substance: {
    used: boolean;
    type?: string;
    amount?: string;
    triggers?: string[];
  };
  notes?: string;
  goals: string[];
  completedAt?: string;
}

interface CheckinProgress {
  currentStep: number;
  totalSteps: number;
  completed: boolean;
}

const CheckinScreen: React.FC = () => {
  const navigation = useNavigation();
  const {user} = useAuth();
  const {colors} = useTheme();
  
  const [checkinData, setCheckinData] = useState<CheckinData>({
    mood: 5,
    anxiety: 5,
    sleep: {hours: 8, quality: 5},
    substance: {used: false},
    goals: [],
  });
  
  const [progress, setProgress] = useState<CheckinProgress>({
    currentStep: 1,
    totalSteps: 4,
    completed: false,
  });
  
  const [loading, setLoading] = useState(false);
  const [todaysCheckin, setTodaysCheckin] = useState<CheckinData | null>(null);
  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    longestStreak: 0,
    totalCheckins: 0,
  });
  
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  useEffect(() => {
    loadTodaysCheckin();
    loadStreakData();
    initializeVoiceCommands();
  }, []);

  const loadTodaysCheckin = async () => {
    try {
      const checkin = await CheckinService.getTodaysCheckin(user?.id!);
      if (checkin) {
        setTodaysCheckin(checkin);
        setCheckinData(checkin);
        setProgress({...progress, completed: true});
      }
    } catch (error) {
      console.error('Failed to load today\'s checkin:', error);
    }
  };

  const loadStreakData = async () => {
    try {
      const streak = await CheckinService.getCheckinStreak(user?.id!);
      setStreakData(streak);
    } catch (error) {
      console.error('Failed to load streak data:', error);
    }
  };

  const initializeVoiceCommands = async () => {
    try {
      const commands = [
        {phrase: 'start checkin', action: () => startCheckin()},
        {phrase: 'mood good', action: () => setCheckinData({...checkinData, mood: 8})},
        {phrase: 'mood bad', action: () => setCheckinData({...checkinData, mood: 3})},
        {phrase: 'high anxiety', action: () => setCheckinData({...checkinData, anxiety: 8})},
        {phrase: 'low anxiety', action: () => setCheckinData({...checkinData, anxiety: 2})},
        {phrase: 'complete checkin', action: () => completeCheckin()},
      ];
      
      await VoiceService.registerCommands(commands);
      setVoiceEnabled(true);
    } catch (error) {
      console.log('Voice commands not available:', error);
    }
  };

  const startCheckin = () => {
    if (todaysCheckin) {
      Alert.alert(
        'Already Completed',
        'You have already completed your check-in for today. Would you like to update it?',
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Update', onPress: () => setProgress({...progress, completed: false})},
        ]
      );
      return;
    }

    setProgress({currentStep: 1, totalSteps: 4, completed: false});
    HapticService.impact('light');
  };

  const nextStep = () => {
    if (progress.currentStep < progress.totalSteps) {
      setProgress({...progress, currentStep: progress.currentStep + 1});
      HapticService.impact('light');
    } else {
      completeCheckin();
    }
  };

  const previousStep = () => {
    if (progress.currentStep > 1) {
      setProgress({...progress, currentStep: progress.currentStep - 1});
      HapticService.impact('light');
    }
  };

  const completeCheckin = async () => {
    try {
      setLoading(true);
      HapticService.impact('medium');

      const completedCheckin = {
        ...checkinData,
        completedAt: new Date().toISOString(),
      };

      const result = await CheckinService.submitCheckin(user?.id!, completedCheckin);
      
      if (result.success) {
        setTodaysCheckin(result.checkin);
        setProgress({...progress, completed: true});
        
        // Update streak data
        await loadStreakData();
        
        // Show celebration if milestone
        if (result.isMilestone) {
          showMilestoneCelebration(result.milestoneType!);
        }
        
        HapticService.success();
        
        // Voice feedback
        if (voiceEnabled) {
          VoiceService.speak('Check-in completed successfully!');
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to submit check-in');
        HapticService.error();
      }
    } catch (error) {
      console.error('Failed to complete checkin:', error);
      Alert.alert('Error', 'Failed to complete check-in. Please try again.');
      HapticService.error();
    } finally {
      setLoading(false);
    }
  };

  const showMilestoneCelebration = (type: string) => {
    Alert.alert(
      '🎉 Milestone Achieved!',
      `Congratulations! You've reached a ${type} milestone. Keep up the great work!`,
      [{text: 'Thanks!', onPress: () => HapticService.success()}]
    );
  };

  const renderWelcomeCard = () => (
    <Card style={[styles.welcomeCard, {backgroundColor: colors.primary}]} elevation={4}>
      <LinearGradient
        colors={[colors.primary, colors.primaryVariant]}
        style={styles.welcomeGradient}
      >
        <View style={styles.welcomeContent}>
          <Text style={[styles.welcomeTitle, {color: colors.onPrimary}]}>
            Good {getGreeting()}! 👋
          </Text>
          <Text style={[styles.welcomeSubtitle, {color: colors.onPrimary}]}>
            How are you feeling today?
          </Text>
          
          {todaysCheckin ? (
            <View style={styles.checkinCompleted}>
              <Icon name="check-circle" size={24} color={colors.onPrimary} />
              <Text style={[styles.completedText, {color: colors.onPrimary}]}>
                Today's check-in completed!
              </Text>
            </View>
          ) : (
            <Button
              mode="contained"
              onPress={startCheckin}
              style={[styles.startButton, {backgroundColor: colors.onPrimary}]}
              labelStyle={{color: colors.primary}}
            >
              Start Daily Check-in
            </Button>
          )}
        </View>
      </LinearGradient>
    </Card>
  );

  const renderStreakCard = () => (
    <Card style={[styles.streakCard, {backgroundColor: colors.surface}]} elevation={2}>
      <View style={styles.streakContent}>
        <View style={styles.streakItem}>
          <Text style={[styles.streakNumber, {color: colors.primary}]}>
            {streakData.currentStreak}
          </Text>
          <Text style={[styles.streakLabel, {color: colors.text.secondary}]}>
            Current Streak
          </Text>
        </View>
        
        <View style={styles.streakDivider} />
        
        <View style={styles.streakItem}>
          <Text style={[styles.streakNumber, {color: colors.secondary}]}>
            {streakData.longestStreak}
          </Text>
          <Text style={[styles.streakLabel, {color: colors.text.secondary}]}>
            Longest Streak
          </Text>
        </View>
        
        <View style={styles.streakDivider} />
        
        <View style={styles.streakItem}>
          <Text style={[styles.streakNumber, {color: colors.accent}]}>
            {streakData.totalCheckins}
          </Text>
          <Text style={[styles.streakLabel, {color: colors.text.secondary}]}>
            Total Check-ins
          </Text>
        </View>
      </View>
    </Card>
  );

  const renderCheckinProgress = () => {
    if (progress.completed) return null;

    return (
      <Card style={[styles.progressCard, {backgroundColor: colors.surface}]} elevation={2}>
        <View style={styles.progressContent}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, {color: colors.text.primary}]}>
              Daily Check-in Progress
            </Text>
            <Text style={[styles.progressStep, {color: colors.text.secondary}]}>
              Step {progress.currentStep} of {progress.totalSteps}
            </Text>
          </View>
          
          <ProgressBar
            progress={progress.currentStep / progress.totalSteps}
            color={colors.primary}
            style={styles.progressBar}
          />
          
          <View style={styles.stepContent}>
            {renderCurrentStep()}
          </View>
          
          <View style={styles.progressActions}>
            {progress.currentStep > 1 && (
              <Button
                mode="outlined"
                onPress={previousStep}
                style={styles.navButton}
              >
                Previous
              </Button>
            )}
            
            <Button
              mode="contained"
              onPress={progress.currentStep === progress.totalSteps ? completeCheckin : nextStep}
              style={styles.navButton}
              loading={loading}
              disabled={loading}
            >
              {progress.currentStep === progress.totalSteps ? 'Complete' : 'Next'}
            </Button>
          </View>
        </View>
      </Card>
    );
  };

  const renderCurrentStep = () => {
    switch (progress.currentStep) {
      case 1:
        return (
          <MoodSelector
            value={checkinData.mood}
            onChange={(mood) => setCheckinData({...checkinData, mood})}
          />
        );
      case 2:
        return (
          <AnxietyScale
            value={checkinData.anxiety}
            onChange={(anxiety) => setCheckinData({...checkinData, anxiety})}
          />
        );
      case 3:
        return (
          <SleepTracker
            value={checkinData.sleep}
            onChange={(sleep) => setCheckinData({...checkinData, sleep})}
          />
        );
      case 4:
        return (
          <SubstanceTracker
            value={checkinData.substance}
            onChange={(substance) => setCheckinData({...checkinData, substance})}
          />
        );
      default:
        return null;
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 18) return 'Afternoon';
    return 'Evening';
  };

  if (loading && !progress.completed) {
    return <LoadingSpinner message="Loading check-in..." />;
  }

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {renderWelcomeCard()}
        {renderStreakCard()}
        {renderCheckinProgress()}
        
        {voiceEnabled && (
          <Card style={[styles.voiceCard, {backgroundColor: colors.surface}]} elevation={1}>
            <View style={styles.voiceContent}>
              <Icon name="mic" size={20} color={colors.primary} />
              <Text style={[styles.voiceText, {color: colors.text.secondary}]}>
                Voice commands enabled. Say "start checkin" to begin.
              </Text>
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  welcomeCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  welcomeGradient: {
    padding: 24,
  },
  welcomeContent: {
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  checkinCompleted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completedText: {
    fontSize: 16,
    fontWeight: '600',
  },
  startButton: {
    borderRadius: 25,
    paddingHorizontal: 24,
  },
  streakCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  streakContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  streakItem: {
    flex: 1,
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  streakLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  streakDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 16,
  },
  progressCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  progressContent: {
    padding: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  progressStep: {
    fontSize: 14,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 24,
  },
  stepContent: {
    marginBottom: 24,
  },
  progressActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  navButton: {
    flex: 1,
    borderRadius: 8,
  },
  voiceCard: {
    marginTop: 8,
    borderRadius: 8,
  },
  voiceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  voiceText: {
    flex: 1,
    fontSize: 12,
  },
});

export default CheckinScreen;