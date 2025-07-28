import React, { useState, useEffect } from 'react';
import { Video, VideoOff, Mic, MicOff, Phone, Settings, Clock, Users } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppointmentService } from '@/services/appointmentService';
import { TelehealthSession } from '@/types/appointment';
import { toast } from 'sonner';

interface TelehealthWaitingRoomProps {
  open: boolean;
  appointmentId: string;
  userRole: 'patient' | 'provider';
  onClose: () => void;
}

export const TelehealthWaitingRoom: React.FC<TelehealthWaitingRoomProps> = ({
  open,
  appointmentId,
  userRole,
  onClose
}) => {
  const [session, setSession] = useState<TelehealthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'waiting' | 'failed'>('connecting');

  useEffect(() => {
    if (open && appointmentId) {
      loadSession();
      setupMedia();
    }

    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [open, appointmentId]);

  const loadSession = async () => {
    try {
      setLoading(true);
      const sessionData = await AppointmentService.getTelehealthSession(appointmentId);
      setSession(sessionData);
      setConnectionStatus('waiting');
    } catch (error) {
      console.error('Error loading session:', error);
      toast.error('Failed to load session details');
      setConnectionStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  const setupMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setMediaStream(stream);
      
      // Display local video preview
      const videoElement = document.getElementById('local-video') as HTMLVideoElement;
      if (videoElement) {
        videoElement.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast.error('Unable to access camera or microphone');
    }
  };

  const toggleVideo = () => {
    if (mediaStream) {
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoEnabled;
        setVideoEnabled(!videoEnabled);
      }
    }
  };

  const toggleAudio = () => {
    if (mediaStream) {
      const audioTrack = mediaStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioEnabled;
        setAudioEnabled(!audioEnabled);
      }
    }
  };

  const joinSession = () => {
    if (session?.video_link) {
      // In a real implementation, this would integrate with a video calling service
      // For now, we'll open the link in a new window
      window.open(session.video_link, '_blank', 'width=1200,height=800');
      toast.success('Joining video session...');
      onClose();
    }
  };

  const endCall = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }
    toast.info('Call ended');
    onClose();
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl h-[600px]">
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!session || connectionStatus === 'failed') {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <Card>
            <CardContent className="text-center py-8">
              <h3 className="text-lg font-semibold mb-2">Session Unavailable</h3>
              <p className="text-muted-foreground mb-4">
                Unable to access the telehealth session at this time.
              </p>
              <Button onClick={onClose}>Close</Button>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl h-[600px] p-0">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Video className="h-5 w-5" />
              <div>
                <h2 className="font-semibold">Telehealth Session</h2>
                <p className="text-sm text-muted-foreground">
                  {userRole === 'patient' ? 'Waiting for provider...' : 'Patient waiting room'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'}>
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  connectionStatus === 'connected' ? 'bg-green-500' : 'bg-yellow-500'
                }`} />
                {connectionStatus === 'connected' ? 'Connected' : 'Waiting'}
              </Badge>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex">
            {/* Video Preview */}
            <div className="flex-1 bg-black relative">
              <video
                id="local-video"
                autoPlay
                muted
                className="w-full h-full object-cover"
                style={{ display: videoEnabled ? 'block' : 'none' }}
              />
              
              {!videoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <div className="text-center text-white">
                    <VideoOff className="h-12 w-12 mx-auto mb-2" />
                    <p>Camera is off</p>
                  </div>
                </div>
              )}

              {/* Local Controls */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                <Button
                  size="sm"
                  variant={videoEnabled ? "default" : "destructive"}
                  onClick={toggleVideo}
                >
                  {videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </Button>
                
                <Button
                  size="sm"
                  variant={audioEnabled ? "default" : "destructive"}
                  onClick={toggleAudio}
                >
                  {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Sidebar */}
            <div className="w-80 border-l bg-muted/30 p-4 space-y-4">
              {/* Pre-session checklist */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Before You Start</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    {videoEnabled ? '✅' : '❌'} Camera is working
                  </div>
                  <div className="flex items-center gap-2">
                    {audioEnabled ? '✅' : '❌'} Microphone is working
                  </div>
                  <div className="flex items-center gap-2">
                    ✅ Stable internet connection
                  </div>
                  <div className="flex items-center gap-2">
                    ✅ Quiet, private space
                  </div>
                </CardContent>
              </Card>

              {/* Session Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Session Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Duration:</span> 50 minutes
                  </div>
                  <div>
                    <span className="font-medium">Session ID:</span> #{appointmentId.slice(0, 8)}
                  </div>
                  <div>
                    <span className="font-medium">Participant:</span> 
                    {userRole === 'patient' ? 'You (Patient)' : 'Provider'}
                  </div>
                </CardContent>
              </Card>

              {/* Waiting Room Actions */}
              <div className="space-y-2">
                <Button 
                  onClick={joinSession} 
                  className="w-full"
                  disabled={connectionStatus !== 'waiting'}
                >
                  <Video className="h-4 w-4 mr-2" />
                  Join Session
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className="w-full"
                >
                  Leave Waiting Room
                </Button>
              </div>

              {/* Technical Support */}
              <Card>
                <CardContent className="p-3 text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Need Help?</p>
                  <p>If you're experiencing technical issues, please contact support or refresh your browser.</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="p-4 border-t flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>1 participant in waiting room</span>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              
              <Button variant="destructive" size="sm" onClick={endCall}>
                <Phone className="h-4 w-4 mr-2" />
                End Call
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};