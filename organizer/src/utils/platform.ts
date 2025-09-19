/**
 * Platform detection utilities for adaptive UI behavior
 */

export interface PlatformInfo {
  os: 'macos' | 'windows' | 'linux' | 'ios' | 'android' | 'unknown';
  isMobile: boolean;
  isTouch: boolean;
  hasHover: boolean;
  prefersReducedMotion: boolean;
  prefersHighContrast: boolean;
  supportsBackdropFilter: boolean;
}

/**
 * Detect the user's operating system
 */
export function detectOS(): PlatformInfo['os'] {
  if (typeof window === 'undefined') return 'unknown';
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform?.toLowerCase() || '';
  
  // iOS detection (including iPad)
  if (/ipad|iphone|ipod/.test(userAgent) || 
      (platform === 'macintel' && window.navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  
  // Android detection
  if (/android/.test(userAgent)) {
    return 'android';
  }
  
  // macOS detection
  if (/mac/.test(platform) || /darwin/.test(userAgent)) {
    return 'macos';
  }
  
  // Windows detection
  if (/win/.test(platform) || /windows/.test(userAgent)) {
    return 'windows';
  }
  
  // Linux detection
  if (/linux/.test(platform) || /x11/.test(userAgent)) {
    return 'linux';
  }
  
  return 'unknown';
}

/**
 * Check if device supports touch input
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    'ontouchstart' in window ||
    window.navigator.maxTouchPoints > 0 ||
    // @ts-ignore - Legacy IE support
    window.navigator.msMaxTouchPoints > 0
  );
}

/**
 * Check if device supports hover interactions
 */
export function supportsHover(): boolean {
  if (typeof window === 'undefined') return true;
  
  return window.matchMedia('(hover: hover)').matches;
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if user prefers high contrast
 */
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  
  return window.matchMedia('(prefers-contrast: high)').matches;
}

/**
 * Check if browser supports backdrop-filter
 */
export function supportsBackdropFilter(): boolean {
  if (typeof window === 'undefined') return false;
  
  return CSS.supports('backdrop-filter', 'blur(1px)') || 
         CSS.supports('-webkit-backdrop-filter', 'blur(1px)');
}

/**
 * Get comprehensive platform information
 */
export function getPlatformInfo(): PlatformInfo {
  const os = detectOS();
  const isTouch = isTouchDevice();
  
  return {
    os,
    isMobile: os === 'ios' || os === 'android',
    isTouch,
    hasHover: supportsHover(),
    prefersReducedMotion: prefersReducedMotion(),
    prefersHighContrast: prefersHighContrast(),
    supportsBackdropFilter: supportsBackdropFilter(),
  };
}

/**
 * React hook for platform information with reactive updates
 */
export function usePlatform(): PlatformInfo {
  if (typeof window === 'undefined') {
    return {
      os: 'unknown',
      isMobile: false,
      isTouch: false,
      hasHover: true,
      prefersReducedMotion: false,
      prefersHighContrast: false,
      supportsBackdropFilter: false,
    };
  }

  const [platformInfo, setPlatformInfo] = React.useState<PlatformInfo>(getPlatformInfo);

  React.useEffect(() => {
    const updatePlatformInfo = () => setPlatformInfo(getPlatformInfo());
    
    // Listen for media query changes
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    const hoverQuery = window.matchMedia('(hover: hover)');
    
    reducedMotionQuery.addEventListener('change', updatePlatformInfo);
    highContrastQuery.addEventListener('change', updatePlatformInfo);
    hoverQuery.addEventListener('change', updatePlatformInfo);
    
    return () => {
      reducedMotionQuery.removeEventListener('change', updatePlatformInfo);
      highContrastQuery.removeEventListener('change', updatePlatformInfo);
      hoverQuery.removeEventListener('change', updatePlatformInfo);
    };
  }, []);

  return platformInfo;
}

/**
 * Get platform-specific CSS classes
 */
export function getPlatformClasses(platform?: PlatformInfo): string {
  const info = platform || getPlatformInfo();
  
  const classes = [
    `platform-${info.os}`,
    info.isMobile ? 'platform-mobile' : 'platform-desktop',
    info.isTouch ? 'platform-touch' : 'platform-no-touch',
    info.hasHover ? 'platform-hover' : 'platform-no-hover',
    info.prefersReducedMotion ? 'platform-reduced-motion' : '',
    info.prefersHighContrast ? 'platform-high-contrast' : '',
    info.supportsBackdropFilter ? 'platform-backdrop-filter' : '',
  ];
  
  return classes.filter(Boolean).join(' ');
}

// Import React for the hook
import React from 'react';