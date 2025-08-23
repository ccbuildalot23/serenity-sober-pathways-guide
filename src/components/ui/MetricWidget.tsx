import React from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { LucideIcon } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { cn } from '@/lib/utils';

interface MetricWidgetProps {
  title: string;
  value: number;
  suffix?: string;
  subtitle?: string;
  icon: LucideIcon;
  gradient?: 'emerald' | 'amber' | 'rose' | 'indigo' | 'sky';
  delay?: number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export const MetricWidget: React.FC<MetricWidgetProps> = ({
  title,
  value,
  suffix = '',
  subtitle,
  icon: Icon,
  gradient = 'emerald',
  delay = 0,
  trend
}) => {
  const gradientStyles = {
    emerald: {
      bg: 'from-emerald-50/80 to-teal-50/80',
      border: 'border-emerald-200/50',
      icon: 'bg-gradient-to-br from-emerald-400 to-teal-500',
      text: 'text-emerald-900',
      subtitle: 'text-emerald-700'
    },
    amber: {
      bg: 'from-amber-50/80 to-yellow-50/80',
      border: 'border-amber-200/50',
      icon: 'bg-gradient-to-br from-amber-400 to-yellow-500',
      text: 'text-amber-900',
      subtitle: 'text-amber-700'
    },
    rose: {
      bg: 'from-rose-50/80 to-pink-50/80',
      border: 'border-rose-200/50',
      icon: 'bg-gradient-to-br from-rose-400 to-pink-500',
      text: 'text-rose-900',
      subtitle: 'text-rose-700'
    },
    indigo: {
      bg: 'from-indigo-50/80 to-purple-50/80',
      border: 'border-indigo-200/50',
      icon: 'bg-gradient-to-br from-indigo-400 to-purple-500',
      text: 'text-indigo-900',
      subtitle: 'text-indigo-700'
    },
    sky: {
      bg: 'from-sky-50/80 to-blue-50/80',
      border: 'border-sky-200/50',
      icon: 'bg-gradient-to-br from-sky-400 to-blue-500',
      text: 'text-sky-900',
      subtitle: 'text-sky-700'
    }
  };

  const style = gradientStyles[gradient];

  return (
    <GlassCard delay={delay} className={cn('p-6', `bg-gradient-to-br ${style.bg}`, style.border)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.2 }}
            className={cn('text-sm font-semibold mb-2', style.subtitle)}
          >
            {title}
          </motion.p>
          
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
              delay: delay + 0.3,
              type: "spring",
              stiffness: 200,
              damping: 15
            }}
            className={cn('text-3xl font-bold', style.text)}
          >
            <CountUp
              end={value}
              duration={2.5}
              separator=","
              suffix={suffix}
              delay={delay}
              useEasing={true}
              useGrouping={true}
            />
          </motion.div>
          
          {subtitle && (
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.4 }}
              className={cn('text-xs font-medium mt-1', style.subtitle)}
            >
              {subtitle}
            </motion.p>
          )}
          
          {trend && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: delay + 0.5 }}
              className={cn('flex items-center gap-1 mt-2', trend.isPositive ? 'text-green-600' : 'text-red-600')}
            >
              <span className="text-xs font-medium">
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
            </motion.div>
          )}
        </div>
        
        <motion.div
          initial={{ rotate: -180, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ 
            delay: delay + 0.3,
            type: "spring",
            stiffness: 200
          }}
          className={cn('p-3 rounded-2xl shadow-lg', style.icon)}
        >
          <Icon className="w-7 h-7 text-white" />
        </motion.div>
      </div>
      
      {/* Animated background decoration */}
      <motion.div
        className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full opacity-10"
        style={{
          background: `radial-gradient(circle, currentColor, transparent)`,
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </GlassCard>
  );
};