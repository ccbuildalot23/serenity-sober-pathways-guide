import React, { useState, useEffect } from 'react';
import { HIPAADataExportService } from '@/services/hipaaDataExportService';
import { useSecureAuditLogger } from '@/hooks/useSecureAuditLogger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileText, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';

interface ExportRequest {
  id: string;
  request_reason: string;
  export_format: string;
  data_categories: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  secure_download_token: string;
  download_expires_at: string;
  downloaded_at?: string;
  created_at: string;
  completed_at?: string;
  file_size_bytes?: number;
  export_metadata?: any;
}

export const ExportRequestHistory: React.FC = () => {
  const [requests, setRequests] = useState<ExportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { logSecurityEvent } = useSecureAuditLogger();
  const { toast } = useToast();

  useEffect(() => {
    loadExportRequests();
  }, []);

  const loadExportRequests = async () => {
    try {
      const data = await HIPAADataExportService.getUserExportRequests();
      setRequests(data);
    } catch (error) {
      console.error('Failed to load export requests:', error);
      toast({
        title: "Loading Failed",
        description: "Failed to load export request history.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (request: ExportRequest) => {
    try {
      // Check if download is still valid
      if (new Date() > new Date(request.download_expires_at)) {
        toast({
          title: "Download Expired",
          description: "This download link has expired. Please submit a new export request.",
          variant: "destructive"
        });
        return;
      }

      if (request.status !== 'completed') {
        toast({
          title: "Export Not Ready",
          description: "This export is still being processed. Please check back later.",
          variant: "destructive"
        });
        return;
      }

      // Log the download attempt
      await logSecurityEvent('DATA_EXPORT_DOWNLOAD_INITIATED', {
        requestId: request.id,
        downloadToken: request.secure_download_token
      });

      // In a real implementation, this would trigger the actual download
      const downloadInfo = await HIPAADataExportService.downloadExport(
        request.id,
        request.secure_download_token
      );

      toast({
        title: "Download Started",
        description: `Downloading ${downloadInfo.fileName} (${Math.round(downloadInfo.fileSize / 1024)} KB)`,
      });

      // Refresh the list to update download timestamp
      await loadExportRequests();

    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download export file.",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'processing':
        return <AlertTriangle className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'processing':
        return 'warning';
      case 'completed':
        return 'success';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  const formatCategories = (categories: string[]) => {
    return categories.map(cat => 
      cat.charAt(0).toUpperCase() + cat.slice(1)
    ).join(', ');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">Loading export history...</div>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Export Request History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No export requests found.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Submit your first data export request to see it here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Export Request History
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          View and download your data export requests
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Categories</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-sm">
                        {request.request_reason.length > 30 
                          ? `${request.request_reason.substring(0, 30)}...`
                          : request.request_reason
                        }
                      </div>
                      {request.completed_at && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Completed {formatDistanceToNow(new Date(request.completed_at))} ago
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(request.status) as any} className="flex items-center gap-1 w-fit">
                      {getStatusIcon(request.status)}
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm max-w-48">
                      {formatCategories(request.data_categories)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {request.export_format.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {formatFileSize(request.file_size_bytes)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(request.created_at), 'MMM d, yyyy')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(request.created_at), 'h:mm a')}
                    </div>
                  </TableCell>
                  <TableCell>
                    {request.status === 'completed' && (
                      <div className="text-sm">
                        {new Date() > new Date(request.download_expires_at) ? (
                          <span className="text-destructive">Expired</span>
                        ) : (
                          <>
                            <div>{format(new Date(request.download_expires_at), 'MMM d')}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(request.download_expires_at))} left
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {request.status === 'completed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(request)}
                        disabled={new Date() > new Date(request.download_expires_at)}
                        className="flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        {request.downloaded_at ? 'Re-download' : 'Download'}
                      </Button>
                    )}
                    {request.status === 'processing' && (
                      <div className="text-sm text-muted-foreground">Processing...</div>
                    )}
                    {request.status === 'failed' && (
                      <div className="text-sm text-destructive">Failed</div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 text-xs text-muted-foreground space-y-1">
          <p>• Download links expire 48 hours after completion for security</p>
          <p>• All downloads are logged for HIPAA compliance</p>
          <p>• Contact support if you need assistance with expired downloads</p>
        </div>
      </CardContent>
    </Card>
  );
};