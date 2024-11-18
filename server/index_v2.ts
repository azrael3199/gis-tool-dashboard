import express, { Request, Response } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { Browser, Page } from 'puppeteer';
import { getStream, launch } from 'puppeteer-stream';
// import CDP from 'chrome-remote-interface';
import wrtc from '@roamhq/wrtc';
import WebSocket, { WebSocketServer } from 'ws';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import File_v2 from './models/File_v2';

// const {
//   RTCPeerConnection,
//   RTCSessionDescription,
//   RTCIceCandidate,
//   nonstandard,
// } = wrtc;
// const { RTCVideoSource } = nonstandard;

const app = express();
const port = 5000;

const __dirname = path.resolve();

const processingStatus: Map<string, { status: string; progress: number }> =
  new Map();

// Connect to MongoDB
// mongoose.connect('mongodb://localhost:27017/cesium_gis_app');

// let bucket: GridFSBucket | null = null;
let gfs: mongoose.mongo.GridFSBucket | null = null;

// WebSocket setup for streaming
const wss = new WebSocketServer({ port: 8081 });

interface Client {
  id: string;
  ws: WebSocket;
  peerConnection: wrtc.RTCPeerConnection;
  browser: Browser;
  page: Page;
  ffmpeg: ChildProcessWithoutNullStreams;
}

const clients: Map<string, Client> = new Map();

// Set up CORS
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));

const storage = multer.diskStorage({
  destination: 'uploads',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename =
      path.parse(file.originalname).name.replaceAll(' ', '_') +
      '-' +
      uuid() +
      ext;
    cb(null, filename);
  },
});
// Set up Multer for file uploads
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 * 1024 },
});

