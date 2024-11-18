import { useState } from 'react';
import PointCloudViewer from './components/PointCloudViewer';
import Sidebar from './components/Sidebar';

function App() {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const handleViewFile = (fileId: string) => {
    setSelectedFileId(fileId);
  };

  return (
    <div className="h-screen flex">
      <Sidebar onViewFile={handleViewFile} />
      {selectedFileId && <PointCloudViewer fileId={selectedFileId} />}
    </div>
  );
}

export default App;
