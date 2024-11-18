import React, { useState, useEffect } from 'react';
import UploadForm from './components_v2/UploadForm';
import Sidebar from './components_v2/Sidebar';
import axios from 'axios';
import CesiumStreamViewer from './components_v2/CesiumStreamViewer';

interface FileItem {
  _id: string;
  originalName: string;
  fileId: string;
  fileName: string;
  status: 'Processing' | 'Ready' | 'Error';
}

const App: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const fetchFiles = async () => {
    try {
      const response = await axios.get('http://localhost:5000/files');
      setFiles(response.data);
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleUpload = () => {
    fetchFiles();
  };

  const handleView = (fileId: string) => {
    setSelectedFile(fileId);
  };

  return (
    <div className="flex h-screen">
      <Sidebar files={files} onView={handleView} />
      <div className="flex-1 flex flex-col">
        <UploadForm onUpload={handleUpload} />
        <div className="flex-1">
          {selectedFile && <CesiumStreamViewer selectedFileId={selectedFile} />}
        </div>
      </div>
    </div>
  );
};

export default App;
