import { BoundingBox } from '@root/lib/utils/types';

let ws: WebSocket;

self.onmessage = (event) => {
  const { type, data } = event.data;

  if (type === 'start') {
    const { fileId, boundingBox, serverUrl } = data;
    startWebSocketConnection(fileId, boundingBox, serverUrl);
  } else if (type === 'stop') {
    if (ws) {
      ws.close();
    }
  }
};

function startWebSocketConnection(
  fileId: string,
  boundingBox: BoundingBox,
  serverUrl: string
) {
  ws = new WebSocket(serverUrl);
  ws.binaryType = 'arraybuffer';

  ws.onopen = () => {
    const message = {
      type: 'getVisiblePoints',
      fileId,
      boundingBox,
    };
    ws.send(JSON.stringify(message));
  };

  ws.onmessage = (event) => {
    if (typeof event.data === 'string') {
      const message = JSON.parse(event.data);
      if (message.type === 'end') {
        self.postMessage({ type: 'end' });
      } else if (message.error) {
        self.postMessage({ type: 'error', error: message.error });
      }
    } else if (event.data instanceof ArrayBuffer) {
      processData(new Uint8Array(event.data));
    }
  };

  ws.onerror = (error) => {
    self.postMessage({ type: 'error', error: error });
  };

  ws.onclose = () => {
    self.postMessage({ type: 'closed' });
  };
}

function processData(data: Uint8Array) {
  const pointSize = 15;
  const numPoints = Math.floor(data.length / pointSize);

  const positions = new Float32Array(numPoints * 3);
  const colors = new Uint8Array(numPoints * 3);

  for (let i = 0; i < numPoints; i++) {
    const offset = i * pointSize;
    const dataView = new DataView(
      data.buffer,
      data.byteOffset + offset,
      pointSize
    );

    positions[i * 3] = dataView.getFloat32(0, true);
    positions[i * 3 + 1] = dataView.getFloat32(4, true);
    positions[i * 3 + 2] = dataView.getFloat32(8, true);

    colors[i * 3] = dataView.getUint8(12);
    colors[i * 3 + 1] = dataView.getUint8(13);
    colors[i * 3 + 2] = dataView.getUint8(14);
  }

  // Send the processed data back to the main thread
  self.postMessage(
    { type: 'data', positions: positions.buffer, colors: colors.buffer },
    { transfer: [positions.buffer, colors.buffer] }
  );
}
