import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  delay?: number;
  gradient?: 'lavender' | 'sage' | 'coral' | 'sky' | 'premium';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  hover = true,
  delay = 0,
  gradient
}) => {
  const gradientClasses = {
    lavender: 'bg-gradient-to-br from-lavender-200/20 to-lavender-300/20',
    sage: 'bg-gradient-to-br from-sage-200/20 to-sage-300/20',
    coral: 'bg-gradient-to-br from-rose-200/20 to-pink-300/20',
    sky: 'bg-gradient-to-br from-sky-200/20 to-blue-300/20',
    premium: 'bg-gradient-to-br from-purple-200/20 to-indigo-300/20'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.4, 0, 0.2, 1]
      }}
      whileHover={hover ? { y: -4, scale: 1.01 } : undefined}
      className={cn(
        'relative overflow-hidden rounded-2xl',
        'bg-white/10 backdrop-blur-xl backdrop-saturate-150',
        'border border-white/20',
        'shadow-[0_8px_32px_rgba(31,38,135,0.12)]',
        hover && 'hover:shadow-[0_16px_48px_rgba(31,38,135,0.18)]',
        'transition-all duration-300',
        gradient && gradientClasses[gradient],
        className
      )}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-transparent pointer-events-none" />
      
      {/* Shimmer effect */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000" />
      </div>
      
      {children}
    </motion.div>
  );
};