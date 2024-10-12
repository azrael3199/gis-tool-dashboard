import { FileItem } from '../utils/types';
import api from './config';

const fetchUploadedFiles = async (): Promise<FileItem[]> => {
  try {
    const response = await api.get('/api/las/files');

    if (response.status !== 200) {
      throw new Error('Failed to fetch uploaded files');
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching uploaded files:', error);
    throw error;
  }
};

export default fetchUploadedFiles;