wss.on('connection', (ws) => {
  const clientId = uuid();
  console.log(`New client connected: ${clientId}`);

  let client: Client;

  ws.on('message', async (message: string) => {
    const data = JSON.parse(message);

    if (data.type === 'offer') {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { sdp, fileId } = data;

      // Create RTCPeerConnection
      const peerConnection = new wrtc.RTCPeerConnection();

      // Handle ICE candidates from the client
      peerConnection.onicecandidate = (event) => {
        // console.log('ICE candidate event', event);
        if (event.candidate) {
          ws.send(
            JSON.stringify({ type: 'candidate', candidate: event.candidate })
          );
        }
      };

      // Handle track event (if needed)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      peerConnection.ontrack = (event: RTCTrackEvent) => {
        // Handle incoming tracks if applicable
      };

      // Launch Puppeteer browser
      const browser = await launch({
        defaultViewport: null,
        executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
        headless: 'new', // Use the new headless mode
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--use-gl=egl', // Enable OpenGL ES via EGL
          '--enable-webgl',
          '--ignore-gpu-blocklist',
          '--allow-insecure-localhost',
          '--disable-gpu-sandbox',
          '--enable-logging',
          '--v=1',
          '--enable-unsafe-swiftshader',
        ],
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });

      // page.on('console', (msg) => {
      //   const messageType = msg.type().toUpperCase();
      //   const messageArgs = msg.args().map((arg) => arg.toString());
      //   console.log(`PAGE ${messageType}:`, ...messageArgs);
      // });

      // page.on('pageerror', (err) => {
      //   console.log(`PAGE ERROR: ${err.toString()}`);
      // });

      // page.on('error', (err) => {
      //   console.log(`ERROR: ${err.toString()}`);
      // });

      page.on('requestfailed', (request) => {
        console.log(
          `Request failed: ${request.url()} - ${request.failure()?.errorText}`
        );
      });

      // Navigate to the Cesium viewer page with fileId
      await page.goto(
        `http://localhost:${port}/cesium-viewer?fileId=${fileId}`
      );

      // Get the compressed video stream from the page
      const stream = await getStream(page, { audio: false, video: true });

      // Spawn FFmpeg to decode the stream
      const ffmpeg = spawn('ffmpeg', [
        '-f',
        'webm', // Input format
        '-i',
        'pipe:0', // Read from piped Puppeteer stream
        '-an', // Disable audio
        '-r',
        '60',
        '-vf',
        'scale=1280:720', // Set resolution
        '-pix_fmt',
        'yuv420p', // Set pixel format to YUV420p
        '-f',
        'rawvideo', // Output as raw video
        'pipe:1',
      ]);

      // const ffmpeg = spawn('ffmpeg', [
      //   '-f',
      //   'webm', // Input format
      //   '-i',
      //   'pipe:0', // Read from piped Puppeteer stream
      //   '-an', // Disable audio
      //   '-vf',
      //   'scale=640:480', // Set resolution to 640x480
      //   '-c:v',
      //   'libx264', // Use H.264 codec
      //   '-preset',
      //   'ultrafast', // Use ultrafast preset
      //   '-pix_fmt',
      //   'yuv420p', // Set pixel format to YUV420p
      //   '-f',
      //   'rawvideo', // Output as raw video
      //   'pipe:1',
      // ]);

      // const ffmpeg = spawn('ffmpeg', [
      //   '-f',
      //   'webm',
      //   '-i',
      //   'pipe:0',
      //   '-an',
      //   '-r',
      //   '60',
      //   '-vf',
      //   'scale=1280:720', // Set resolution
      //   '-c:v',
      //   'libx264', // Use H.264 codec
      //   '-preset',
      //   'veryfast', // Encoding speed
      //   '-tune',
      //   'zerolatency',
      //   '-b:v',
      //   '1500k',
      //   '-pix_fmt',
      //   'yuv420p', // Set pixel format to YUV420p
      //   '-f',
      //   'rawvideo',
      //   'pipe:1',
      // ]);

      // const ffmpeg = spawn('ffmpeg', [
      //   '-f',
      //   'webm',
      //   '-i',
      //   'pipe:0',
      //   '-an',
      //   '-r',
      //   '120',
      //   '-vf',
      //   'scale=1280:720', // Set resolution
      //   '-c:v',
      //   'h264_nvenc',
      //   '-preset',
      //   'llhp',
      //   '-tune',
      //   'ull', // Ultra-low latency
      //   '-b:v',
      //   '1500k',
      //   '-pix_fmt',
      //   'yuv420p',
      //   '-f',
      //   'rawvideo',
      //   'pipe:1',
      // ]);

      // // Handle FFmpeg errors
      // ffmpeg.stderr.on('data', (data) => {
      //   console.error('FFmpeg stderr:', data.toString());
      // });

      // ffmpeg.on('error', (error) => {
      //   console.error('FFmpeg error:', error);
      // });

      ffmpeg.on('close', (code) => {
        console.log(`FFmpeg exited with code ${code}`);
      });

      // Pipe the Puppeteer stream into FFmpeg
      stream.pipe(ffmpeg.stdin);

      // Use RTCVideoSource to create a video track
      const { RTCVideoSource } = wrtc.nonstandard;
      const videoSource = new RTCVideoSource();
      const videoTrack = videoSource.createTrack();

      // Add the video track to the peer connection
      peerConnection.addTrack(videoTrack);

      // Read frames from FFmpeg's stdout
      const frameWidth = 1280;
      const frameHeight = 720;
      const frameSize = frameWidth * frameHeight * 1.5; // For rgb24 format
      let frameBuffer = Buffer.alloc(frameSize);

      ffmpeg.stdout.on('data', (chunk: Buffer) => {
        frameBuffer = Buffer.concat([frameBuffer, chunk]);

        while (frameBuffer.length >= frameSize) {
          const frameData = Buffer.from(frameBuffer.slice(0, frameSize));
          frameBuffer = frameBuffer.slice(frameSize);

          // console.log('Data length:', frameData.byteLength);
          // console.log('Buffer length:', frameBuffer.byteLength);

          videoSource.onFrame({
            data: frameData,
            width: frameWidth,
            height: frameHeight,
          });
        }
      });

      // console.log('SDP', sdp);

      // Set the remote description
      const offer = new wrtc.RTCSessionDescription({
        type: 'offer',
        sdp: data.sdp,
      });
      await peerConnection.setRemoteDescription(offer);

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      // console.log('Answer set successfully', answer);

      // Send answer back to client
      ws.send(
        JSON.stringify({
          ...peerConnection.localDescription,
        })
      );
      console.log('Answer sent successfully');

      // Save client info
      client = {
        id: clientId,
        ws,
        peerConnection,
        // @ts-expect-error browser and page are initialized later
        browser,
        // @ts-expect-error browser and page are initialized later
        page,
        ffmpeg,
      };
      clients.set(clientId, client);
    } else if (data.type === 'answer') {
      // Handle answer from the client
      try {
        const answer = new RTCSessionDescription({
          type: 'answer',
          sdp: data.sdp,
        });
        await client.peerConnection.setRemoteDescription(answer);
      } catch (error) {
        console.error('Error setting remote description:', error);
      }
    } else if (data.type === 'icecandidate') {
      // Handle ICE candidates from the client
      try {
        if (!client.peerConnection) return;
        await client.peerConnection.addIceCandidate(
          new wrtc.RTCIceCandidate(data.candidate)
        );
        // console.log('ICE candidate added successfully:', data.candidate);
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    } else if (data.type === 'interaction') {
      // Handle interaction events from the client
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { eventType, eventData } = data;
      if (client && client.page && eventData) {
        // console.log('Page', client.page.mouse);
        try {
          // await client.page.mouse[eventType](...eventData);
        } catch (error) {
          console.error('Error handling interaction:', error);
        }
      }
    }
  });

  ws.on('close', async () => {
    console.log(`Client disconnected: ${clientId}`);
    if (client) {
      if (client.peerConnection) client.peerConnection.close();
      if (client.browser) await client.browser.close();
      if (client.ffmpeg) client.ffmpeg.kill('SIGINT');
      clients.delete(clientId);
    }
  });
});

