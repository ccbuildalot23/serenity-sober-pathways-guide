import React, { useState } from 'react';
import { DataExportRequest } from './DataExportRequest';
import { ExportRequestHistory } from './ExportRequestHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, FileText, Download, Clock } from 'lucide-react';

export const DataExportDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('request');

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-6 h-6" />
            HIPAA-Compliant Data Export
          </CardTitle>
          <p className="text-muted-foreground">
            Export your personal health information securely and in compliance with HIPAA regulations. 
            Your data will be encrypted and available for secure download.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <FileText className="w-8 h-8 text-primary" />
              <div>
                <div className="font-medium">Multiple Formats</div>
                <div className="text-sm text-muted-foreground">JSON, CSV, PDF, CCD</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <div className="font-medium">Secure Download</div>
                <div className="text-sm text-muted-foreground">Encrypted & time-limited</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <Clock className="w-8 h-8 text-primary" />
              <div>
                <div className="font-medium">Fast Processing</div>
                <div className="text-sm text-muted-foreground">Ready in 24-48 hours</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="request" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            New Export Request
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Request History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="request" className="mt-6">
          <DataExportRequest />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <ExportRequestHistory />
        </TabsContent>
      </Tabs>

      {/* Compliance Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">HIPAA Compliance & Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Data Security</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• All exports are encrypted using AES-256 encryption</li>
                <li>• Download links expire after 48 hours</li>
                <li>• All access attempts are logged and monitored</li>
                <li>• Secure token-based authentication required</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">HIPAA Rights</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Right to access your personal health information</li>
                <li>• Right to receive data in commonly used formats</li>
                <li>• Complete audit trail of all data access</li>
                <li>• Secure transmission and storage protocols</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">Important Information</h4>
            <p className="text-sm text-muted-foreground">
              Your personal health information is protected under HIPAA regulations. This export contains 
              sensitive data that should be handled securely. Do not share download links or exported files 
              with unauthorized individuals. If you believe there has been a security breach, please contact 
              our privacy officer immediately.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};