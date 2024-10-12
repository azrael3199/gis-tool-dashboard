import React from 'react';
import FileList from './FileList';

interface ISidebar {
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onViewFile: (fileId: string) => void;
}

const Sidebar: React.FC<ISidebar> = ({ onFileUpload, onViewFile }) => {
  return (
    <div className="flex flex-col gap-3 w-1/5 h-full p-4 border-r-2">
      <input type="file" accept=".las,.laz" onChange={onFileUpload} />
      <FileList onViewFile={onViewFile} />
    </div>
  );
};

export default Sidebar;