async function processFile(file: Express.Multer.File, fileId: string) {
  try {
    processingStatus.set(fileId, { status: 'Processing started', progress: 0 });

    const tempDir = path.join(__dirname, 'temp', fileId);
    await fs.promises.mkdir(tempDir, { recursive: true });

    const epsgCode = 4326;
    processingStatus.set(fileId, { status: 'Translating file', progress: 25 });
    // const newPath = await translateFileToLasWithEpsg(file.path, epsgCode);

    // if (!newPath) {
    //   processingStatus.set(fileId, {
    //     status: 'Error translating file',
    //     progress: -1,
    //   });
    //   throw new Error('Error translating file');
    // }

    // file.path = newPath;

    processingStatus.set(fileId, {
      status: 'Converting to tileset',
      progress: 50,
    });
    await convertLasToTileset(file.path, tempDir, epsgCode);

    processingStatus.set(fileId, { status: 'Storing tileset', progress: 75 });
    await storeTilesetInGridFS(tempDir, fileId);

    processingStatus.set(fileId, { status: 'Saving metadata', progress: 90 });
    await storeFileMetadata(file, fileId);

    processingStatus.set(fileId, { status: 'Completed', progress: 100 });
  } catch (error) {
    console.error(error);
    processingStatus.set(fileId, { status: 'Error', progress: -1 });
  } finally {
    // Clean up temporary files
    await fs.promises.rm(path.join(__dirname, 'temp', fileId), {
      recursive: true,
      force: true,
    });
    await fs.promises.rm(file.path, { recursive: true, force: true });
  }
}

// async function translateFileToLasWithEpsg(
//   inputFilePath: string,
//   epsgCode: number
// ) {
//   try {
//     const dir = path.dirname(inputFilePath);
//     const originalFilename = path.parse(inputFilePath).name;
//     const lasFileName = `${originalFilename}.las`;
//     const lasFilePath = path.join(dir, lasFileName);

//     const args = [
//       'translate',
//       inputFilePath,
//       lasFilePath,
//       'reprojection',
//       `--filters.reprojection.out_srs=EPSG:${epsgCode}`,
//       '--overwrite',
//     ];

//     await new Promise<void>((resolve, reject) => {
//       const pdalProcess = spawn('pdal', args);

//       pdalProcess.stdout.on('data', (data) => {
//         console.log(`PDAL stdout: ${data}`);
//       });

//       pdalProcess.stderr.on('data', (data) => {
//         console.error(`PDAL stderr: ${data}`);
//       });

//       pdalProcess.on('close', (code) => {
//         if (code === 0) {
//           fs.unlink(inputFilePath, (err) => {
//             if (err) console.error(`Error deleting file: ${err}`);
//           });
//           console.log(
//             `LAS file successfully translated and saved as: ${lasFilePath}`
//           );
//           resolve();
//         } else {
//           reject(new Error(`PDAL process exited with code ${code}`));
//         }
//       });
//     });

//     return lasFilePath;
//   } catch (error) {
//     console.error(
//       `Error executing PDAL translate: ${(error as Error).message}`
//     );
//     throw error;
//   }
// }

