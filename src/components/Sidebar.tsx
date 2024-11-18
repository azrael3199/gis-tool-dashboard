import React from 'react';
import FileList from './FileList';
import FileUpload from './FileUpload';

interface ISidebar {
  onViewFile: (fileId: string) => void;
}

const Sidebar: React.FC<ISidebar> = ({ onViewFile }) => {
  return (
    <div className="flex flex-col gap-3 w-1/5 h-full p-4 border-r-2">
      <FileUpload />
      <FileList onViewFile={onViewFile} />
    </div>
  );
};

export default Sidebar;
