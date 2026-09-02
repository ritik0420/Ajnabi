"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { createSocket } from "@/lib/socket";

export type CallStatus =
  | "idle"
  | "requesting-media"
  | "media-error"
  | "searching"
  | "connecting"
  | "in-call"
  | "ended";

// STUN only: peers still exchange real IP addresses via ICE candidates.
// A TURN server (iceTransportPolicy: "relay") is required before this
// goes in front of real users, to keep IPs hidden from the matched peer.
const ICE_SERVERS: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];

interface MatchFoundPayload {
  roomId: string;
  initiator: boolean;
}

interface SdpPayload {
  sdp: RTCSessionDescriptionInit;
}

interface IceCandidatePayload {
  candidate: RTCIceCandidateInit;
}

export function useVideoChat() {
  const [status, setStatus] = useState<CallStatus>("idle");

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const teardownPeerConnection = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    pendingCandidatesRef.current = [];
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, []);

  const stopLocalStream = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  }, []);

  const endCall = useCallback(() => {
    teardownPeerConnection();
    socketRef.current?.disconnect();
    socketRef.current = null;
    stopLocalStream();
    setStatus("idle");
  }, [stopLocalStream, teardownPeerConnection]);

  const setupPeerConnection = useCallback(
    async (roomId: string, initiator: boolean) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      localStreamRef.current
        ?.getTracks()
        .forEach((track) => pc.addTrack(track, localStreamRef.current!));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        setStatus("in-call");
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current?.emit("webrtc:ice-candidate", {
            candidate: event.candidate,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") {
          console.error("peer connection failed", roomId);
        }
      };

      if (initiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current?.emit("webrtc:offer", { sdp: pc.localDescription });
      }
    },
    [],
  );

  const flushPendingCandidates = useCallback(async (pc: RTCPeerConnection) => {
    for (const candidate of pendingCandidatesRef.current) {
      await pc.addIceCandidate(candidate);
    }
    pendingCandidatesRef.current = [];
  }, []);

  const registerSocketListeners = useCallback(
    (socket: Socket) => {
      socket.on("queue:waiting", () => setStatus("searching"));

      socket.on("match:found", ({ roomId, initiator }: MatchFoundPayload) => {
        setStatus("connecting");
        void setupPeerConnection(roomId, initiator);
      });

      socket.on("webrtc:offer", async ({ sdp }: SdpPayload) => {
        const pc = pcRef.current;
        if (!pc) return;
        await pc.setRemoteDescription(sdp);
        await flushPendingCandidates(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc:answer", { sdp: pc.localDescription });
      });

      socket.on("webrtc:answer", async ({ sdp }: SdpPayload) => {
        const pc = pcRef.current;
        if (!pc) return;
        await pc.setRemoteDescription(sdp);
        await flushPendingCandidates(pc);
      });

      socket.on(
        "webrtc:ice-candidate",
        async ({ candidate }: IceCandidatePayload) => {
          const pc = pcRef.current;
          if (!pc) return;
          if (pc.remoteDescription) {
            await pc.addIceCandidate(candidate);
          } else {
            pendingCandidatesRef.current.push(candidate);
          }
        },
      );

      socket.on("match:ended", () => {
        teardownPeerConnection();
        setStatus("ended");
      });
    },
    [flushPendingCandidates, setupPeerConnection, teardownPeerConnection],
  );

  const startCall = useCallback(async () => {
    setStatus("requesting-media");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    } catch {
      setStatus("media-error");
      return;
    }

    const socket = createSocket();
    socketRef.current = socket;
    registerSocketListeners(socket);
    // .once, not .on: this fires on the initial connect only. A later
    // auto-reconnect (e.g. after a background-tab network blip) must not
    // silently re-queue someone who was already matched or mid-call.
    socket.once("connect", () => socket.emit("queue:join"));
  }, [registerSocketListeners]);

  const cancelSearch = useCallback(() => {
    socketRef.current?.emit("queue:leave");
    endCall();
  }, [endCall]);

  useEffect(() => endCall, [endCall]);

  return {
    status,
    localVideoRef,
    remoteVideoRef,
    startCall,
    cancelSearch,
    endCall,
  };
}
