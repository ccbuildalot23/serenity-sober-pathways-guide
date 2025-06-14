
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
      duration: 10000,
      action: {
        label: "Crisis Tools",
        onClick: () => navigate('/crisis-toolkit')
      }
    });
  };

  // Handler for showing interventions
  const handleShowInterventions = (stats: Record<string, any>) => {
    console.log('Showing effective interventions:', stats);
    
    // Find most effective interventions
    const sortedInterventions = Object.entries(stats)
      .sort(([,a], [,b]) => (b as any).averageEffectiveness - (a as any).averageEffectiveness)
      .slice(0, 3);
    
    if (sortedInterventions.length > 0) {
      const interventionsList = sortedInterventions
        .map(([name, data]) => `${name} (${((data as any).averageEffectiveness * 10).toFixed(1)}/10)`)
        .join(', ');
      
      toast.success("Your most effective strategies", {
        description: `Based on your history: ${interventionsList}`,
        duration: 8000,
        action: {
          label: "Use Now",
          onClick: () => navigate('/crisis-toolkit')
        }
      });
    } else {
      toast.info("Building your intervention history", {
        description: "Complete a few crisis resolutions to see personalized recommendations",
        action: {
          label: "Learn More",
          onClick: () => navigate('/crisis-toolkit')
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
