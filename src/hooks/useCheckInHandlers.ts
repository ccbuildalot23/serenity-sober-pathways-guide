
import { toast } from 'sonner';

export const useCheckInHandlers = () => {
  const navigate = (path: string) => {
    window.location.href = path;
  };

  // Handler for crisis detection
  const handleCrisisDetected = () => {
    console.log('Crisis detected! Activating crisis mode...');
    toast.error("Crisis mode activated", {
      description: "Your support network has been notified",
      _duration: 10000,
      _action: {
        label: "Crisis Tools",
        _onClick: () => navigate('/crisis-support')
      }
    });
  };

  // Handler for showing interventions
  const handleShowInterventions = (_stats: Record<string, any>) => {
    console.log('Showing effective interventions:', _stats);
    
    // Find most effective interventions
    const sortedInterventions = Object.entries(_stats)
      .sort(([,a], [,b]) => (b as any).averageEffectiveness - (a as any).averageEffectiveness)
      .slice(0, 3);
    
    if (sortedInterventions.length > 0) {
      const interventionsList = sortedInterventions
        .map(([name, data]) => `${name} (${((data as any).averageEffectiveness * 10).toFixed(1)}/10)`)
        .join(', ');
      
      toast.success("Your most effective strategies", {
        description: `Based on your history: ${interventionsList}`,
        _duration: 8000,
        _action: {
          label: "Use Now",
          _onClick: () => navigate('/crisis-support')
        }
      });
    } else {
      toast.info("Building your intervention history", {
        description: "Complete a few crisis resolutions to see personalized recommendations",
        _action: {
          label: "Learn More",
          _onClick: () => navigate('/crisis-support')
        }
      });
    }
  };

  return {
    handleCrisisDetected,
    handleShowInterventions,
    navigate
  };
};
