import { Link } from 'react-router-dom';
import { MobileNav } from './MobileNav';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useUserRole } from '@/hooks/useUserRole';

export function Header() {
  const { userRole } = useUserRole();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 md:h-16 items-center">
        {/* Mobile Navigation */}
        <MobileNav />
        
        {/* Logo */}
        <div className="flex-1 md:flex-none">
          <Link to="/" className="flex items-center space-x-2">
            <span className="font-bold text-lg md:text-xl">Serenity</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex md:flex-1 md:items-center md:justify-center md:space-x-6">
          <Link to="/dashboard" className="text-sm font-medium transition-colors hover:text-primary">
            Dashboard
          </Link>
          <Link to="/checkin" className="text-sm font-medium transition-colors hover:text-primary">
            Check-In
          </Link>
          <Link to="/peer-support" className="text-sm font-medium transition-colors hover:text-primary">
            Peer Support
          </Link>
          <Link to="/recovery" className="text-sm font-medium transition-colors hover:text-primary">
            Recovery Tools
          </Link>
          {userRole === 'provider' && (
            <Link to="/provider" className="text-sm font-medium transition-colors hover:text-primary">
              Provider Portal
            </Link>
          )}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <NotificationBell />
          
          {/* Crisis button - always visible */}
          <Link to="/crisis">
            <Button
              variant="crisis"
              size="mobile"
              className="md:size-default"
              aria-label="Get crisis help"
            >
              <AlertCircle className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Crisis Help</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}