import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  Video, VideoOff, Mic, MicOff, Phone, PhoneOff, 
  Monitor, Settings, Volume2, VolumeX, Camera, 
  RotateCcw, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { enhancedPeerSupportService, VideoSession } from '@/services/enhancedPeerSupportService';
import { useAuth } from '@/contexts/AuthContext';

interface VideoCallInterfaceProps {
  session: VideoSession;
  onEndCall: () => void;
  onEscalate: () => void;
}

const VideoCallInterface: React.FC<VideoCallInterfaceProps> = ({
  session,
  onEndCall,
  onEscalate
}) => {
  const { user } = useAuth();
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [volume, setVolume] = useState([80]);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'fair' | 'poor'>('good');
  const [_callDuration, setCallDuration] = useState(0);
  const [_technicalIssues, setTechnicalIssues] = useState<string[]>([]);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    initializeMedia();
    const _timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(_timer);
      cleanup();
    };
  }, []);

  const initializeMedia = async () => {
    try {
      const _constraints = {
        video: session.session_type === 'video',
        _audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(_constraints);
      mediaStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Simulate connection setup
      setTimeout(() => {
        toast.success('Connected to peer supporter');
      }, 1000);

    } catch (error) {
      console.error('Failed to access media devices:', error);
      toast.error('Failed to access camera/microphone');
      setTechnicalIssues(prev => [...prev, 'Media access failed']);
    }
  };

  const cleanup = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const toggleVideo = () => {
    if (mediaStreamRef.current) {
      const videoTracks = mediaStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleAudio = () => {
    if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !isAudioEnabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const startScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          _audio: true
        });
        
        // Replace video track with screen share
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        setIsScreenSharing(true);
        toast.success('Screen sharing started');
        
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          initializeMedia(); // Return to camera
        };
      } catch (error) {
        toast.error('Failed to start screen sharing');
        setTechnicalIssues(prev => [...prev, 'Screen sharing failed']);
      }
    } else {
      setIsScreenSharing(false);
      initializeMedia(); // Return to camera
    }
  };

  const switchCamera = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length > 1) {
        // Switch to next camera (simplified logic)
        toast.success('Camera switched');
      } else {
        toast.info('Only one camera available');
      }
    } catch (error) {
      toast.error('Failed to switch camera');
    }
  };

  const reportTechnicalIssue = (issue: string) => {
    setTechnicalIssues(prev => [...prev, issue]);
    toast.info(`Reported: ${issue}`);
  };

  const endCall = async () => {
    try {
      await enhancedPeerSupportService.endVideoSession(
        session.id, 
        connectionQuality === 'good' ? 5 : connectionQuality === 'fair' ? 3 : 1,
        _technicalIssues
      );
      cleanup();
      onEndCall();
      toast.success('Call ended');
    } catch (error) {
      console.error('Failed to end call:', error);
      toast.error('Failed to end call');
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getQualityColor = () => {
    switch (connectionQuality) {
      case 'good': return 'text-green-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-gray-800">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Peer Support Video Call</h2>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connectionQuality === 'good' ? 'bg-green-500' : connectionQuality === 'fair' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
            <span className={`text-sm ${getQualityColor()}`}>
              {connectionQuality} connection
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm bg-gray-700 px-3 py-1 rounded">
            {formatDuration(_callDuration)}
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={onEscalate}
            className="flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            Crisis
          </Button>
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative">
        {/* Remote Video */}
        <video
          ref={remoteVideoRef}
          className="w-full h-full object-cover bg-gray-800"
          autoPlay
          playsInline
        />
        
        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute top-4 right-4 w-64 h-48 bg-gray-700 rounded-lg overflow-hidden border-2 border-gray-600">
          <video
            ref={localVideoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />
          {!isVideoEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <VideoOff className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Connection Issues Overlay */}
        {connectionQuality === 'poor' && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg">
            Poor connection quality - Consider switching to _audio only
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4">
        <div className="flex justify-center items-center gap-4">
          {/* Video Toggle */}
          <Button
            variant={isVideoEnabled ? "default" : "destructive"}
            size="lg"
            onClick={toggleVideo}
            className="rounded-full w-12 h-12 p-0"
          >
            {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </Button>

          {/* Audio Toggle */}
          <Button
            variant={isAudioEnabled ? "default" : "destructive"}
            size="lg"
            onClick={toggleAudio}
            className="rounded-full w-12 h-12 p-0"
          >
            {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </Button>

          {/* Screen Share */}
          <Button
            variant={isScreenSharing ? "secondary" : "outline"}
            size="lg"
            onClick={startScreenShare}
            className="rounded-full w-12 h-12 p-0"
          >
            <Monitor className="w-6 h-6" />
          </Button>

          {/* Switch Camera */}
          <Button
            variant="outline"
            size="lg"
            onClick={switchCamera}
            className="rounded-full w-12 h-12 p-0"
          >
            <RotateCcw className="w-6 h-6" />
          </Button>

          {/* Volume Control */}
          <div className="flex items-center gap-2 bg-gray-700 px-3 py-2 rounded-lg">
            <Volume2 className="w-4 h-4" />
            <Slider
              value={volume}
              onValueChange={setVolume}
              max={100}
              step={1}
              className="w-20"
            />
          </div>

          {/* End Call */}
          <Button
            variant="destructive"
            size="lg"
            onClick={endCall}
            className="rounded-full w-12 h-12 p-0 bg-red-600 hover:bg-red-700"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => reportTechnicalIssue('Audio issues')}
            className="text-gray-300"
          >
            Report Audio Issue
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => reportTechnicalIssue('Video lag')}
            className="text-gray-300"
          >
            Report Video Lag
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConnectionQuality('poor')}
            className="text-gray-300"
          >
            Switch to Audio Only
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VideoCallInterface;