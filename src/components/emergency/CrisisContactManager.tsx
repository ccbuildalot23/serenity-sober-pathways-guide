import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Phone, Plus } from 'lucide-react';
import { toast } from 'sonner';

const CrisisContactManager: React.FC = () => {
  const [crisisContacts, setCrisisContacts] = React.useState<any[]>([]);

  React.useEffect(() => {
    const saved = localStorage.getItem('crisis-contacts');
    if (saved) {
      setCrisisContacts(JSON.parse(saved));
    }
  }, []);

  const handleAddCrisisContact = () => {
    toast.info('Add crisis contact feature coming soon');
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-red-700 mb-2">Crisis Contacts</h2>
        <p className="text-gray-600">
          Priority contacts for emergency situations
        </p>
      </div>

      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Emergency Protocols
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600 mb-4">
            These contacts will be notified immediately during a crisis
          </p>
          
          {crisisContacts.length === 0 ? (
            <div className="text-center py-8">
              <Phone className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No crisis contacts configured</p>
              <Button onClick={handleAddCrisisContact} className="bg-red-600 hover:bg-red-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Crisis Contact
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {crisisContacts.map((contact, index) => (
                <div key={index} className="p-3 bg-white rounded-lg flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">{contact.name}</h4>
                    <p className="text-sm text-gray-600">{contact.relationship}</p>
                  </div>
                  <Button size="sm" variant="outline">
                    <Phone className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CrisisContactManager;
