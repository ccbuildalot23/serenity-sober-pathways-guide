# Serenity Patient Portal

A comprehensive React Native mobile application for mental health and substance abuse recovery, providing HIPAA-compliant patient care features including daily check-ins, crisis support, peer messaging, medication tracking, and appointment scheduling.

## Features

### 🏥 Core Patient Features
- **Daily Check-ins**: Mood, anxiety, sleep, and substance use tracking
- **Crisis Support**: One-tap emergency button with automatic escalation
- **Peer Messaging**: Encrypted real-time communication with support network
- **Medication Tracking**: Reminders, adherence monitoring, and progress analytics
- **Appointment Scheduling**: Video calls, in-person visits, and provider management

### 📊 Analytics & Insights
- Progress visualization with mood trends and sleep analysis
- Medication adherence charts and milestone tracking
- Trigger pattern identification and analytics
- Personalized insights and recommendations

### 🔒 Security & Compliance
- HIPAA-compliant data handling and storage
- End-to-end encryption for messages and sensitive data
- Biometric authentication (Face ID/Touch ID)
- Session management with automatic timeout
- Audit logging for all user actions

### ♿ Accessibility Features
- WCAG 2.1 AA compliance
- Voice commands for hands-free operation
- Screen reader support and high contrast themes
- Haptic feedback for important actions
- Customizable text sizes and UI elements

### 📱 Mobile Experience
- Cross-platform iOS and Android support
- Offline mode with data synchronization
- Push notifications for reminders and alerts
- Real-time messaging and location sharing
- Dark/light theme support with system integration

## Technology Stack

- **Framework**: React Native 0.72.6 with TypeScript
- **Navigation**: React Navigation v6
- **State Management**: Redux Toolkit with Redux Persist
- **UI Components**: React Native Paper + Radix UI components
- **Authentication**: Supabase Auth with biometric support
- **Database**: Supabase PostgreSQL with Row Level Security
- **Real-time**: WebSocket integration for live features
- **Charts**: React Native Chart Kit for data visualization
- **Security**: React Native Keychain, encrypted storage
- **Voice**: React Native Voice for speech recognition
- **Notifications**: React Native Push Notification

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── auth/           # Authentication components
│   ├── checkin/        # Daily check-in components
│   ├── crisis/         # Crisis support components
│   ├── messaging/      # Real-time messaging components
│   ├── medication/     # Medication tracking components
│   ├── appointments/   # Appointment scheduling components
│   ├── analytics/      # Data visualization components
│   ├── safety/         # Safety planning components
│   ├── resources/      # Educational resources components
│   └── common/         # Shared utility components
├── screens/            # Screen components organized by feature
├── navigation/         # Navigation configuration
├── contexts/           # React contexts for global state
├── services/           # Business logic and API services
├── store/              # Redux store and slices
├── hooks/              # Custom React hooks
├── utils/              # Utility functions and helpers
├── types/              # TypeScript type definitions
└── assets/             # Images, fonts, and static assets
```

## Installation

### Prerequisites

- Node.js 18+ 
- React Native CLI
- Xcode (for iOS development)
- Android Studio (for Android development)
- CocoaPods (for iOS dependencies)

### Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd patient-portal
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **iOS Setup:**
   ```bash
   cd ios && pod install && cd ..
   ```

4. **Environment Configuration:**
   Create a `.env` file with your Supabase credentials:
   ```bash
   SUPABASE_URL=your-supabase-url
   SUPABASE_ANON_KEY=your-anon-key
   ```

5. **Run the application:**
   ```bash
   # iOS
   npm run ios
   
   # Android  
   npm run android
   ```

## Development

### Available Scripts

```bash
# Development
npm run start          # Start Metro bundler
npm run ios           # Run on iOS simulator
npm run android       # Run on Android emulator

# Build
npm run build:android # Build Android APK
npm run build:ios     # Build iOS archive

# Testing
npm run test          # Run unit tests
npm run test:e2e      # Run end-to-end tests

# Code Quality
npm run lint          # Run ESLint
npm run lint:fix      # Fix ESLint issues
npm run typecheck     # TypeScript type checking

# Utilities
npm run clean         # Clean build cache
npm run postinstall   # Install iOS pods
```

### Key Development Guidelines

1. **TypeScript**: All components and services use TypeScript with strict mode disabled for gradual migration
2. **Component Structure**: Functional components with hooks, following React Native best practices
3. **State Management**: Redux Toolkit for global state, React Context for feature-specific state
4. **Styling**: StyleSheet with theme-based colors and responsive design
5. **Security**: All sensitive data encrypted, biometric authentication where available
6. **Accessibility**: All components include proper accessibility props and support

### Adding New Features

1. **Create Components**: Add feature-specific components in `src/components/[feature]/`
2. **Add Screens**: Create screen components in `src/screens/[feature]/`
3. **Update Navigation**: Add routes to the appropriate navigator
4. **Add Services**: Implement business logic in `src/services/`
5. **State Management**: Create Redux slices for complex state
6. **Types**: Define TypeScript interfaces in `src/types/`

## Configuration

### Environment Variables

- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key for client connections

### Native Configuration

#### iOS (ios/SerenityPatientPortal/Info.plist)
- Camera and microphone permissions for video calls
- Biometric authentication usage descriptions
- Background app refresh for real-time features
- Health Kit integration (if using health data)

#### Android (android/app/src/main/AndroidManifest.xml)
- Notification permissions
- Biometric authentication permissions
- Location services for crisis support
- Background processing permissions

## Security Considerations

### Data Protection
- All PHI data encrypted at rest using AES-256
- End-to-end encryption for peer messages using Signal Protocol
- Biometric authentication with hardware security module
- Session timeout after 15 minutes of inactivity

### Network Security
- Certificate pinning for API connections
- Request/response encryption for sensitive endpoints
- WebSocket connections secured with TLS 1.3
- API rate limiting and abuse protection

### Compliance
- HIPAA Business Associate Agreement required
- Audit logging for all data access and modifications
- User consent management and data retention policies
- Regular security assessments and penetration testing

## Deployment

### Production Build

1. **Update Version**: Increment version in `package.json` and native files
2. **Environment**: Set production environment variables
3. **Build**: Create production builds for iOS and Android
4. **Test**: Run full test suite including E2E tests
5. **Deploy**: Upload to App Store Connect and Google Play Console

### CI/CD Pipeline

- Automated testing on PR creation
- Security scanning for dependencies
- Performance benchmarking
- Automated deployment to TestFlight/Play Console beta

## Troubleshooting

### Common Issues

1. **Metro bundler issues**: Run `npm run clean` and restart
2. **iOS build failures**: Clean Xcode build folder and reinstall pods
3. **Android build issues**: Clean gradle cache: `cd android && ./gradlew clean`
4. **Authentication problems**: Verify Supabase configuration and network connectivity

### Support

For technical support or bug reports:
1. Check existing GitHub issues
2. Create detailed bug report with device info and reproduction steps
3. Include relevant logs and error messages

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Follow coding standards and add appropriate tests
4. Submit a pull request with detailed description

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Healthcare Compliance

This application is designed for HIPAA compliance but requires proper configuration and deployment practices. Consult with healthcare compliance experts before production deployment.