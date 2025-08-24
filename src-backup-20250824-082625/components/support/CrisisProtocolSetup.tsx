import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, FileText, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const CrisisProtocolSetup: React.FC = () => {
  const [hasProtocol, setHasProtocol] = React.useState(false);

  React.useEffect(() => {
    const saved = localStorage.getItem('crisis-protocol-setup');
    setHasProtocol(saved === 'true');
  }, []);

  const handleSetupProtocol = () => {
    toast.info('Crisis protocol setup - coming soon');
    localStorage.setItem('crisis-protocol-setup', 'true');
    setHasProtocol(true);
  };

  return (
    <Card className={hasProtocol ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          {hasProtocol ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800">Crisis Protocol Active</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <span className="text-orange-800">Set Up Crisis Protocol</span>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          {hasProtocol 
            ? 'Your crisis protocol is configured and ready to activate when needed.'
            : 'Create a personalized crisis response plan for emergency situations.'}
        </p>
        <Button
          onClick={handleSetupProtocol}
          variant={hasProtocol ? 'outline' : 'default'}
          className="w-full"
        >
          <FileText className="w-4 h-4 mr-2" />
          {hasProtocol ? 'Update Protocol' : 'Create Protocol'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default CrisisProtocolSetup;
