import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Home, Calendar, Users, Heart, Brain, AlertCircle, Settings, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'crisis';
}

const navItems: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: Home },
  { label: 'Daily Check-In', href: '/checkin', icon: Calendar },
  { label: 'Peer Support', href: '/peer-support', icon: Users },
  { label: 'Recovery Tools', href: '/recovery', icon: Heart },
  { label: 'CBT Skills', href: '/cbt', icon: Brain },
  { label: 'Crisis Help', href: '/crisis', icon: AlertCircle, variant: 'crisis' },
  { label: 'Profile', href: '/profile', icon: User },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="mobileIcon"
            className="relative"
            aria-label="Open navigation menu"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] sm:w-[350px]">
          <SheetHeader>
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <nav className="mt-6 flex flex-col gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              const isCrisis = item.variant === 'crisis';
              
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground",
                    isCrisis && !isActive && "text-red-600 hover:bg-red-50"
                  )}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          
          {/* Crisis button always visible at bottom */}
          <div className="absolute bottom-4 left-4 right-4">
            <Link to="/crisis" onClick={() => setOpen(false)}>
              <Button
                variant="crisis"
                size="mobileLg"
                className="w-full"
                aria-label="Get crisis help immediately"
              >
                <AlertCircle className="mr-2 h-5 w-5" />
                Get Help Now
              </Button>
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}