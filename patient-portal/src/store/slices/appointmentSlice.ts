import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface Appointment {
  id: string;
  providerId: string;
  providerName: string;
  type: string;
  format: 'in_person' | 'video' | 'phone';
  scheduledTime: string;
  duration: number;
  status: string;
  location?: string;
  videoCallUrl?: string;
}

interface Provider {
  id: string;
  name: string;
  title: string;
  specialty: string;
  isOnline: boolean;
  rating: number;
}

interface AppointmentState {
  appointments: Appointment[];
  providers: Provider[];
  selectedDate: string;
  isLoading: boolean;
  error: string | null;
}

const initialState: AppointmentState = {
  appointments: [],
  providers: [],
  selectedDate: new Date().toISOString().split('T')[0],
  isLoading: false,
  error: null,
};

const appointmentSlice = createSlice({
  name: 'appointment',
  initialState,
  reducers: {
    setAppointments: (state, action: PayloadAction<Appointment[]>) => {
      state.appointments = action.payload;
    },
    addAppointment: (state, action: PayloadAction<Appointment>) => {
      state.appointments.push(action.payload);
    },
    updateAppointment: (state, action: PayloadAction<{id: string; updates: Partial<Appointment>}>) => {
      const index = state.appointments.findIndex(apt => apt.id === action.payload.id);
      if (index !== -1) {
        state.appointments[index] = {...state.appointments[index], ...action.payload.updates};
      }
    },
    removeAppointment: (state, action: PayloadAction<string>) => {
      state.appointments = state.appointments.filter(apt => apt.id !== action.payload);
    },
    setProviders: (state, action: PayloadAction<Provider[]>) => {
      state.providers = action.payload;
    },
    setSelectedDate: (state, action: PayloadAction<string>) => {
      state.selectedDate = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setAppointments,
  addAppointment,
  updateAppointment,
  removeAppointment,
  setProviders,
  setSelectedDate,
  setLoading,
  setError,
} = appointmentSlice.actions;

export default appointmentSlice.reducer;