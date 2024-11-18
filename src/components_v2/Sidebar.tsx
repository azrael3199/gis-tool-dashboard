import React from 'react';

interface FileItem {
  _id: string;
  fileId: string;
  fileName: string;
  status: 'Processing' | 'Ready' | 'Error';
}

interface SidebarProps {
  files: FileItem[];
  onView: (fileId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ files, onView }) => {
  return (
    <div className="w-64 bg-gray-100 p-4">
      <h2 className="text-xl font-semibold mb-4">Uploaded Files</h2>
      <ul>
        {files.map((file) => (
          <li key={file._id} className="mb-2 flex justify-between items-center">
            <span>{file.fileName}</span>
            {file.status === 'Ready' ? (
              <button
                onClick={() => onView(file.fileId)}
                className="bg-green-500 text-white px-2 py-1 rounded"
              >
                View
              </button>
            ) : (
              <span className="text-sm text-gray-500">{file.status}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
