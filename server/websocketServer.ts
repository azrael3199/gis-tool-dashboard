import WebSocket, { WebSocketServer } from 'ws';
import Point from './models/Point.js'; // Adjust the path accordingly

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', function connection(client) {
  console.log('Client connected');

  client.on('message', async function incoming(message) {
    try {
      // @ts-expect-error message is a string
      const request = JSON.parse(message);

      if (request.type === 'getVisiblePoints') {
        const { fileId, boundingBox } = request;

        if (!fileId || !boundingBox) {
          client.send(JSON.stringify({ error: 'Missing required parameters' }));
          return;
        }

        const { min, max } = boundingBox;

        // Create a MongoDB cursor
        const cursor = Point.find({
          fileId,
          x: { $gte: min.x, $lte: max.x },
          y: { $gte: min.y, $lte: max.y },
          z: { $gte: min.z, $lte: max.z },
        })
          .batchSize(10000)
          .lean()
          .cursor();

        client.on('close', () => {
          console.log('Client disconnected');
          cursor.close();
        });

        // Backpressure handling
        const MAX_BUFFERED_AMOUNT = 1 * 1024 * 1024; // 1 MB

        const sendData = async () => {
          let buffer = Buffer.alloc(0);
          const BUFFER_THRESHOLD = 64 * 1024; // 64 KB

          for await (const doc of cursor) {
            // Serialize point data
            const pointBuffer = Buffer.alloc(15);
            pointBuffer.writeFloatLE(doc.x!, 0);
            pointBuffer.writeFloatLE(doc.y!, 4);
            pointBuffer.writeFloatLE(doc.z!, 8);
            pointBuffer.writeUInt8(Math.floor(doc.color[0] * 255), 12);
            pointBuffer.writeUInt8(Math.floor(doc.color[1] * 255), 13);
            pointBuffer.writeUInt8(Math.floor(doc.color[2] * 255), 14);

            buffer = Buffer.concat([buffer, pointBuffer]);

            if (buffer.length >= BUFFER_THRESHOLD) {
              // Check if the client's buffer is not overwhelmed
              if (client.readyState === WebSocket.OPEN) {
                if (client.bufferedAmount < MAX_BUFFERED_AMOUNT) {
                  client.send(buffer);
                  buffer = Buffer.alloc(0);
                } else {
                  // Wait until the client's buffer has drained
                  await new Promise((resolve) => {
                    client.once('drain', resolve);
                  });
                }
              } else {
                console.log('WebSocket is not open');
                break;
              }
            }
          }

          // Send any remaining data
          if (buffer.length > 0 && client.readyState === WebSocket.OPEN) {
            client.send(buffer);
          }

          // Indicate completion
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'end' }));
          }
        };

        sendData().catch((error) => {
          console.error('Error sending data:', error);
        });
      } else {
        client.send(JSON.stringify({ error: 'Unknown request type' }));
      }
    } catch (error) {
      console.error('Error handling message:', error);
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ error: 'Internal server error' }));
      }
    }
  });
});

console.log('WebSocket server is running on ws://localhost:8080');
