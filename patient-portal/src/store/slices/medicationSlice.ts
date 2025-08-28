import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  isActive: boolean;
  reminderTimes: string[];
}

interface MedicationState {
  medications: Medication[];
  todaysDoses: any[];
  adherenceStats: {
    todaysTaken: number;
    todaysTotal: number;
    weeklyAdherence: number;
    monthlyAdherence: number;
    streakDays: number;
  };
  isLoading: boolean;
  error: string | null;
}

const initialState: MedicationState = {
  medications: [],
  todaysDoses: [],
  adherenceStats: {
    todaysTaken: 0,
    todaysTotal: 0,
    weeklyAdherence: 0,
    monthlyAdherence: 0,
    streakDays: 0,
  },
  isLoading: false,
  error: null,
};

const medicationSlice = createSlice({
  name: 'medication',
  initialState,
  reducers: {
    setMedications: (state, action: PayloadAction<Medication[]>) => {
      state.medications = action.payload;
    },
    addMedication: (state, action: PayloadAction<Medication>) => {
      state.medications.push(action.payload);
    },
    updateMedication: (state, action: PayloadAction<{id: string; updates: Partial<Medication>}>) => {
      const index = state.medications.findIndex(med => med.id === action.payload.id);
      if (index !== -1) {
        state.medications[index] = {...state.medications[index], ...action.payload.updates};
      }
    },
    removeMedication: (state, action: PayloadAction<string>) => {
      state.medications = state.medications.filter(med => med.id !== action.payload);
    },
    setTodaysDoses: (state, action: PayloadAction<any[]>) => {
      state.todaysDoses = action.payload;
    },
    updateAdherenceStats: (state, action: PayloadAction<Partial<typeof initialState.adherenceStats>>) => {
      state.adherenceStats = {...state.adherenceStats, ...action.payload};
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
  setMedications,
  addMedication,
  updateMedication,
  removeMedication,
  setTodaysDoses,
  updateAdherenceStats,
  setLoading,
  setError,
} = medicationSlice.actions;

export default medicationSlice.reducer;