import { LASLoader } from '@loaders.gl/las';
import { loadInBatches } from '@loaders.gl/core';
import File from '../models/File';
import { processData } from '../utils/transforms';
import Point from '../models/Point';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const processLasFile = async (file: any) => {
  const batches = await loadInBatches(file.data, LASLoader);
  const fileRecord = new File({ name: file.originalname });
  await fileRecord.save();

  for await (const batch of batches) {
    // @ts-expect-error No type definition for batch
    const { attributes } = batch.data;

    const positions = new Float32Array(attributes.POSITION.value);
    const colors = new Uint8Array(attributes.COLOR_0.value);
    const intensities = new Float32Array(attributes.intensity?.value || []);

    // Process data (convert positions, colors, etc.)
    const { points, pointColors } = processData({
      positions,
      colors,
      intensities,
    });

    // Prepare documents to insert into MongoDB
    const pointDocs = points.map((point, index) => ({
      fileId: fileRecord._id,
      x: point[0],
      y: point[1],
      z: point[2],
      color: pointColors ? pointColors[index] : [1, 1, 1],
    }));

    // Insert documents into MongoDB in batches to prevent overload
    // Assuming a batch size of 10000
    const batchSize = Number(process.env.BATCH_SIZE) || 10000;
    for (let i = 0; i < pointDocs.length; i += batchSize) {
      const batch = pointDocs.slice(i, i + batchSize);
      await Point.insertMany(batch);
    }
  }

  await fileRecord.save();
};