// Function to convert LAS/LAZ file to 3D tileset using GoCesiumTiler
async function convertLasToTileset(
  filePath: string,
  outputDir: string,
  epsgCode: number
) {
  const args = [
    'file',
    '-o',
    outputDir,
    '-epsg',
    epsgCode.toString(),
    filePath,
  ];

  try {
    await new Promise<void>((resolve, reject) => {
      const tilerProcess = spawn('gocesiumtiler', args);

      tilerProcess.stdout.on('data', (data) => {
        console.log(`GoCesiumTiler stdout: ${data}`);
      });

      tilerProcess.stderr.on('data', (data) => {
        console.error(`GoCesiumTiler stderr: ${data}`);
      });

      tilerProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`GoCesiumTiler process exited with code ${code}`));
        }
      });
    });
  } catch (error) {
    console.error('Error converting LAS/LAZ file:', error);
    throw error;
  }
}

// Function to store tileset in MongoDB using GridFS
async function storeTilesetInGridFS(tilesetDir: string, fileId: string) {
  console.log('🟡Storing tileset in GridFS', tilesetDir, fileId);
  async function uploadFiles(dir: string, baseDir: string) {
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
          await uploadFiles(filePath, baseDir);
        } else if (file.endsWith('.json') || file.endsWith('.pnts')) {
          if (!gfs) {
            throw new Error('🔴 GridFS bucket not initialized');
          }

          const relativePath = path.relative(baseDir, filePath);
          const uploadOptions = {
            chunkSizeBytes: 255 * 1024,
            metadata: { fileId, type: '3dtiles' },
          };
          const uploadStream = gfs.openUploadStream(
            relativePath.replace(/\\/g, '/'),
            uploadOptions
          );
          const readStream = fs.createReadStream(filePath);
          await new Promise<void>((resolve, reject) => {
            readStream
              .pipe(uploadStream)
              .on('error', reject)
              .on('finish', resolve);
          });

          console.log(`Uploaded ${relativePath} to GridFS`);
        }
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      throw error;
    }
  }

  try {
    await uploadFiles(tilesetDir, `temp/${fileId}`);
  } catch (error) {
    console.error('Error uploading files:', error);
    throw error;
  }
}

// Function to store file metadata in MongoDB
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function storeFileMetadata(file: any, fileId: string) {
  console.log('Storing file metadata in MongoDB', fileId);
  const fileMetadata = new File_v2({
    fileId,
    fileName: file.originalname,
    status: 'Ready',
  });
  await fileMetadata.save();
}

// Endpoint to upload LAS/LAZ file and convert it to 3D tileset
app.post(
  '/upload',
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const file = req.file;
      const fileId = uuid();

      if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Respond immediately to the client with the fileId
      res.json({ message: 'File upload initiated', fileId });

      // Process the file asynchronously
      processFile(file, fileId);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error initiating file upload' });
    }
  }
);

// Endpoint to retrieve all files metadata
app.get('/files', async (req: Request, res: Response) => {
  try {
    const files = await File_v2.find().select(
      'fileId fileName status createdAt'
    );
    res.json(files);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error retrieving files metadata' });
  }
});

// Endpoint to retrieve tileset data
app.get('/tileset/:fileId/*', async (req: Request, res: Response) => {
  console.log(`Received request for: ${req.originalUrl}`);
  try {
    if (!gfs) {
      throw new Error('GridFS bucket not initialized');
    }
    const fileId = req.params.fileId;
    const filepath = req.params[0];

    console.log('Fetching Tileset:', fileId, filepath);

    const count = await gfs.find({}).count();
    console.log(count);

    if (count === 0) {
      throw new Error('No files found in GridFS');
    }

    // if (filepath.endsWith('.json')) {
    //   const file = await gfs
    //     .find({ 'metadata.fileId': fileId, filename: filepath })
    //     .toArray();

    //   if (file.length === 0) {
    //     throw new Error('File not found in GridFS');
    //   }

    //   // Read the tileset.json file from GridFS
    //   const readstream = gfs.openDownloadStreamByName(filepath);
    //   let tilesetData = '';

    //   readstream.on('data', (chunk) => {
    //     tilesetData += chunk;
    //   });

    //   readstream.on('end', () => {
    //     // Parse the tileset.json
    //     let tilesetJson;
    //     try {
    //       tilesetJson = JSON.parse(tilesetData);
    //     } catch {
    //       return res
    //         .status(500)
    //         .json({ message: 'Error parsing tileset.json' });
    //     }

    //     // Recursively update URIs in the tileset
    //     function updateUris(node: { children?: any; content?: any }) {
    //       if (node.content && node.content.uri) {
    //         node.content.uri = `/tileset/${fileId}/${node.content.uri}`;
    //       }
    //       if (node.children) {
    //         node.children.forEach(updateUris);
    //       }
    //     }
    //     updateUris(tilesetJson.root);

    //     console.log(tilesetJson);

    //     // Send the modified tileset.json back to the client
    //     res.setHeader('Content-Type', 'application/json');
    //     res.send(JSON.stringify(tilesetJson));
    //   });

    //   readstream.on('error', (err) => {
    //     console.error(err);
    //     return res.status(500).json({ message: 'Error reading tileset.json' });
    //   });
    // } else {
    // For other files (.pnts or nested tileset.json)
    const file = await gfs
      .find({
        'metadata.fileId': fileId,
        filename: `${filepath}`,
      })
      .toArray();

    if (file.length === 0) {
      throw new Error('File not found in GridFS');
    }

    // Serve the file from GridFS (e.g., .pnts files)
    res.setHeader('Content-Type', 'application/octet-stream');
    gfs.openDownloadStreamByName(`${filepath}`).pipe(res);
    // }
    // }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error retrieving file' });
  }
});

