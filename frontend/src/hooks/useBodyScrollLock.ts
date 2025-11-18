import { useEffect } from 'react';

export const useBodyScrollLock = (isLocked: boolean) => {
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body);
    const originalOverflow = originalStyle.overflow;
    const originalPosition = originalStyle.position;
    const originalWidth = originalStyle.width;
    const originalHeight = originalStyle.height;
    const originalTop = originalStyle.top;
    
    if (isLocked) {
      // Get current scroll position
      const scrollY = window.scrollY;
      
      // Lock body scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.top = `-${scrollY}px`;
      
      // Store scroll position for restoration
      document.body.dataset.scrollY = scrollY.toString();
    } else {
      // Restore original styles
      const scrollY = parseInt(document.body.dataset.scrollY || '0', 10);
      
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.width = originalWidth;
      document.body.style.height = originalHeight;
      document.body.style.top = originalTop;
      
      // Restore scroll position
      window.scrollTo(0, scrollY);
      
      // Clean up
      delete document.body.dataset.scrollY;
    }

    // Cleanup function to restore on unmount
    return () => {
      if (isLocked) {
        const scrollY = parseInt(document.body.dataset.scrollY || '0', 10);
        
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.width = originalWidth;
        document.body.style.height = originalHeight;
        document.body.style.top = originalTop;
        
        window.scrollTo(0, scrollY);
        delete document.body.dataset.scrollY;
      }
    };
  }, [isLocked]);
};