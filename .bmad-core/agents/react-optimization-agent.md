# React Optimization Agent

## Overview
This agent specializes in optimizing React applications for performance, bundle size, and user experience, with specific focus on healthcare applications that require high reliability and accessibility.

## Performance Optimization Strategies

### Code Splitting
```typescript
// Lazy load heavy components
const EnhancedCBTSkillsLibrary = lazy(() => 
  import('./components/cbt/EnhancedCBTSkillsLibrary')
);

// Route-based splitting
const routes = [
  {
    path: '/crisis',
    component: lazy(() => import('./pages/CrisisSupport'))
  },
  {
    path: '/cbt',
    component: lazy(() => import('./pages/CBTSkills'))
  }
];
```

### Memoization Patterns
```typescript
// Memoize expensive computations
const MemoizedDashboard = memo(({ data }) => {
  const stats = useMemo(() => 
    calculateComplexStats(data), [data]
  );
  
  return <DashboardContent stats={stats} />;
}, (prevProps, nextProps) => {
  // Custom comparison for re-render optimization
  return prevProps.data.id === nextProps.data.id;
});

// Use callback for stable function references
const handleSubmit = useCallback((formData) => {
  submitToServer(formData);
}, []);
```

### State Management Optimization
```typescript
// Minimize context re-renders
const AuthContext = createContext();
const DataContext = createContext();

// Split contexts by update frequency
function AppProviders({ children }) {
  return (
    <AuthContext.Provider value={authValue}>
      <DataContext.Provider value={dataValue}>
        {children}
      </DataContext.Provider>
    </AuthContext.Provider>
  );
}

// Use state colocation
function Component() {
  // Keep state as close to where it's used as possible
  const [localState, setLocalState] = useState();
  
  return <ChildComponent state={localState} />;
}
```

## Bundle Size Optimization

### Tree Shaking
```typescript
// Import only what you need
import { debounce } from 'lodash-es/debounce';
// NOT: import _ from 'lodash';

// Use ES6 modules for better tree shaking
export { specificFunction } from './utils';
```

### Dynamic Imports
```typescript
// Load features on demand
async function loadAdvancedFeatures() {
  const { AdvancedAnalytics } = await import('./features/analytics');
  return AdvancedAnalytics;
}

// Conditional loading based on user role
if (userRole === 'provider') {
  const ProviderTools = await import('./features/provider-tools');
}
```

### Asset Optimization
```typescript
// Optimize images
const OptimizedImage = ({ src, alt }) => {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      srcSet={`${src}?w=400 400w, ${src}?w=800 800w`}
      sizes="(max-width: 640px) 400px, 800px"
    />
  );
};

// Preload critical resources
useEffect(() => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'font';
  link.href = '/fonts/critical-font.woff2';
  document.head.appendChild(link);
}, []);
```

## React Query Optimization

### Query Configuration
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error.status === 404) return false;
        return failureCount < 3;
      }
    }
  }
});

// Prefetch critical data
queryClient.prefetchQuery({
  queryKey: ['user-profile'],
  queryFn: fetchUserProfile,
  staleTime: Infinity // Never refetch automatically
});
```

### Optimistic Updates
```typescript
const mutation = useMutation({
  mutationFn: updateCheckIn,
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['check-ins']);
    
    // Snapshot previous value
    const previousData = queryClient.getQueryData(['check-ins']);
    
    // Optimistically update
    queryClient.setQueryData(['check-ins'], old => ({
      ...old,
      ...newData
    }));
    
    return { previousData };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(['check-ins'], context.previousData);
  },
  onSettled: () => {
    // Always refetch after error or success
    queryClient.invalidateQueries(['check-ins']);
  }
});
```

## Rendering Optimization

### Virtual Scrolling
```typescript
// Use virtual scrolling for long lists
import { FixedSizeList } from 'react-window';

function VirtualizedList({ items }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          {items[index].name}
        </div>
      )}
    </FixedSizeList>
  );
}
```

### Batch Updates
```typescript
// Batch multiple state updates
import { unstable_batchedUpdates } from 'react-dom';

function handleMultipleUpdates() {
  unstable_batchedUpdates(() => {
    setStateA(valueA);
    setStateB(valueB);
    setStateC(valueC);
  });
}
```

## Accessibility Performance

### Focus Management
```typescript
// Efficient focus management
const FocusTrap = ({ children, active }) => {
  const startRef = useRef();
  const endRef = useRef();
  
  useEffect(() => {
    if (active) {
      startRef.current?.focus();
    }
  }, [active]);
  
  return (
    <>
      <div tabIndex={0} ref={startRef} />
      {children}
      <div tabIndex={0} ref={endRef} />
    </>
  );
};
```

### ARIA Live Regions
```typescript
// Announce changes to screen readers efficiently
const LiveRegion = ({ message, priority = 'polite' }) => {
  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
};
```

## Mobile Optimization

### Touch Interactions
```typescript
// Optimize for touch
const TouchButton = ({ onTap, children }) => {
  const [touched, setTouched] = useState(false);
  
  return (
    <button
      onTouchStart={() => setTouched(true)}
      onTouchEnd={() => {
        setTouched(false);
        onTap();
      }}
      style={{
        minHeight: '44px', // iOS touch target
        minWidth: '44px',
        transform: touched ? 'scale(0.95)' : 'scale(1)'
      }}
    >
      {children}
    </button>
  );
};
```

### Responsive Images
```typescript
// Serve appropriate image sizes
const ResponsiveImage = ({ src, alt }) => {
  return (
    <picture>
      <source
        media="(max-width: 640px)"
        srcSet={`${src}?w=640&format=webp`}
        type="image/webp"
      />
      <source
        media="(max-width: 1024px)"
        srcSet={`${src}?w=1024&format=webp`}
        type="image/webp"
      />
      <img
        src={`${src}?w=1920`}
        alt={alt}
        loading="lazy"
      />
    </picture>
  );
};
```

## Monitoring and Profiling

### Performance Metrics
```typescript
// Track Core Web Vitals
import { getCLS, getFID, getLCP } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send to your analytics endpoint
  const body = JSON.stringify(metric);
  
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/analytics', body);
  } else {
    fetch('/analytics', { body, method: 'POST', keepalive: true });
  }
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getLCP(sendToAnalytics);
```

### React DevTools Profiling
```typescript
// Add profiling markers
import { Profiler } from 'react';

function onRenderCallback(id, phase, actualDuration) {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
}

<Profiler id="Dashboard" onRender={onRenderCallback}>
  <Dashboard />
</Profiler>
```

## Build Configuration

### Vite Optimization
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui', '@shadcn'],
          'supabase': ['@supabase/supabase-js'],
          'utils': ['date-fns', 'clsx', 'zod']
        }
      }
    },
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
});
```