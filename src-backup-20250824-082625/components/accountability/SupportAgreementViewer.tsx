import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { AccountabilityPartnership } from '@/services/accountabilityService';

interface SupportAgreementViewerProps {
  partnership: AccountabilityPartnership;
}

const SupportAgreementViewer: React.FC<SupportAgreementViewerProps> = ({ partnership }) => {
  const agreement = partnership.partnership_agreement;

  if (!agreement || Object.keys(agreement).length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No support agreement found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Agreement Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2 text-blue-600" />
            Support Agreement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-medium">Partnership Status</p>
              <p className="text-sm text-gray-600">
                Accepted on {partnership.accepted_at ? new Date(partnership.accepted_at).toLocaleDateString() : 'Pending'}
              </p>
            </div>
            <Badge variant={partnership.status === 'accepted' ? 'default' : 'secondary'}>
              {partnership.status}
            </Badge>
          </div>
          
          <div className="text-sm text-gray-600">
            <p>
              This agreement outlines the mutual commitments, expectations, and boundaries 
              for your accountability partnership. Both parties have agreed to these terms.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Commitments */}
      {agreement.commitments && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
              Our Commitments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {agreement.commitments.map((commitment: string, index: number) => (
                <li key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm">{commitment}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Expectations */}
      {agreement.expectations && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <Users className="w-4 h-4 mr-2 text-blue-600" />
              Expectations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {agreement.expectations.map((expectation: string, index: number) => (
                <li key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm">{expectation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Boundaries */}
      {agreement.boundaries && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <Shield className="w-4 h-4 mr-2 text-purple-600" />
              Boundaries & Privacy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {agreement.boundaries.map((boundary: string, index: number) => (
                <li key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm">{boundary}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Emergency Protocol */}
      {agreement.emergency_protocol && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <AlertTriangle className="w-4 h-4 mr-2 text-orange-600" />
              Emergency Support Protocol
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {agreement.emergency_protocol.crisis_indicators && (
              <div>
                <h4 className="font-medium text-sm mb-2 text-orange-900">
                  Crisis Indicators to Watch For:
                </h4>
                <ul className="space-y-1">
                  {agreement.emergency_protocol.crisis_indicators.map((indicator: string, index: number) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm text-orange-800">{indicator}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {agreement.emergency_protocol.response_steps && (
              <div>
                <h4 className="font-medium text-sm mb-2 text-orange-900">
                  Response Steps:
                </h4>
                <ol className="space-y-1">
                  {agreement.emergency_protocol.response_steps.map((step: string, index: number) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-xs bg-orange-200 text-orange-800 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-sm text-orange-800">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Agreement Footer */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>
              Agreement established on {new Date(partnership.created_at).toLocaleDateString()}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            This agreement can be modified at any time with mutual consent from both partners.
            Either party may end the partnership at any time while maintaining respect and privacy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupportAgreementViewer;