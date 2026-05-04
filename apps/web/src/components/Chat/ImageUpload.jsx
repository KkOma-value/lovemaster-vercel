import React from 'react';
import { X } from 'lucide-react';

export default function ImageUpload({
  previewUrl,
  onClear,
  isCompressing,
  isUploading,
  progress,
  fileName,
  originalSize,
  compressedSize,
}) {
  const parseSize = (size) => {
    if (!size) return '';
    return (size / 1024 / 1024).toFixed(2) + 'MB';
  };

  if (!previewUrl) return null;

  return (
    <div className="absolute bottom-[100%] left-0 right-0 z-10 flex items-center gap-3 px-3.5 py-2.5 bg-[rgba(255,253,249,0.88)] border border-[rgba(196,123,90,0.12)] border-b-0 rounded-[14px_14px_0_0] -mb-px">
      <img src={previewUrl} alt="Preview" className="w-11 h-11 sm:w-14 sm:h-14 rounded-[10px] object-cover border border-[rgba(196,123,90,0.15)]" />
      <div className="flex-1">
        <div className="text-[13px] font-medium text-[#2D1B0E]">
          {fileName || '聊天截图'}
          {isCompressing && `（压缩中 ${progress.toFixed(0)}%）`}
        </div>
        <div className="text-[12px] text-[#7A5C47] mt-[2px]">
          {originalSize && `${parseSize(originalSize)} `}
          {compressedSize && (
            <>
              &rarr; <span className="text-[#3A8B7F]">{parseSize(compressedSize)}</span> &nbsp;&#x2713; 已压缩
            </>
          )}
        </div>
        {(isCompressing || isUploading) && (
          <div className="h-[3px] bg-[rgba(196,123,90,0.1)] rounded-sm mt-1.5 overflow-hidden">
            <div
              className="h-full rounded-sm transition-[width] duration-200 ease-in-out"
              style={{ width: `${progress}%`, backgroundColor: '#C47B5A' }}
            />
          </div>
        )}
      </div>
      {!isCompressing && !isUploading && (
        <button type="button" className="bg-transparent border-none text-[#B09080] hover:text-[#DC2626] hover:bg-[rgba(220,38,38,0.08)] cursor-pointer p-1 rounded-md text-[18px] flex items-center justify-center transition-colors" onClick={onClear} title="移除截图">
          <X size={18} />
        </button>
      )}
    </div>
  );
}