app.get('/upload/status/:fileId', (req: Request, res: Response) => {
  const { fileId } = req.params;
  const status = processingStatus.get(fileId);
  if (status) {
    res.json(status);
  } else {
    res.status(404).json({ message: 'File not found' });
  }
});

app.get('/cesium-viewer', (req, res) => {
  const { fileId } = req.query;
  console.log('Cesium Viewer', fileId);

  const viewerHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cesium Viewer</title>
      <script src="https://cesium.com/downloads/cesiumjs/releases/1.122/Build/Cesium/Cesium.js"></script>
      <link href="https://cesium.com/downloads/cesiumjs/releases/1.122/Build/Cesium/Widgets/widgets.css" rel="stylesheet">
      <style>
        html, body, #cesiumContainer { width: 100%; height: 100%; margin: 0; overflow: hidden; }
        canvas { display: block; } /* Prevent scrollbar */
      </style>
    </head>
    <body>
      <div id="cesiumContainer"></div>
      <script type="module">
	    // document.addEventListener("DOMContentLoaded", async function() {
        console.log('Cesium Viewer Loaded');
        Cesium.debug = true
        const viewer = new Cesium.Viewer('cesiumContainer', {
          terrainProvider: await Cesium.createWorldTerrainAsync(),
        });
        Cesium.Resource.prototype.fetch = (function(originalFetch) {
          return function(...args) {
            console.log('Cesium is requesting:', this.url);
            return originalFetch.apply(this, args);
          };
        })(Cesium.Resource.prototype.fetch);

        try {
          const tilesetUrl = \`http://localhost:5000/tileset/${fileId}/tileset.json\`;
          console.log('Tileset URL:', tilesetUrl);
          const tileset = viewer.scene.primitives.add(await Cesium.Cesium3DTileset.fromUrl(tilesetUrl));
          
          // Fly the camera to the tileset's bounding sphere
          viewer.zoomTo(tileset).then(function() {
            // Once the camera has moved, set up event listeners

            // Event listener for all tiles loaded
            tileset.allTilesLoaded.addEventListener(function() {
              console.log('Tileset loaded successfully');
              viewer.scene.globe.depthTestAgainstTerrain = true;
              viewer.scene.globe.maximumScreenSpaceError = 0.5;
              viewer.scene.debugShowFramesPerSecond = true;
            },
            function (error) {
              console.error('Tileset failed to load:', error);
            });

            // Event listener for individual tile load
            tileset.tileLoad.addEventListener(function(tile) {
              console.log('Tile loaded:', tile);
            });

            // Event listener for tile load failures
            tileset.tileFailed.addEventListener(function(error) {
              console.error('Tile failed to load:', error);
            });
          });
        } catch (error) {
          console.error('Error loading tileset 2:', error);
        }
	    // });
      </script>
    </body>
    </html>;
  `;

  res.send(viewerHtml);
});

// Connect to MongoDB
mongoose
  .connect('mongodb://localhost:27017/cesium_gis_app')
  .then(() => {
    console.log('MongoDB connected');

    // Create a GridFSBucket instance
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('MongoDB connection not established');
    }
    gfs = new mongoose.mongo.GridFSBucket(db, {
      bucketName: '3dtiles',
    });

    // Start the server after the bucket is initialized
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });
