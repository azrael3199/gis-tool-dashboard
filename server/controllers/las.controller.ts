import { Request, Response } from 'express';
import { processLasFile } from '../services/las.service';
import File from '../models/File';
import Point from '../models/Point';
import { pipeline, Transform } from 'stream';

export const uploadLasFile = async (req: Request, res: Response) => {
  const file = req.files?.file;

  if (!file || Array.isArray(file)) {
    return res.status(400).send('No file uploaded');
  }

  try {
    // Process LAS file and store data in MongoDB
    await processLasFile(file);

    res.status(200).json({ message: 'File processed and stored successfully' });
  } catch (error) {
    res.status(500).send({
      error: (error as Error).message,
      message: 'Error processing file',
    });
  }
};

export const getUploadedFiles = async (req: Request, res: Response) => {
  try {
    const files = await File.find().select('filename uploadDate');
    res.status(200).json(files);
  } catch (error) {
    res.status(500).send({
      error: (error as Error).message,
      message: 'Error fetching files',
    });
  }
};

export const getVisiblePoints = async (req: Request, res: Response) => {
  const { fileId, boundingBox } = req.body;

  if (!fileId || !boundingBox) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const { min, max } = boundingBox;

    // Create a MongoDB cursor
    const cursor = Point.find({
      fileId,
      x: { $gte: min.x, $lte: max.x },
      y: { $gte: min.y, $lte: max.y },
      z: { $gte: min.z, $lte: max.z },
    })
      .batchSize(10000) // Adjust batch size as appropriate
      .cursor();

    // Set headers for binary streaming
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Transfer-Encoding': 'chunked',
    });

    // Transform stream to serialize data
    const transformStream = new Transform({
      writableObjectMode: true,
      transform(doc, _, callback) {
        try {
          // Allocate a buffer for one point
          const buffer = Buffer.alloc(15); // 15 bytes per point

          // Write positions (x, y, z) as 32-bit floats (little-endian)
          buffer.writeFloatLE(doc.x, 0); // bytes 0-3
          buffer.writeFloatLE(doc.y, 4); // bytes 4-7
          buffer.writeFloatLE(doc.z, 8); // bytes 8-11

          // Write colors (r, g, b) as 8-bit unsigned integers
          buffer.writeUInt8(Math.floor(doc.color[0] * 255), 12); // byte 12
          buffer.writeUInt8(Math.floor(doc.color[1] * 255), 13); // byte 13
          buffer.writeUInt8(Math.floor(doc.color[2] * 255), 14); // byte 14

          callback(null, buffer);
        } catch (err) {
          callback(err as Error);
        }
      },
    });

    // Flag to check if the client has disconnected
    let clientDisconnected = false;

    // Handle client disconnection
    const onClientDisconnect = () => {
      if (!clientDisconnected) {
        clientDisconnected = true;
        console.log('Client disconnected');
        // Destroy the cursor and streams
        cursor.destroy();
        transformStream.destroy();
      }
    };

    // Listen for client disconnect event
    req.socket.on('close', onClientDisconnect);
    res.on('error', onClientDisconnect);

    // Use pipeline for proper stream handling
    pipeline(cursor, transformStream, res, (err) => {
      if (err) {
        if (clientDisconnected) {
          console.log('Pipeline terminated due to client disconnection.');
        } else {
          console.error('Pipeline failed:', err);
          if (!res.headersSent) {
            res.status(500).end('Internal Server Error');
          }
        }
      } else {
        console.log('Pipeline succeeded.');
      }
    });
  } catch (error) {
    console.error('Error fetching visible points:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: (error as Error).message,
        message: 'Error fetching visible points',
      });
    }
  }
};
