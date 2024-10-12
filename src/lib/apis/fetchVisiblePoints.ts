import { BoundingBox } from '../utils/types';

export const connectWebSocket = (
  onData: (data: Uint8Array) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onMessage: (message: any) => void,
  onOpen: () => void,
  onClose: () => void,
  onError: (error: Event) => void
): WebSocket => {
  const ws = new WebSocket('ws://localhost:8080'); // Adjust the URL as needed
  ws.binaryType = 'arraybuffer'; // Set binary type to handle binary data

  ws.onopen = () => {
    onOpen();
  };

  ws.onmessage = (event) => {
    if (typeof event.data === 'string') {
      const message = JSON.parse(event.data);
      onMessage(message);
    } else if (event.data instanceof ArrayBuffer) {
      onData(new Uint8Array(event.data));
    }
  };

  ws.onclose = () => {
    onClose();
  };

  ws.onerror = (error) => {
    onError(error);
  };

  return ws;
};

export const sendGetVisiblePointsRequest = (
  ws: WebSocket,
  fileId: string,
  boundingBox: BoundingBox
) => {
  const message = {
    type: 'getVisiblePoints',
    fileId,
    boundingBox,
  };
  ws.send(JSON.stringify(message));
};

export const closeWebSocket = (ws: WebSocket) => {
  ws.close();
};
