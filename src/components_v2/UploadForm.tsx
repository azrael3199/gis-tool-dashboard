import React, { useState } from 'react';
import axios from 'axios';

interface UploadFormProps {
  onUpload: () => void;
}

const UploadForm: React.FC<UploadFormProps> = ({ onUpload }) => {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  // const [processingProgress, setProcessingProgress] = useState<number>(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setProgress(percentCompleted); // Set the upload progress
          }
        },
      });

      // Reset the file input and upload progress
      setFile(null);
      setProgress(0);

      const { fileId } = response.data;
      if (fileId) {
        // Start polling for processing progress
        pollProcessingStatus(fileId);
      }
      onUpload();
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const pollProcessingStatus = (fileId: string) => {
    const intervalId = setInterval(async () => {
      try {
        const response = await axios.get(`/upload/status/${fileId}`);
        const { status, progress } = response.data;
        setProcessingStatus(status);
        setProgress(progress);

        if (progress === 100 || progress === -1) {
          // Processing completed or encountered an error
          clearInterval(intervalId);
          if (progress === 100) {
            // Trigger any actions upon successful processing
            onUpload(); // For example, refresh the file list
          } else {
            console.error('Processing error:', status);
          }
        }
      } catch (error) {
        console.error('Error fetching processing status:', error);
        clearInterval(intervalId);
      }
    }, 5000); // Poll every 5 seconds
  };

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <div className="flex items-center">
        <input
          type="file"
          accept=".las"
          onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
          className="mr-2"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Upload
        </button>
      </div>
      {processingStatus && (
        <div className="mt-4">
          <p>{processingStatus}</p>
          {progress >= 0 && (
            <div className="w-full bg-gray-200 rounded mt-2">
              <div
                className="bg-green-500 text-xs leading-none py-1 text-center text-white"
                style={{ width: `${progress}%` }}
              >
                {progress}%
              </div>
            </div>
          )}
        </div>
      )}
    </form>
  );
};

export default UploadForm;
