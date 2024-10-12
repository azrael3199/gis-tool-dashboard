import { useState } from 'react';
import PointCloudViewer from './components/PointCloudViewer';
import Sidebar from './components/Sidebar';
import uploadLasFile from './lib/apis/uploadLasFile';

function App() {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        await uploadLasFile(file);
        // Optionally, you can refresh the list of uploaded files here
        console.log('File uploaded and processed successfully.');
      } catch (error) {
        console.error('Error uploading and processing file:', error);
      }
    }
  };

  const handleViewFile = (fileId: string) => {
    setSelectedFileId(fileId);
  };

  return (
    <div className="h-screen flex">
      <Sidebar onFileUpload={handleFileUpload} onViewFile={handleViewFile} />
      {selectedFileId && <PointCloudViewer fileId={selectedFileId} />}
    </div>
  );
}

export default App;
