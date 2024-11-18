import mongoose, { Schema, Document } from 'mongoose';

export interface IFile extends Document {
  fileId: string;
  fileName: string;
  status: 'Processing' | 'Ready' | 'Error';
  createdAt: Date;
}

const FileSchema: Schema = new Schema({
  fileId: { type: String, required: true },
  fileName: { type: String, required: true },
  status: {
    type: String,
    enum: ['Processing', 'Ready', 'Error'],
    default: 'Processing',
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IFile>('FileV2', FileSchema);
