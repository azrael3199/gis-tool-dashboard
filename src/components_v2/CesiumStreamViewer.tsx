import React, { useEffect, useRef } from 'react';

const CesiumStreamViewer = ({ selectedFileId }: { selectedFileId: string }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    const startWebRTC = async () => {
      if (selectedFileId) {
        if (wsRef.current) {
          wsRef.current.close();
        }

        wsRef.current = new WebSocket('ws://localhost:8081');
        wsRef.current.onopen = async () => {
          const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
          });

          // Add a transceiver for receiving video
          pc.addTransceiver('video', { direction: 'recvonly' });

          console.log('Peer connection created:', pc);

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          if (!wsRef.current) return;

          wsRef.current.send(
            JSON.stringify({
              type: 'offer',
              sdp: offer.sdp,
              fileId: selectedFileId,
            })
          );

          pc.oniceconnectionstatechange = () => {
            console.log('ICE connection state changed:', pc.iceConnectionState);
          };

          pc.onconnectionstatechange = () => {
            console.log('Connection state changed:', pc.connectionState);
          };

          pc.onicecandidate = (event) => {
            console.log('ICE candidate event', event);
            if (event.candidate && wsRef.current) {
              wsRef.current.send(
                JSON.stringify({
                  type: 'candidate',
                  candidate: event.candidate,
                })
              );
            }
          };

          pc.ontrack = (event) => {
            console.log('Received remote track:', event);

            let stream = null;

            if (event.streams && event.streams[0]) {
              // If the stream is provided, use it
              stream = event.streams[0];
            } else {
              // Otherwise, create a new stream and add the track to it
              stream = new MediaStream([event.track]);
            }

            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          };

          if (!wsRef.current) return;

          wsRef.current.onmessage = async (event) => {
            console.log('Received message:', event.data);
            const data = JSON.parse(event.data);
            if (data.type === 'offer') {
              const offer = new RTCSessionDescription({
                type: 'offer',
                sdp: data.sdp,
              });
              await pc.setRemoteDescription(offer);
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              if (!wsRef.current) return;
              wsRef.current.send(
                JSON.stringify({ type: 'answer', answer: pc.localDescription })
              );
            } else if (data.type === 'answer') {
              const answer = new RTCSessionDescription({
                type: 'answer',
                sdp: data.sdp,
              });
              await pc.setRemoteDescription(answer);
            } else if (data.type === 'candidate') {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
          };

          pcRef.current = pc;
        };
      }
    };

    startWebRTC();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (pcRef.current) pcRef.current.close();
    };
  }, [selectedFileId]);

  // Handle user interactions
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'interaction',
            eventType: 'mousemove',
            eventData: { x: event.clientX, y: event.clientY },
          })
        );
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'interaction',
            eventType: 'mousedown',
            eventData: { x: event.clientX, y: event.clientY },
          })
        );
      }
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'interaction',
            eventType: 'mouseup',
            eventData: { x: event.clientX, y: event.clientY },
          })
        );
      }
    };

    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.addEventListener('mousemove', handleMouseMove);
      videoElement.addEventListener('mousedown', handleMouseDown);
      videoElement.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      if (videoElement) {
        videoElement.removeEventListener('mousemove', handleMouseMove);
        videoElement.removeEventListener('mousedown', handleMouseDown);
        videoElement.removeEventListener('mouseup', handleMouseUp);
      }
    };
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default CesiumStreamViewer;
