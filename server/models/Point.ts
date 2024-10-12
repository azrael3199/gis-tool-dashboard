import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema({
  fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },
  x: Number,
  y: Number,
  z: Number,
  color: [Number, Number, Number], // RGB array
  // TODO: Add intensity
});

// Index for efficient spatial queries
pointSchema.index({ fileId: 1, x: 1, y: 1, z: 1 });

const Point = mongoose.model('Point', pointSchema);
export default Point;
