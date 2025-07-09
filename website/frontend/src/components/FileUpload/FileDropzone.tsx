import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react';

interface FileWithPreview extends File {
  preview?: string;
  progress?: number;
  status?: 'uploading' | 'completed' | 'error';
  error?: string;
}

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  onFileRemove: (index: number) => void;
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
}

const SUPPORTED_FILE_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'application/rtf': ['.rtf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
};

const DEFAULT_MAX_SIZE = 100 * 1024 * 1024; // 100MB
const DEFAULT_MAX_FILES = 10;

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFilesSelected,
  onFileRemove,
  acceptedFileTypes = Object.keys(SUPPORTED_FILE_TYPES),
  maxFileSize = DEFAULT_MAX_SIZE,
  maxFiles = DEFAULT_MAX_FILES,
  disabled = false,
  className = '',
}) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = acceptedFiles.map((file) => 
        Object.assign(file, {
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
          status: 'uploading' as const,
          progress: 0,
        })
      );

      setFiles((prev) => [...prev, ...newFiles]);
      onFilesSelected(acceptedFiles);
    },
    [onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject, fileRejections } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce((acc, type) => {
      acc[type] = SUPPORTED_FILE_TYPES[type] || [];
      return acc;
    }, {} as Record<string, string[]>),
    maxSize: maxFileSize,
    maxFiles: maxFiles - files.length,
    disabled,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const file = prev[index];
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      const newFiles = prev.filter((_, i) => i !== index);
      onFileRemove(index);
      return newFiles;
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') return '📄';
    if (file.type.includes('word')) return '📝';
    if (file.type === 'text/plain') return '📄';
    if (file.type.startsWith('image/')) return '🖼️';
    return '📄';
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive && !isDragReject ? 'border-blue-400 bg-blue-50' : ''}
          ${isDragReject ? 'border-red-400 bg-red-50' : ''}
          ${!isDragActive ? 'border-gray-300 hover:border-gray-400' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center space-y-4">
          <Upload 
            className={`w-12 h-12 ${
              isDragActive ? 'text-blue-500' : 'text-gray-400'
            }`} 
          />
          
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-700">
              {isDragActive 
                ? 'Drop the files here...' 
                : 'Drag & drop files here, or click to select'
              }
            </p>
            <p className="text-sm text-gray-500">
              Supports PDF, DOC, DOCX, TXT, RTF, JPG, PNG up to {formatFileSize(maxFileSize)}
            </p>
            <p className="text-xs text-gray-400">
              Maximum {maxFiles} files
            </p>
          </div>
        </div>
      </div>

      {/* File Rejections */}
      {fileRejections.length > 0 && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <h4 className="text-sm font-medium text-red-800">Some files were rejected:</h4>
          </div>
          <ul className="mt-2 text-sm text-red-700">
            {fileRejections.map(({ file, errors }, index) => (
              <li key={index}>
                <strong>{file.name}</strong>:
                <ul className="ml-4">
                  {errors.map((error) => (
                    <li key={error.code}>• {error.message}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Uploaded Files ({files.length})
          </h4>
          <div className="space-y-3">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg border"
              >
                <div className="text-2xl">{getFileIcon(file)}</div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <button
                      onClick={() => removeFile(index)}
                      className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                  
                  {/* Progress Bar */}
                  {file.status === 'uploading' && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress || 0}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Status */}
                  <div className="flex items-center mt-1">
                    {file.status === 'uploading' && (
                      <span className="text-xs text-blue-600">Uploading...</span>
                    )}
                    {file.status === 'completed' && (
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span className="text-xs text-green-600">Uploaded</span>
                      </div>
                    )}
                    {file.status === 'error' && (
                      <div className="flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3 text-red-500" />
                        <span className="text-xs text-red-600">
                          {file.error || 'Upload failed'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Preview for images */}
                {file.preview && (
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="w-12 h-12 object-cover rounded"
                    onLoad={() => URL.revokeObjectURL(file.preview!)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 