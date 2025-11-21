import React from 'react';

const IconWrapper: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
  <svg
    className={className || "w-6 h-6"}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

export const StethoscopeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M11 3a5.5 5.5 0 014.12 9.13l-2.62.88a1.5 1.5 0 00-.88 1.5v.69a1.5 1.5 0 001.5 1.5h.31a1.5 1.5 0 001.5-1.5v-.19a.5.5 0 01.5-.5h.5a.5.5 0 01.5.5v.19a1.5 1.5 0 001.5 1.5h.31a1.5 1.5 0 001.5-1.5v-.69a1.5 1.5 0 00-.88-1.5l-2.62-.88A5.5 5.5 0 1111 3z"></path>
    <path d="M12.5 15.5a.5.5 0 00-1 0v6a.5.5 0 001 0v-6z"></path>
  </IconWrapper>
);

export const HeartIcon: React.FC<{ className?: string }> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path>
  </IconWrapper>
);

export const LungIcon: React.FC<{ className?: string }> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M6 12c0-5 2-8 6-8s6 3 6 8c0 3-1 5-3 6.5s-4 1.5-4 1.5-2 0-4-1.5S6 15 6 12z"></path>
    <path d="M6 12c0 6 2 9 6 9s6-3 6-9"></path>
    <path d="M12 12v9"></path>
  </IconWrapper>
);

export const SkinIcon: React.FC<{ className?: string }> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M20.25 10.321c-.385-.015-.747-.139-1.046-.356a2 2 0 00-2.828 2.828c.217.299.341.661.356 1.046 2.5 6.071-6 8-6 8s-8.5-1.929-6-8c.015-.385.139-.747.356-1.046a2 2 0 10-2.828-2.828c-.217-.299-.341-.661-.356-1.046-2.5-6.071 6-8 6-8s8.5 1.929 6 8z"></path>
    <path d="M12 12.5a.5.5 0 100-1 .5.5 0 000 1z"></path>
  </IconWrapper>
);

export const ScaleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M16 16.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
    <path d="M12 4v10m0 0l3 3m-3-3l-3 3"></path>
    <path d="M3 11h18"></path>
  </IconWrapper>
);

export const MouthIcon: React.FC<{ className?: string }> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M4 12c0 4.418 3.582 8 8 8s8-3.582 8-8-3.582-4-8-4-8 .5-8 4z"></path>
    <path d="M5 12h14"></path>
    <path d="M6 10c.5 1 1.5 1.5 3 1.5s2.5-.5 3-1.5"></path>
    <path d="M12 15.5c-1.5 0-2.5-.5-3-1.5"></path>
  </IconWrapper>
);

export const MapPinIcon: React.FC<{ className?: string }> = ({ className }) => (
    <IconWrapper className={className}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"></path>
      <circle cx="12" cy="10" r="3"></circle>
    </IconWrapper>
  );
  
export const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M19 9l-7 7-7-7"></path>
  </IconWrapper>
);

export const XIcon: React.FC<{ className?: string }> = ({ className }) => (
    <IconWrapper className={className}>
        <path d="M6 18L18 6M6 6l12 12"></path>
    </IconWrapper>
  );

export const NhsoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    className={className || "w-10 h-10"}
    viewBox="0 0 40 40" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#2563EB"/>
    <path d="M20 13V27M13 20H27" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M9 18l6-6-6-6"></path>
  </IconWrapper>
);

export const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </IconWrapper>
);

export const QrCodeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M12 4v1m6 11h2v-1c0-.55-.45-1-1-1h-1v2zm-2.66-1.21L14 12.41l.71.71 1.33-1.33-.71-.71-.71.71-1.28-1.29zm2.12-2.12l-.71-.71L14 11.59l.71.71 1.33-1.33-.71-.71-.71.71zM3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm13-2h-2v2h2v-2zm-2 4h2v2h-2v-2zm2-4h2v2h-2v-2zm-4 2h2v2h-2v-2z"/>
  </IconWrapper>
);

export const BloodDropIcon: React.FC<{ className?: string }> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M12 22a7 7 0 007-7c0-3.87-7-13-7-13s-7 9.13-7 13a7 7 0 007 7z"></path>
  </IconWrapper>
);

export const PressureIcon: React.FC<{ className?: string }> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path>
    <path d="M7 13h2l2-3 2 5 2-2h2"></path>
  </IconWrapper>
);

export const ShareIcon: React.FC<{ className?: string }> = ({ className }) => (
    <IconWrapper className={className}>
        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"></path>
        <polyline points="16 6 12 2 8 6"></polyline>
        <line x1="12" y1="2" x2="12" y2="15"></line>
    </IconWrapper>
  );

export const FacebookIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    className={className || "w-6 h-6"}
    viewBox="0 0 24 24" 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg">
    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v7.024C18.343 21.128 22 16.991 22 12z" />
  </svg>
);

export const LineIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    className={className || "w-6 h-6"}
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg">
    <path d="M20.25 10.321c-.385-.015-.747-.139-1.046-.356a2 2 0 00-2.828 2.828c.217.299.341.661.356 1.046 2.5 6.071-6 8-6 8s-8.5-1.929-6-8c.015-.385.139-.747.356-1.046a2 2 0 10-2.828-2.828c-.217-.299-.341-.661-.356-1.046-2.5-6.071 6-8 6-8s8.5 1.929 6 8z" fill="#00C300"/>
    <path d="M9.5 12.5H11v-2h-3v.5c0 .6.4 1 1 1h.5v.5zM15 10.5h-3v2h3v-.5c0-.6-.4-1-1-1h-1v-.5h1z" fill="white"/>
    <path d="M12.5 13.5c-1 0-1.5.5-1.5 1v1h3v-1c0-.5-.5-1-1.5-1z" fill="white"/>
  </svg>
);

export const LinkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"></path>
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.72-1.71"></path>
  </IconWrapper>
);

export const SpeakerWaveIcon: React.FC<{ className?: string }> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path>
  </IconWrapper>
);

export const VolumeOffIcon: React.FC<{ className?: string }> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path>
    <path d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"></path>
  </IconWrapper>
);

export const ExclamationIcon: React.FC<{ className?: string }> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
  </IconWrapper>
);

export const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
  </IconWrapper>
);

export const MicIcon: React.FC<{ className?: string }> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
  </IconWrapper>
);

export const StopIcon: React.FC<{ className?: string }> = ({ className }) => (
  <IconWrapper className={className}>
    <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
  </IconWrapper>
);

export const HistoryIcon: React.FC<{ className?: string }> = ({ className }) => (
    <IconWrapper className={className}>
      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </IconWrapper>
);