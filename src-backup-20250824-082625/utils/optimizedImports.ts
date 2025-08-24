// Centralized imports to reduce bundle duplication and improve tree shaking

// Date utilities - consolidate to avoid duplication between date-fns and date-fns-tz
export { format, parseISO, isValid, addDays, subDays, differenceInDays, startOfDay, endOfDay } from 'date-fns';
export { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

// Lucide React icons - commonly used icons exported from single location
export {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Heart,
  Phone,
  Shield,
  TrendingUp,
  User,
  Users,
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Edit,
  FileText,
  Home,
  Lock,
  Mail,
  Menu,
  Plus,
  Search,
  Settings,
  Star,
  Target,
  X
} from 'lucide-react';

// UI Component re-exports to centralize imports
export { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
export { Button } from '@/components/ui/button';
export { Badge } from '@/components/ui/badge';
export { Input } from '@/components/ui/input';
export { Label } from '@/components/ui/label';
export { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// React hooks commonly used together
export { useState, useEffect, useCallback, useMemo, memo } from 'react';

// Router utilities
export { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';

// Animation utilities
export { motion, AnimatePresence } from 'framer-motion';

// Form utilities
export { useForm, Controller } from 'react-hook-form';
export { zodResolver } from '@hookform/resolvers/zod';
export { z } from 'zod';