import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  Vibration,
  Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Card, Button, FAB} from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';

import {useAuth} from '@contexts/AuthContext';
import {useTheme} from '@contexts/ThemeContext';
import {CrisisService} from '@services/crisis';
import {LocationService} from '@services/location';
import {HapticService} from '@services/haptic';
import {VoiceService} from '@services/voice';
import {NotificationService} from '@services/notifications';
import EmergencyButton from '@components/crisis/EmergencyButton';
import CrisisResources from '@components/crisis/CrisisResources';
import SafetyPlanQuickAccess from '@components/crisis/SafetyPlanQuickAccess';
import CopingStrategies from '@components/crisis/CopingStrategies';

const {width, height} = Dimensions.get('window');

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phoneNumber: string;
  priority: number;
  isActive: boolean;
}

interface CrisisAlert {
  id: string;
  triggeredAt: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  status: 'active' | 'resolved' | 'escalated';
  responseTime?: string;
  responders: string[];
}

const CrisisScreen: React.FC = () => {
  const navigation = useNavigation();
  const {user, profile} = useAuth();
  const {colors} = useTheme();
  
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [activeAlert, setActiveAlert] = useState<CrisisAlert | null>(null);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [location, setLocation] = useState<{latitude: number; longitude: number} | null>(null);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const emergencyButtonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadEmergencyContacts();
    initializeVoiceCommands();
    getCurrentLocation();
    
    // Start pulse animation for emergency button
    startPulseAnimation();
    
    // Check for active crisis alerts
    checkActiveAlerts();
  }, []);

  const loadEmergencyContacts = async () => {
    try {
      const contacts = await CrisisService.getEmergencyContacts(user?.id!);
      setEmergencyContacts(contacts.filter(contact => contact.isActive));
    } catch (error) {
      console.error('Failed to load emergency contacts:', error);
    }
  };

  const initializeVoiceCommands = async () => {
    try {
      const commands = [
        {phrase: 'emergency', action: () => triggerEmergency('voice')},
        {phrase: 'help me', action: () => triggerEmergency('voice')},
        {phrase: 'crisis', action: () => triggerEmergency('voice')},
        {phrase: 'panic attack', action: () => showCopingStrategies()},
        {phrase: 'call support', action: () => callPrimaryContact()},
        {phrase: 'safety plan', action: () => navigation.navigate('SafetyPlan')},
      ];
      
      await VoiceService.registerCommands(commands);
      
      // Start continuous listening in crisis mode
      VoiceService.startContinuousListening({
        onSpeechStart: () => setVoiceListening(true),
        onSpeechEnd: () => setVoiceListening(false),
        onError: (error) => console.log('Voice recognition error:', error),
      });
    } catch (error) {
      console.log('Voice commands not available:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await LocationService.getCurrentLocation();
      setLocation(location);
    } catch (error) {
      console.log('Location not available:', error);
    }
  };

  const checkActiveAlerts = async () => {
    try {
      const alerts = await CrisisService.getActiveAlerts(user?.id!);
      if (alerts.length > 0) {
        setActiveAlert(alerts[0]);
        setIsEmergencyMode(true);
      }
    } catch (error) {
      console.error('Failed to check active alerts:', error);
    }
  };

  const startPulseAnimation = () => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
  };

  const triggerEmergency = async (triggerType: 'user' | 'voice' | 'automatic' = 'user') => {
    try {
      // Haptic and visual feedback
      HapticService.impact('heavy');
      Vibration.vibrate([100, 100, 100]);
      
      // Scale animation for emergency button
      Animated.sequence([
        Animated.timing(emergencyButtonScale, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(emergencyButtonScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Show confirmation dialog for non-voice triggers
      if (triggerType !== 'voice') {
        Alert.alert(
          'Emergency Alert',
          'Are you having a mental health crisis? This will immediately alert your support network and emergency contacts.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => HapticService.impact('light'),
            },
            {
              text: 'Yes, Send Alert',
              style: 'destructive',
              onPress: () => confirmEmergencyAlert(triggerType),
            },
          ]
        );
      } else {
        // Auto-confirm for voice triggers
        confirmEmergencyAlert(triggerType);
      }
    } catch (error) {
      console.error('Failed to trigger emergency:', error);
      Alert.alert('Error', 'Failed to send emergency alert. Please try again.');
    }
  };

  const confirmEmergencyAlert = async (triggerType: string) => {
    try {
      setIsEmergencyMode(true);
      
      // Get current location if available
      let currentLocation = location;
      if (!currentLocation) {
        try {
          currentLocation = await LocationService.getCurrentLocation();
          setLocation(currentLocation);
        } catch (error) {
          console.log('Could not get location for emergency alert');
        }
      }

      // Create crisis alert
      const alert: Partial<CrisisAlert> = {
        triggeredAt: new Date().toISOString(),
        location: currentLocation || undefined,
        status: 'active',
        responders: [],
      };

      const result = await CrisisService.createCrisisAlert(user?.id!, alert, triggerType);
      
      if (result.success) {
        setActiveAlert(result.alert);
        
        // Start emergency protocols
        await startEmergencyProtocols(result.alert.id);
        
        // Voice feedback
        VoiceService.speak('Emergency alert sent. Help is on the way.');
        
        // Navigate to emergency screen
        navigation.navigate('Emergency', {
          triggerType,
          context: 'crisis_button',
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to confirm emergency alert:', error);
      Alert.alert('Error', 'Failed to send emergency alert. Please call 911 directly.');
    }
  };

  const startEmergencyProtocols = async (alertId: string) => {
    try {
      // Send notifications to emergency contacts
      await Promise.all(
        emergencyContacts.map(contact => 
          CrisisService.notifyEmergencyContact(contact, {
            userId: user?.id!,
            userName: `${profile?.firstName} ${profile?.lastName}`,
            location: location,
            alertId,
          })
        )
      );

      // Send push notifications to support network
      await NotificationService.sendCrisisAlert({
        userId: user?.id!,
        alertId,
        location: location,
      });

      // Start location tracking
      if (location) {
        LocationService.startLocationTracking();
      }

      // Log crisis event
      await CrisisService.logCrisisEvent({
        userId: user?.id!,
        alertId,
        eventType: 'emergency_triggered',
        details: {
          triggerMethod: 'crisis_button',
          location: location,
          contactsNotified: emergencyContacts.length,
        },
      });
    } catch (error) {
      console.error('Failed to start emergency protocols:', error);
    }
  };

  const resolveAlert = async () => {
    if (!activeAlert) return;

    try {
      await CrisisService.resolveAlert(activeAlert.id, user?.id!);
      setActiveAlert(null);
      setIsEmergencyMode(false);
      LocationService.stopLocationTracking();
      
      HapticService.success();
      VoiceService.speak('Crisis alert resolved. Stay safe.');
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const callPrimaryContact = async () => {
    if (emergencyContacts.length === 0) {
      Alert.alert('No Contacts', 'Please add emergency contacts in your profile settings.');
      return;
    }

    const primaryContact = emergencyContacts.find(c => c.priority === 1) || emergencyContacts[0];
    
    Alert.alert(
      'Call Emergency Contact',
      `Call ${primaryContact.name} (${primaryContact.relationship})?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Call Now',
          onPress: () => CrisisService.makeEmergencyCall(primaryContact.phoneNumber),
        },
      ]
    );
  };

  const showCopingStrategies = () => {
    // Show coping strategies modal or navigate
    Alert.alert(
      'Coping Strategies',
      'Would you like to see personalized coping strategies or breathing exercises?',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Breathing Exercise', onPress: () => navigation.navigate('BreathingExercise')},
        {text: 'Coping Tools', onPress: () => navigation.navigate('CopingStrategies')},
      ]
    );
  };

  const renderEmergencyButton = () => (
    <View style={styles.emergencyButtonContainer}>
      <Animated.View 
        style={[
          styles.emergencyButtonWrapper,
          {
            transform: [
              {scale: pulseAnim},
              {scale: emergencyButtonScale},
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.emergencyButton, {backgroundColor: colors.error}]}
          onPress={() => triggerEmergency('user')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.error, '#FF4444']}
            style={styles.emergencyGradient}
          >
            <Icon name="warning" size={48} color="#FFFFFF" />
            <Text style={styles.emergencyButtonText}>
              EMERGENCY
            </Text>
            <Text style={styles.emergencySubText}>
              Tap for immediate help
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
      
      {voiceListening && (
        <View style={[styles.voiceIndicator, {backgroundColor: colors.primary}]}>
          <Icon name="mic" size={16} color="#FFFFFF" />
          <Text style={styles.voiceIndicatorText}>Listening...</Text>
        </View>
      )}
    </View>
  );

  const renderActiveAlert = () => {
    if (!activeAlert) return null;

    return (
      <Card style={[styles.alertCard, {backgroundColor: colors.error}]} elevation={4}>
        <View style={styles.alertContent}>
          <View style={styles.alertHeader}>
            <Icon name="warning" size={24} color="#FFFFFF" />
            <Text style={styles.alertTitle}>Crisis Alert Active</Text>
          </View>
          
          <Text style={styles.alertSubtitle}>
            Emergency contacts have been notified
          </Text>
          
          <View style={styles.alertActions}>
            <Button
              mode="contained"
              onPress={resolveAlert}
              style={[styles.resolveButton, {backgroundColor: '#FFFFFF'}]}
              labelStyle={{color: colors.error}}
            >
              I'm Safe Now
            </Button>
          </View>
        </View>
      </Card>
    );
  };

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <TouchableOpacity
        style={[styles.quickActionCard, {backgroundColor: colors.surface}]}
        onPress={callPrimaryContact}
      >
        <Icon name="phone" size={32} color={colors.primary} />
        <Text style={[styles.quickActionText, {color: colors.text.primary}]}>
          Call Contact
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.quickActionCard, {backgroundColor: colors.surface}]}
        onPress={showCopingStrategies}
      >
        <Icon name="psychology" size={32} color={colors.secondary} />
        <Text style={[styles.quickActionText, {color: colors.text.primary}]}>
          Coping Tools
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.quickActionCard, {backgroundColor: colors.surface}]}
        onPress={() => navigation.navigate('SafetyPlan')}
      >
        <Icon name="security" size={32} color={colors.accent} />
        <Text style={[styles.quickActionText, {color: colors.text.primary}]}>
          Safety Plan
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmergencyContacts = () => (
    <Card style={[styles.contactsCard, {backgroundColor: colors.surface}]} elevation={2}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, {color: colors.text.primary}]}>
          Emergency Contacts
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('EmergencyContacts')}
        >
          <Icon name="edit" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
      
      {emergencyContacts.slice(0, 3).map((contact) => (
        <TouchableOpacity
          key={contact.id}
          style={styles.contactItem}
          onPress={() => CrisisService.makeEmergencyCall(contact.phoneNumber)}
        >
          <View style={styles.contactInfo}>
            <Text style={[styles.contactName, {color: colors.text.primary}]}>
              {contact.name}
            </Text>
            <Text style={[styles.contactRole, {color: colors.text.secondary}]}>
              {contact.relationship}
            </Text>
          </View>
          <View style={styles.contactActions}>
            <Text style={[styles.priorityBadge, {color: colors.primary}]}>
              #{contact.priority}
            </Text>
            <Icon name="phone" size={20} color={colors.primary} />
          </View>
        </TouchableOpacity>
      ))}
      
      {emergencyContacts.length === 0 && (
        <Text style={[styles.noContactsText, {color: colors.text.secondary}]}>
          No emergency contacts added yet.
          {'\n'}Tap the edit icon to add contacts.
        </Text>
      )}
    </Card>
  );

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderActiveAlert()}
        {renderEmergencyButton()}
        {renderQuickActions()}
        {renderEmergencyContacts()}
        
        <CrisisResources />
        <SafetyPlanQuickAccess />
      </ScrollView>

      {/* Floating Action Button for 911 */}
      <FAB
        style={[styles.fab, {backgroundColor: colors.error}]}
        icon="phone"
        label="911"
        onPress={() => CrisisService.call911()}
        color="#FFFFFF"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emergencyButtonContainer: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  emergencyButtonWrapper: {
    width: width * 0.6,
    height: width * 0.6,
    maxWidth: 250,
    maxHeight: 250,
  },
  emergencyButton: {
    width: '100%',
    height: '100%',
    borderRadius: 125,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emergencyGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 125,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  emergencySubText: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.9,
    marginTop: 4,
  },
  voiceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 16,
    gap: 6,
  },
  voiceIndicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  alertCard: {
    marginBottom: 20,
    borderRadius: 12,
  },
  alertContent: {
    padding: 20,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  alertTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  alertSubtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 16,
  },
  alertActions: {
    alignItems: 'flex-end',
  },
  resolveButton: {
    borderRadius: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    elevation: 2,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  contactsCard: {
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
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
  },
  contactRole: {
    fontSize: 14,
    marginTop: 2,
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityBadge: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  noContactsText: {
    textAlign: 'center',
    padding: 20,
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default CrisisScreen;