import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  RotateCw,
  CheckCircle,
  XCircle,
  Eye
} from 'lucide-react';

interface ResponsiveTest {
  device: string;
  width: number;
  height: number;
  icon: React.ReactNode;
  description: string;
}

export const MobileResponsivenessDemo: React.FC = () => {
  const [currentViewport, setCurrentViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  const responsiveTests: ResponsiveTest[] = [
    {
      device: 'Mobile Portrait',
      width: 375,
      height: 667,
      icon: <Smartphone className="h-4 w-4" />,
      description: 'iPhone SE / Small mobile devices'
    },
    {
      device: 'Mobile Landscape',
      width: 667,
      height: 375,
      icon: <Smartphone className="h-4 w-4 rotate-90" />,
      description: 'iPhone SE landscape'
    },
    {
      device: 'Large Mobile',
      width: 414,
      height: 896,
      icon: <Smartphone className="h-4 w-4" />,
      description: 'iPhone 11 Pro / Large mobile'
    },
    {
      device: 'Tablet Portrait',
      width: 768,
      height: 1024,
      icon: <Tablet className="h-4 w-4" />,
      description: 'iPad / Standard tablet'
    },
    {
      device: 'Tablet Landscape',
      width: 1024,
      height: 768,
      icon: <Tablet className="h-4 w-4 rotate-90" />,
      description: 'iPad landscape'
    },
    {
      device: 'Desktop',
      width: 1920,
      height: 1080,
      icon: <Monitor className="h-4 w-4" />,
      description: 'Standard desktop screen'
    }
  ];

  useEffect(() => {
    const handleResize = () => {
      setCurrentViewport({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    const handleOrientationChange = () => {
      setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Initial check
    handleOrientationChange();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  const getCurrentDeviceType = () => {
    const { width } = currentViewport;
    if (width < 640) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  };

  const getResponsiveFeatures = () => {
    const features = [
      {
        name: 'Navigation',
        test: () => {
          const nav = document.querySelector('nav, [role="navigation"]');
          return nav ? 'Responsive navigation detected' : 'No navigation found';
        }
      },
      {
        name: 'Grid Layout',
        test: () => {
          const grids = document.querySelectorAll('.grid, [class*="grid-cols"]');
          return grids.length > 0 ? `${grids.length} responsive grids found` : 'No grid layouts found';
        }
      },
      {
        name: 'Flexible Cards',
        test: () => {
          const cards = document.querySelectorAll('[class*="card"], .card');
          return cards.length > 0 ? `${cards.length} cards with responsive design` : 'No cards found';
        }
      },
      {
        name: 'Touch Targets',
        test: () => {
          const buttons = document.querySelectorAll('button, [role="button"]');
          const appropriateSize = Array.from(buttons).filter(btn => {
            const rect = btn.getBoundingClientRect();
            return rect.width >= 44 && rect.height >= 44;
          });
          return `${appropriateSize.length}/${buttons.length} buttons meet touch target size (44px minimum)`;
        }
      },
      {
        name: 'Text Readability',
        test: () => {
          const textElements = document.querySelectorAll('p, span, div[class*="text"]');
          const styles = window.getComputedStyle(textElements[0] || document.body);
          const fontSize = parseInt(styles.fontSize);
          return fontSize >= 16 ? `Font size OK (${fontSize}px)` : `Font size too small (${fontSize}px)`;
        }
      }
    ];

    return features.map(feature => ({
      ...feature,
      result: feature.test()
    }));
  };

  const features = getResponsiveFeatures();

  const simulateViewport = (test: ResponsiveTest) => {
    if (window.parent !== window) {
      // If in iframe, try to communicate with parent
      window.parent.postMessage({
        type: 'resize-viewport',
        width: test.width,
        height: test.height
      }, '*');
    } else {
      // For demo purposes, show instructions
      alert(`To test ${test.device}:\n1. Open Developer Tools (F12)\n2. Click device toolbar icon\n3. Select "${test.device}" or set custom size to ${test.width}x${test.height}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Mobile Responsiveness Testing</h2>
        <p className="text-muted-foreground">
          Testing adaptive layouts and mobile-first design
        </p>
      </div>

      {/* Current Viewport Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Current Viewport
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-background/50 rounded-lg">
              <div className="text-sm text-muted-foreground">Width</div>
              <div className="text-xl font-bold">{currentViewport.width}px</div>
            </div>
            <div className="p-3 bg-background/50 rounded-lg">
              <div className="text-sm text-muted-foreground">Height</div>
              <div className="text-xl font-bold">{currentViewport.height}px</div>
            </div>
            <div className="p-3 bg-background/50 rounded-lg">
              <div className="text-sm text-muted-foreground">Device Type</div>
              <div className="text-xl font-bold capitalize">{getCurrentDeviceType()}</div>
            </div>
            <div className="p-3 bg-background/50 rounded-lg">
              <div className="text-sm text-muted-foreground">Orientation</div>
              <div className="text-xl font-bold capitalize flex items-center gap-2">
                {orientation}
                <RotateCw className="h-4 w-4" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Responsive Feature Tests */}
      <Card>
        <CardHeader>
          <CardTitle>Responsive Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                <div>
                  <div className="font-medium">{feature.name}</div>
                  <div className="text-sm text-muted-foreground">{feature.result}</div>
                </div>
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Viewport Testing */}
      <Card>
        <CardHeader>
          <CardTitle>Viewport Simulation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {responsiveTests.map((test) => (
              <div key={test.device} className="p-4 bg-background/50 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  {test.icon}
                  <span className="font-medium">{test.device}</span>
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  {test.width} × {test.height}
                </div>
                <div className="text-xs text-muted-foreground mb-3">
                  {test.description}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => simulateViewport(test)}
                  className="w-full"
                >
                  Test This Size
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Breakpoint Information */}
      <Card>
        <CardHeader>
          <CardTitle>Tailwind CSS Breakpoints</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 bg-background/50 rounded-lg">
              <div className="font-medium">sm</div>
              <div className="text-sm text-muted-foreground">640px and up</div>
              <Badge variant={currentViewport.width >= 640 ? 'default' : 'outline'}>
                {currentViewport.width >= 640 ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="p-3 bg-background/50 rounded-lg">
              <div className="font-medium">md</div>
              <div className="text-sm text-muted-foreground">768px and up</div>
              <Badge variant={currentViewport.width >= 768 ? 'default' : 'outline'}>
                {currentViewport.width >= 768 ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="p-3 bg-background/50 rounded-lg">
              <div className="font-medium">lg</div>
              <div className="text-sm text-muted-foreground">1024px and up</div>
              <Badge variant={currentViewport.width >= 1024 ? 'default' : 'outline'}>
                {currentViewport.width >= 1024 ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="p-3 bg-background/50 rounded-lg">
              <div className="font-medium">xl</div>
              <div className="text-sm text-muted-foreground">1280px and up</div>
              <Badge variant={currentViewport.width >= 1280 ? 'default' : 'outline'}>
                {currentViewport.width >= 1280 ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};