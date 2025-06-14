
import { MoodEntry } from '@/types/calendar';

export const formatDate = (date: Date, formatStr: string): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  switch (formatStr) {
    case 'yyyy-MM-dd':
      return `${year}-${month}-${day}`;
    case 'yyyy-MM':
      return `${year}-${month}`;
    case 'MMM dd, yyyy':
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[date.getMonth()]} ${day}, ${year}`;
    default:
      return date.toISOString();
  }
};

export const startOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

export const endOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

export const calculateStreak = (entries: MoodEntry[]): number => {
  if (entries.length === 0) return 0;
  
  const sortedDates = entries
    .map(e => formatDate(e.date, 'yyyy-MM-dd'))
    .sort()
    .reverse();
  
  let streak = 1;
  const today = formatDate(new Date(), 'yyyy-MM-dd');
  
  if (sortedDates[0] !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday, 'yyyy-MM-dd');
    if (sortedDates[0] !== yesterdayStr) {
      return 0;
    }
  }
  
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1]);
    const currDate = new Date(sortedDates[i]);
    const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
};
