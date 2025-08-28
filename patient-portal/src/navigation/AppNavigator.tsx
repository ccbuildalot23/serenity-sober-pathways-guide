import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createDrawerNavigator} from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {useAuth} from '@contexts/AuthContext';
import {useTheme} from '@contexts/ThemeContext';

// Auth Screens
import LoginScreen from '@screens/auth/LoginScreen';
import RegisterScreen from '@screens/auth/RegisterScreen';
import BiometricSetupScreen from '@screens/auth/BiometricSetupScreen';
import PinSetupScreen from '@screens/auth/PinSetupScreen';

// Main Screens
import DashboardScreen from '@screens/dashboard/DashboardScreen';
import CheckinScreen from '@screens/checkin/CheckinScreen';
import CrisisScreen from '@screens/crisis/CrisisScreen';
import MessagingScreen from '@screens/messaging/MessagingScreen';
import MedicationScreen from '@screens/medication/MedicationScreen';
import AppointmentsScreen from '@screens/appointments/AppointmentsScreen';
import AnalyticsScreen from '@screens/analytics/AnalyticsScreen';
import SafetyPlanScreen from '@screens/safety/SafetyPlanScreen';
import ResourcesScreen from '@screens/resources/ResourcesScreen';
import ProfileScreen from '@screens/profile/ProfileScreen';

// Crisis Emergency Screen
import EmergencyScreen from '@screens/crisis/EmergencyScreen';

import {RootStackParamList, MainTabParamList, DrawerParamList} from '@types/navigation';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const Drawer = createDrawerNavigator<DrawerParamList>();

const MainTabs: React.FC = () => {
  const {colors} = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconName: string;

          switch (route.name) {
            case 'Dashboard':
              iconName = 'dashboard';
              break;
            case 'CheckIn':
              iconName = 'favorite';
              break;
            case 'Crisis':
              iconName = 'warning';
              break;
            case 'Messages':
              iconName = 'chat';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'circle';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 8,
          height: 80,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{tabBarLabel: 'Home'}}
      />
      <Tab.Screen 
        name="CheckIn" 
        component={CheckinScreen}
        options={{tabBarLabel: 'Check-in'}}
      />
      <Tab.Screen 
        name="Crisis" 
        component={CrisisScreen}
        options={{
          tabBarLabel: 'Crisis',
          tabBarBadge: undefined, // Will be set dynamically for emergencies
        }}
      />
      <Tab.Screen 
        name="Messages" 
        component={MessagingScreen}
        options={{tabBarLabel: 'Messages'}}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{tabBarLabel: 'Profile'}}
      />
    </Tab.Navigator>
  );
};

const DrawerNavigator: React.FC = () => {
  const {colors} = useTheme();
  
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text.primary,
        drawerStyle: {
          backgroundColor: colors.background,
        },
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.text.secondary,
      }}
    >
      <Drawer.Screen 
        name="MainTabs" 
        component={MainTabs}
        options={{
          title: 'Serenity',
          drawerLabel: 'Home',
          drawerIcon: ({color}) => <Icon name="home" size={24} color={color} />,
        }}
      />
      <Drawer.Screen 
        name="Medication" 
        component={MedicationScreen}
        options={{
          title: 'Medications',
          drawerIcon: ({color}) => <Icon name="medical-services" size={24} color={color} />,
        }}
      />
      <Drawer.Screen 
        name="Appointments" 
        component={AppointmentsScreen}
        options={{
          title: 'Appointments',
          drawerIcon: ({color}) => <Icon name="event" size={24} color={color} />,
        }}
      />
      <Drawer.Screen 
        name="Analytics" 
        component={AnalyticsScreen}
        options={{
          title: 'Progress',
          drawerIcon: ({color}) => <Icon name="analytics" size={24} color={color} />,
        }}
      />
      <Drawer.Screen 
        name="SafetyPlan" 
        component={SafetyPlanScreen}
        options={{
          title: 'Safety Plan',
          drawerIcon: ({color}) => <Icon name="security" size={24} color={color} />,
        }}
      />
      <Drawer.Screen 
        name="Resources" 
        component={ResourcesScreen}
        options={{
          title: 'Resources',
          drawerIcon: ({color}) => <Icon name="library-books" size={24} color={color} />,
        }}
      />
    </Drawer.Navigator>
  );
};

const AuthStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: {backgroundColor: 'transparent'},
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="BiometricSetup" component={BiometricSetupScreen} />
      <Stack.Screen name="PinSetup" component={PinSetupScreen} />
    </Stack.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const {isAuthenticated, isLoading} = useAuth();
  
  if (isLoading) {
    return null; // Loading screen handled by App component
  }

  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Main" component={DrawerNavigator} />
          <Stack.Screen 
            name="Emergency" 
            component={EmergencyScreen}
            options={{
              presentation: 'modal',
              gestureEnabled: false,
            }}
          />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;