import SimplePeer from 'simple-peer';

export class WebRTCService {
  private peers: Map<string, SimplePeer.Instance> = new Map();
  private localStream: MediaStream | null = null;
  private onStreamCallback: ((stream: MediaStream, userId: string) => void) | null = null;

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

  private setupPeerEvents(peer: SimplePeer.Instance, userId: string, callId: string): void {
    peer.on('signal', (data) => {
      console.log('WebRTC signal:', data);
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