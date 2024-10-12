import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  filename: String,
  uploadDate: { type: Date, default: Date.now },
});

const File = mongoose.model('File', fileSchema);
export default File;
