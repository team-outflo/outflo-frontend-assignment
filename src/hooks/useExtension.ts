import { useEffect } from 'react';

export const useExtension = () => {
  useEffect(() => {
    // Basic stub for extension message handling if needed
    const handleMessage = (event: MessageEvent) => {
      // Stub logic
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return {
    isExtensionInstalled: false,
    sendMessage: () => {},
  };
};
