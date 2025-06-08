
import React from 'react';
import EmergencyContactsQuickAccess from '../emergency/EmergencyContactsQuickAccess';
import ProfessionalCrisisResources from '../emergency/ProfessionalCrisisResources';
import FollowUpScheduler from './FollowUpScheduler';

interface CrisisEvent {
  id: string;
  timestamp: Date;
  riskLevel: 'low' | 'moderate' | 'high' | 'severe';
  interventionsUsed: string[];
  safetyConfirmed: boolean;
  location?: { lat: number; lng: number; };
}

interface CrisisModalsProps {
  showContacts: boolean;
  showResources: boolean;
  showFollowUp: boolean;
  currentCrisisEvent: CrisisEvent | null;
  onContactsClose: () => void;
  onResourcesClose: () => void;
  onFollowUpClose: () => void;
  onContactAdded: (contact: any) => void;
}

export const CrisisModals: React.FC<CrisisModalsProps> = ({
  showContacts,
  showResources,
  showFollowUp,
  currentCrisisEvent,
  onContactsClose,
  onResourcesClose,
  onFollowUpClose,
  onContactAdded
}) => {
  return (
    <>
      {/* Emergency Contacts Quick Access Modal */}
      {showContacts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Emergency Contacts</h2>
                <button
                  onClick={onContactsClose}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <EmergencyContactsQuickAccess
                onContactAdded={onContactAdded}
              />
            </div>
          </div>
        </div>
      )}

      {/* Professional Crisis Resources Modal */}
      {showResources && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Professional Crisis Resources</h2>
                <button
                  onClick={onResourcesClose}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <ProfessionalCrisisResources />
            </div>
          </div>
        </div>
      )}

      {/* Follow-up Scheduler Modal */}
      {showFollowUp && currentCrisisEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Follow-up Schedule</h2>
                <button
                  onClick={onFollowUpClose}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <FollowUpScheduler
                crisisEventId={currentCrisisEvent.id}
                onFollowUpComplete={(followUp) => {
                  console.log('Follow-up completed:', followUp);
                }}
              />
              <div className="mt-4 pt-4 border-t">
                <button
                  onClick={onFollowUpClose}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
