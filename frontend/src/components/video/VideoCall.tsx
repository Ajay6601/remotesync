import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MicrophoneIcon,
  VideoCameraIcon,
  PhoneXMarkIcon,
  SpeakerWaveIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  UserPlusIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
} from '@heroicons/react/24/outline';
import {
  MicrophoneIcon as MicrophoneIconSolid,
  VideoCameraIcon as VideoCameraIconSolid,
  SpeakerWaveIcon as SpeakerWaveIconSolid,
} from '@heroicons/react/24/solid';
import { webrtcService } from '../../services/webrtc.ts';
import Button from '../ui/Button.tsx';

interface VideoCallProps {
  callId: string;
  participants: string[];
  onEndCall: () => void;
}

const VideoCall: React.FC<VideoCallProps> = ({ callId, participants, onEndCall }) => {
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor'>('excellent');
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const callStartTime = useRef<number>(Date.now());

  useEffect(() => {
    // Initialize local media
    webrtcService.initializeMedia().then((stream) => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    }).catch((error) => {
      console.error('Failed to access media devices:', error);
      setIsVideoEnabled(false);
      setIsAudioEnabled(false);
    });

    // Handle remote streams
    webrtcService.onStream((stream, userId) => {
      setRemoteStreams(prev => new Map(prev.set(userId, stream)));
    });

    // Call duration timer
    const timer = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTime.current) / 1000));
    }, 1000);

    // Cleanup on unmount
    return () => {
      clearInterval(timer);
      webrtcService.endAllCalls();
    };
  }, []);

  useEffect(() => {
    // Update remote video elements when streams change
    remoteStreams.forEach((stream, userId) => {
      const videoElement = remoteVideoRefs.current.get(userId);
      if (videoElement) {
        videoElement.srcObject = stream;
      }
    });
  }, [remoteStreams]);

  const handleToggleAudio = () => {
    const enabled = webrtcService.toggleAudio();
    setIsAudioEnabled(enabled);
  };

  const handleToggleVideo = () => {
    const enabled = webrtcService.toggleVideo();
    setIsVideoEnabled(enabled);
  };

  const handleToggleSpeaker = () => {
    setIsSpeakerEnabled(!isSpeakerEnabled);
    // In a real implementation, this would change audio output device
  };

  const handleEndCall = () => {
    webrtcService.endAllCalls();
    onEndCall();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getConnectionQualityColor = () => {
    switch (connectionQuality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const totalParticipants = participants.length + 1; // +1 for current user
  const gridCols = totalParticipants === 1 ? 'grid-cols-1' :
                   totalParticipants === 2 ? 'grid-cols-2' :
                   totalParticipants <= 4 ? 'grid-cols-2 grid-rows-2' :
                   totalParticipants <= 9 ? 'grid-cols-3 grid-rows-3' :
                   'grid-cols-4 grid-rows-4';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 bg-black z-50 flex flex-col"
    >
      {/* Top bar with call info */}
      <div className="flex items-center justify-between p-4 bg-gray-900 bg-opacity-90">
        <div className="flex items-center space-x-4">
          <div className="text-white">
            <h3 className="font-semibold">Video Call</h3>
            <p className="text-sm text-gray-300">
              {formatDuration(callDuration)} • {totalParticipants} participant{totalParticipants !== 1 ? 's' : ''}
            </p>
          </div>
          
          <div className={`flex items-center space-x-1 ${getConnectionQualityColor()}`}>
            <div className="w-2 h-2 rounded-full bg-current"></div>
            <span className="text-xs capitalize">{connectionQuality}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowChat(!showChat)}
            className="bg-gray-700 hover:bg-gray-600 text-white"
          >
            <ChatBubbleLeftRightIcon className="h-4 w-4" />
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={toggleFullscreen}
            className="bg-gray-700 hover:bg-gray-600 text-white"
          >
            {isFullscreen ? (
              <ArrowsPointingInIcon className="h-4 w-4" />
            ) : (
              <ArrowsPointingOutIcon className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            className="bg-gray-700 hover:bg-gray-600 text-white"
          >
            <UserPlusIcon className="h-4 w-4" />
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            className="bg-gray-700 hover:bg-gray-600 text-white"
          >
            <Cog6ToothIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Video grid */}
      <div className="flex-1 p-4">
        <div className={`grid gap-4 h-full ${gridCols}`}>
          {/* Local video */}
          <div className="relative bg-gray-900 rounded-lg overflow-hidden group">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            
            {/* Video overlay info */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="absolute bottom-4 left-4">
                <div className="bg-black bg-opacity-75 text-white px-3 py-1 rounded-lg text-sm font-medium">
                  You (Host)
                </div>
              </div>
              
              <div className="absolute top-4 right-4 flex space-x-2">
                {!isAudioEnabled && (
                  <div className="bg-red-500 p-1 rounded">
                    <MicrophoneIcon className="h-4 w-4 text-white" />
                  </div>
                )}
                {!isVideoEnabled && (
                  <div className="bg-red-500 p-1 rounded">
                    <VideoCameraIcon className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            </div>
            
            {/* Video disabled overlay */}
            {!isVideoEnabled && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gray-600 rounded-full flex items-center justify-center mb-3">
                    <span className="text-white text-2xl font-bold">
                      {participants[0]?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <p className="text-white text-sm">Camera Off</p>
                </div>
              </div>
            )}
          </div>

          {/* Remote videos */}
          {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
            <div key={userId} className="relative bg-gray-900 rounded-lg overflow-hidden group">
              <video
                ref={(el) => {
                  if (el) {
                    remoteVideoRefs.current.set(userId, el);
                  }
                }}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="absolute bottom-4 left-4">
                  <div className="bg-black bg-opacity-75 text-white px-3 py-1 rounded-lg text-sm font-medium">
                    {userId}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Placeholder participants */}
          {participants.slice(remoteStreams.size).map((participant, index) => (
            <div key={participant} className="relative bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-gray-600 rounded-full flex items-center justify-center mb-3">
                  <span className="text-white text-2xl font-bold">
                    {participant.charAt(0).toUpperCase()}
                  </span>
                </div>
                <p className="text-white text-sm">{participant}</p>
                <p className="text-gray-400 text-xs">Connecting...</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Call controls */}
      <div className="bg-gray-900 bg-opacity-95 px-6 py-6">
        <div className="flex items-center justify-center space-x-6">
          {/* Audio toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleToggleAudio}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${
              isAudioEnabled 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
            title={isAudioEnabled ? 'Mute' : 'Unmute'}
          >
            {isAudioEnabled ? (
              <MicrophoneIconSolid className="h-6 w-6" />
            ) : (
              <MicrophoneIcon className="h-6 w-6" />
            )}
          </motion.button>

          {/* Video toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleToggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${
              isVideoEnabled 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoEnabled ? (
              <VideoCameraIconSolid className="h-6 w-6" />
            ) : (
              <VideoCameraIcon className="h-6 w-6" />
            )}
          </motion.button>

          {/* End call */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleEndCall}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all duration-200 shadow-lg"
            title="End call"
          >
            <PhoneXMarkIcon className="h-7 w-7" />
          </motion.button>

          {/* Speaker toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleToggleSpeaker}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${
              isSpeakerEnabled 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
            }`}
            title={isSpeakerEnabled ? 'Speaker on' : 'Speaker off'}
          >
            {isSpeakerEnabled ? (
              <SpeakerWaveIconSolid className="h-6 w-6" />
            ) : (
              <SpeakerWaveIcon className="h-6 w-6" />
            )}
          </motion.button>

          {/* Chat toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowChat(!showChat)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${
              showChat 
                ? 'bg-primary-600 hover:bg-primary-700 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
            title="Toggle chat"
          >
            <ChatBubbleLeftRightIcon className="h-6 w-6" />
          </motion.button>
        </div>

        {/* Call info */}
        <div className="text-center mt-4">
          <p className="text-white text-sm">
            Call duration: {formatDuration(callDuration)} • {totalParticipants} participant{totalParticipants !== 1 ? 's' : ''}
          </p>
          <p className={`text-xs mt-1 ${getConnectionQualityColor()}`}>
            Connection: {connectionQuality}
          </p>
        </div>

        {/* Advanced controls */}
        <div className="flex items-center justify-center space-x-4 mt-4">
          <button
            onClick={toggleFullscreen}
            className="text-gray-400 hover:text-white transition-colors duration-200"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <ArrowsPointingInIcon className="h-5 w-5" />
            ) : (
              <ArrowsPointingOutIcon className="h-5 w-5" />
            )}
          </button>
          
          <button className="text-gray-400 hover:text-white transition-colors duration-200" title="Settings">
            <Cog6ToothIcon className="h-5 w-5" />
          </button>
          
          <button className="text-gray-400 hover:text-white transition-colors duration-200" title="Invite participants">
            <UserPlusIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Side chat panel */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            className="absolute top-0 right-0 w-80 h-full bg-white dark:bg-dark-800 shadow-2xl border-l border-gray-200 dark:border-dark-700"
          >
            <div className="p-4 border-b border-gray-200 dark:border-dark-700">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">Call Chat</h3>
                <button
                  onClick={() => setShowChat(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="flex-1 p-4">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Chat during call will appear here...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default VideoCall;