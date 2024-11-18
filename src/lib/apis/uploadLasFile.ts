import { AxiosProgressEvent } from 'axios';
import api from './config';

const uploadLasFile = async (
  lasFile: File,
  onUploadProgress: (progressEvent: AxiosProgressEvent) => void = () => {}
): Promise<void> => {
  const formData = new FormData();
  formData.append('file', lasFile);

  try {
    const response = await api.post('/api/las/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        onUploadProgress(progressEvent);
      },
    });

    if (response.status !== 200) {
      throw new Error('Failed to upload and process the LAS file.');
    }

    console.log('File processed and stored successfully.');
  } catch (error) {
    console.error('Error uploading and processing file:', error);
    throw error;
  }
};

export default uploadLasFile;
