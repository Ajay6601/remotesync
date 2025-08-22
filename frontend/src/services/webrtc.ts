import SimplePeer from 'simple-peer';
import { websocketService } from './websocket';

export class WebRTCService {
  private peers: Map<string, SimplePeer.Instance> = new Map();
  private localStream: MediaStream | null = null;
  private onStreamCallback: ((stream: MediaStream, userId: string) => void) | null = null;

  constructor() {
    // Listen for WebRTC signaling messages
    websocketService.onMessage((message) => {
      if (message.type === 'webrtc_signal') {
        this.handleSignal(message);
      }
    });
  }

  async initializeMedia(audio = true, video = true): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio,
        video,
      });
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }

// frontend/src/services/webrtc.ts
import SimplePeer from 'simple-peer';
import { websocketService } from './websocket';

export class WebRTCService {
  private peers: Map<string, SimplePeer.Instance> = new Map();
  private localStream: MediaStream | null = null;
  private onStreamCallback: ((stream: MediaStream, userId: string) => void) | null = null;

  constructor() {
    // Listen for WebRTC signaling messages
    websocketService.onMessage((message) => {
      if (message.type === 'webrtc_signal') {
        this.handleSignal(message);
      }
    });
  }

  async initializeMedia(audio = true, video = true): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio,
        video,
      });
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }

  async startCall(targetUserId: string, callId: string): Promise<void> {
    if (!this.localStream) {
      await this.initializeMedia();
    }

    const peer = new SimplePeer({
      initiator: true,
      trickle: false,
      stream: this.localStream!,
    });

    this.setupPeerEvents(peer, targetUserId, callId);
    this.peers.set(targetUserId, peer);
  }

  async acceptCall(fromUserId: string, callId: string): Promise<void> {
    if (!this.localStream) {
      await this.initializeMedia();
    }

    const peer = new SimplePeer({
      initiator: false,
      trickle: false,
      stream: this.localStream!,
    });

    this.setupPeerEvents(peer, fromUserId, callId);
    this.peers.set(fromUserId, peer);
  }

  private setupPeerEvents(peer: SimplePeer.Instance, userId: string, callId: string): void {
    peer.on('signal', (data) => {
      websocketService.sendWebRTCSignal(
        userId,
        'signal',
        data,
        callId
      );
    });

    peer.on('stream', (stream) => {
      if (this.onStreamCallback) {
        this.onStreamCallback(stream, userId);
      }
    });

    peer.on('error', (error) => {
      console.error('Peer connection error:', error);
      this.endCall(userId);
    });

    peer.on('close', () => {
      this.peers.delete(userId);
    });
  }

  private handleSignal(message: any): void {
    const { from_user_id, signal_data, call_id } = message;
    const peer = this.peers.get(from_user_id);

    if (peer) {
      peer.signal(signal_data);
    }
  }

  endCall(userId: string): void {
    const peer = this.peers.get(userId);
    if (peer) {
      peer.destroy();
      this.peers.delete(userId);
    }
  }

  endAllCalls(): void {
    this.peers.forEach((peer) => {
      peer.destroy();
    });
    this.peers.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.localStream = null;
    }
  }

  onStream(callback: (stream: MediaStream, userId: string) => void): void {
    this.onStreamCallback = callback;
  }

  toggleAudio(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }

  toggleVideo(): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }
}

export const webrtcService = new WebRTCService();