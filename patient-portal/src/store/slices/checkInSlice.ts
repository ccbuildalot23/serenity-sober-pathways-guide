import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface CheckInData {
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

interface CheckInState {
  currentCheckIn: CheckInData | null;
  todaysCheckIn: CheckInData | null;
  checkInHistory: CheckInData[];
  streak: {
    currentStreak: number;
    longestStreak: number;
    totalCheckins: number;
  };
  isLoading: boolean;
  error: string | null;
}

const initialState: CheckInState = {
  currentCheckIn: null,
  todaysCheckIn: null,
  checkInHistory: [],
  streak: {
    currentStreak: 0,
    longestStreak: 0,
    totalCheckins: 0,
  },
  isLoading: false,
  error: null,
};

const checkInSlice = createSlice({
  name: 'checkIn',
  initialState,
  reducers: {
    setCurrentCheckIn: (state, action: PayloadAction<CheckInData>) => {
      state.currentCheckIn = action.payload;
    },
    setTodaysCheckIn: (state, action: PayloadAction<CheckInData>) => {
      state.todaysCheckIn = action.payload;
    },
    updateCheckInData: (state, action: PayloadAction<Partial<CheckInData>>) => {
      if (state.currentCheckIn) {
        state.currentCheckIn = {...state.currentCheckIn, ...action.payload};
      }
    },
    addCheckInToHistory: (state, action: PayloadAction<CheckInData>) => {
      state.checkInHistory.unshift(action.payload);
    },
    setCheckInHistory: (state, action: PayloadAction<CheckInData[]>) => {
      state.checkInHistory = action.payload;
    },
    updateStreak: (state, action: PayloadAction<{
      currentStreak: number;
      longestStreak: number;
      totalCheckins: number;
    }>) => {
      state.streak = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    resetCheckIn: (state) => {
      state.currentCheckIn = null;
      state.error = null;
    },
    clearCheckInData: () => initialState,
  },
});

export const {
  setCurrentCheckIn,
  setTodaysCheckIn,
  updateCheckInData,
  addCheckInToHistory,
  setCheckInHistory,
  updateStreak,
  setLoading,
  setError,
  resetCheckIn,
  clearCheckInData,
} = checkInSlice.actions;

export default checkInSlice.reducer;