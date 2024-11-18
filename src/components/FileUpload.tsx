import uploadLasFile from '../lib/apis/uploadLasFile';
import { AxiosProgressEvent } from 'axios';
import React, { useState } from 'react';

const FileUpload = () => {
  const [uploadPercentage, setUploadPercentage] = useState(0);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setUploadPercentage(0);
    const file = event.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        await uploadLasFile(file, (progressEvent: AxiosProgressEvent) => {
          if (!progressEvent.total) return;
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadPercentage(percentCompleted);
        });
        // Optionally, you can refresh the list of uploaded files here
        console.log('File uploaded and processed successfully.');
      } catch (error) {
        console.error('Error uploading and processing file:', error);
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <div>
      <h2>Upload LAS File</h2>
      <input type="file" accept=".las,.laz" onChange={handleFileUpload} />
      {uploading && (
        <div>
          <p>Uploading: {uploadPercentage}%</p>
          <progress value={uploadPercentage} max="100" />
        </div>
      )}
    </div>
  );
};

export default FileUpload;
