import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  MicrophoneIcon,
  VideoCameraIcon,
  PhoneXMarkIcon,
  SpeakerWaveIcon,
} from '@heroicons/react/24/outline';
import {
  MicrophoneIcon as MicrophoneIconSolid,
  VideoCameraIcon as VideoCameraIconSolid,
} from '@heroicons/react/24/solid';
import { webrtcService } from '../../services/webrtc';
import Button from '../ui/Button';

interface VideoCallProps {
  callId: string;
  participants: string[];
  onEndCall: () => void;
}

const VideoCall: React.FC<VideoCallProps> = ({ callId, participants, onEndCall }) => {
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  useEffect(() => {
    // Initialize local media
    webrtcService.initializeMedia().then((stream) => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    });

    // Handle remote streams
    webrtcService.onStream((stream, userId) => {
      setRemoteStreams(prev => new Map(prev.set(userId, stream)));
    });

    return () => {
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

  const handleEndCall = () => {
    webrtcService.endAllCalls();
    onEndCall();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 bg-black z-50 flex flex-col"
    >
      {/* Video grid */}
      <div className="flex-1 p-4">
        <div className={`grid gap-4 h-full ${
          remoteStreams.size === 0 ? 'grid-cols-1' :
          remoteStreams.size === 1 ? 'grid-cols-2' :
          remoteStreams.size <= 4 ? 'grid-cols-2 grid-rows-2' :
          'grid-cols-3 grid-rows-3'
        }`}>
          {/* Local video */}
          <div className="relative bg-gray-900 rounded-lg overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
              You
            </div>
            {!isVideoEnabled && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl font-semibold">You</span>
                </div>
              </div>
            )}
          </div>

          {/* Remote videos */}
          {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
            <div key={userId} className="relative bg-gray-900 rounded-lg overflow-hidden">
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
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                {userId}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Call controls */}
      <div className="flex items-center justify-center space-x-4 p-6 bg-gray-900">
        <Button
          variant="secondary"
          onClick={handleToggleAudio}
          className={`w-12 h-12 rounded-full ${
            isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {isAudioEnabled ? (
            <MicrophoneIconSolid className="h-6 w-6" />
          ) : (
            <MicrophoneIcon className="h-6 w-6" />
          )}
        </Button>

        <Button
          variant="secondary"
          onClick={handleToggleVideo}
          className={`w-12 h-12 rounded-full ${
            isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {isVideoEnabled ? (
            <VideoCameraIconSolid className="h-6 w-6" />
          ) : (
            <VideoCameraIcon className="h-6 w-6" />
          )}
        </Button>

        <Button
          variant="danger"
          onClick={handleEndCall}
          className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700"
        >
          <PhoneXMarkIcon className="h-6 w-6" />
        </Button>

        <Button
          variant="secondary"
          className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600"
        >
          <SpeakerWaveIcon className="h-6 w-6" />
        </Button>
      </div>
    </motion.div>
  );
};

export default VideoCall;