import fetchUploadedFiles from '../lib/apis/fetchUploadedFiles';
import { FileItem } from '../lib/utils/types';
import React, { useEffect, useState } from 'react';

interface FileListProps {
  onViewFile: (fileId: string) => void;
}

const FileList: React.FC<FileListProps> = ({ onViewFile }) => {
  const [files, setFiles] = useState<FileItem[]>([]);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const data = await fetchUploadedFiles();
        setFiles(data);
      } catch (error) {
        console.error('Error fetching files:', error);
      }
    };

    fetchFiles();
  }, []);

  return (
    <div className="flex flex-col gap-2 py-2">
      <h2>Available Files</h2>
      <ul>
        {files.map((file) => (
          <li key={file._id} className="flex gap-2">
            {file.filename} (Uploaded on:{' '}
            {new Date(file.uploadDate).toLocaleString()})
            <button onClick={() => onViewFile(file._id)}>View</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FileList;
