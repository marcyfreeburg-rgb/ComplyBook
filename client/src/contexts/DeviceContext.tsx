import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DeviceContextType {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  isStandalone: boolean; // PWA mode
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
}

const DeviceContext = createContext<DeviceContextType | null>(null);

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [deviceInfo, setDeviceInfo] = useState<DeviceContextType>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isTouchDevice: false,
        isStandalone: false,
        screenWidth: 1920,
        screenHeight: 1080,
        orientation: 'landscape',
      };
    }
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return {
      isMobile: width < MOBILE_BREAKPOINT,
      isTablet: width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
      isDesktop: width >= TABLET_BREAKPOINT,
      isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      isStandalone: window.matchMedia('(display-mode: standalone)').matches,
      screenWidth: width,
      screenHeight: height,
      orientation: width > height ? 'landscape' : 'portrait',
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setDeviceInfo({
        isMobile: width < MOBILE_BREAKPOINT,
        isTablet: width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
        isDesktop: width >= TABLET_BREAKPOINT,
        isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        isStandalone: window.matchMedia('(display-mode: standalone)').matches,
        screenWidth: width,
        screenHeight: height,
        orientation: width > height ? 'landscape' : 'portrait',
      });
    };

    // Listen for resize and orientation changes
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Initial check
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return (
    <DeviceContext.Provider value={deviceInfo}>
      {children}
    </DeviceContext.Provider>
  );
}

export function useDevice() {
  const context = useContext(DeviceContext);
  if (!context) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return context;
}

export { DeviceContext };
