"use client";

import * as React from "react";
import { usePWA } from "@/hooks/use-pwa";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  WifiOff, 
  X, 
  Smartphone,
  Monitor,
  Apple,
  Share2,
  Chrome,
  MoreVertical,
  Menu,
  Home,
  Plus,
  CheckCircle
} from "lucide-react";

function getPlatform() {
  const ua = navigator.userAgent;
  
  // iOS detection
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  
  // Android detection
  if (/Android/.test(ua)) {
    return 'android';
  }
  
  // Windows
  if (/Windows/.test(ua)) {
    return 'windows';
  }
  
  // Mac
  if (/Macintosh|Mac OS X/.test(ua)) {
    return 'mac';
  }
  
  return 'other';
}

function getBrowser() {
  const ua = navigator.userAgent;
  
  if (/Chrome/.test(ua) && !/Edg/.test(ua)) return 'chrome';
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) return 'safari';
  if (/Edg/.test(ua)) return 'edge';
  if (/Firefox/.test(ua)) return 'firefox';
  
  return 'other';
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const { isInstallable, isInstalled, isOnline, installApp } = usePWA();
  const [showInstallPopup, setShowInstallPopup] = React.useState(false);
  const [showOfflineBanner, setShowOfflineBanner] = React.useState(false);
  const [platform, setPlatform] = React.useState<string>('other');
  const [browser, setBrowser] = React.useState<string>('other');
  const [installStep, setInstallStep] = React.useState(0);

  React.useEffect(() => {
    setPlatform(getPlatform());
    setBrowser(getBrowser());
  }, []);

  React.useEffect(() => {
    // Show install popup after 2 seconds if not installed
    const hasDismissed = localStorage.getItem('installDismissed');
    const dismissCount = parseInt(localStorage.getItem('installDismissCount') || '0');
    
    if (!isInstalled && dismissCount < 3) {
      const timer = setTimeout(() => {
        if (!hasDismissed || Date.now() - parseInt(hasDismissed) > 24 * 60 * 60 * 1000) {
          setShowInstallPopup(true);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isInstalled]);

  React.useEffect(() => {
    setShowOfflineBanner(!isOnline);
  }, [isOnline]);

  const handleDismiss = () => {
    setShowInstallPopup(false);
    localStorage.setItem('installDismissed', Date.now().toString());
    const count = parseInt(localStorage.getItem('installDismissCount') || '0');
    localStorage.setItem('installDismissCount', (count + 1).toString());
  };

  const handleInstall = async () => {
    if (isInstallable) {
      await installApp();
      setShowInstallPopup(false);
    } else {
      setInstallStep(1);
    }
  };

  const renderInstallInstructions = () => {
    if (platform === 'ios') {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-amber-400">
            <Apple className="h-5 w-5" />
            <span className="font-medium">iPhone / iPad</span>
          </div>
          <ol className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="bg-cyan-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">1</span>
              <span>Tap the <strong>Share</strong> button <Share2 className="inline h-4 w-4 mx-1" /> in Safari's toolbar</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-cyan-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">2</span>
              <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-cyan-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">3</span>
              <span>Tap <strong>"Add"</strong> in the top right</span>
            </li>
          </ol>
        </div>
      );
    }

    if (platform === 'android') {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-400">
            <Smartphone className="h-5 w-5" />
            <span className="font-medium">Android</span>
          </div>
          <ol className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="bg-cyan-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">1</span>
              <span>Tap the <strong>menu (⋮)</strong> <MoreVertical className="inline h-4 w-4 mx-1" /> in Chrome</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-cyan-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">2</span>
              <span>Tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-cyan-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">3</span>
              <span>Tap <strong>"Install"</strong> or <strong>"Add"</strong></span>
            </li>
          </ol>
        </div>
      );
    }

    if (platform === 'windows') {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-blue-400">
            <Monitor className="h-5 w-5" />
            <span className="font-medium">Windows</span>
          </div>
          <ol className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="bg-cyan-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">1</span>
              <span>Look for the <strong>⊕ Install</strong> icon in Chrome/Edge's address bar</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-cyan-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">2</span>
              <span>Click <strong>"Install MoneyWise"</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-cyan-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">3</span>
              <span>App will appear in Start Menu and Desktop</span>
            </li>
          </ol>
        </div>
      );
    }

    if (platform === 'mac') {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-gray-400">
            <Monitor className="h-5 w-5" />
            <span className="font-medium">Mac</span>
          </div>
          <ol className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="bg-cyan-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">1</span>
              <span>In Chrome, click the <strong>⋮ menu</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-cyan-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">2</span>
              <span>Click <strong>"Install MoneyWise..."</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-cyan-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">3</span>
              <span>App will be added to Applications folder</span>
            </li>
          </ol>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-400">To install MoneyWise:</p>
        <ol className="space-y-2 text-sm text-gray-300">
          <li className="flex items-start gap-2">
            <span className="bg-cyan-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">1</span>
            <span>Open this website in <strong>Chrome, Edge, or Safari</strong></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-cyan-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">2</span>
            <span>Look for "Add to Home Screen" or "Install" in the browser menu</span>
          </li>
        </ol>
      </div>
    );
  };

  return (
    <>
      {children}
      
      {/* Install Popup Modal */}
      {showInstallPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#1e293b] rounded-2xl max-w-md w-full shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                    <Home className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Install MoneyWise</h2>
                    <p className="text-sm text-gray-400">Get the app experience</p>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Benefits */}
            <div className="px-6 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                  <span>Works offline</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                  <span>Quick access</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                  <span>No browser bar</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                  <span>Push notifications</span>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="px-6 py-4 bg-[#0f172a]/50">
              {installStep === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-400">
                    Install MoneyWise on your {platform === 'ios' ? 'iPhone/iPad' : platform === 'android' ? 'Android device' : platform === 'windows' ? 'Windows PC' : platform === 'mac' ? 'Mac' : 'device'} for the best experience.
                  </p>
                  
                  {isInstallable ? (
                    <Button
                      onClick={handleInstall}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold py-3"
                    >
                      <Download className="h-5 w-5 mr-2" />
                      Install App
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setInstallStep(1)}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold py-3"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Show Me How
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {renderInstallInstructions()}
                  
                  <Button
                    onClick={() => setInstallStep(0)}
                    variant="outline"
                    className="w-full border-white/20 text-gray-300"
                  >
                    Back
                  </Button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 text-center">
              <button
                onClick={handleDismiss}
                className="text-sm text-gray-500 hover:text-gray-300"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Install Button (shows if not installed) */}
      {!isInstalled && !showInstallPopup && (
        <button
          onClick={() => setShowInstallPopup(true)}
          className="fixed bottom-24 right-4 md:bottom-8 z-40 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-3 rounded-full shadow-lg shadow-cyan-500/30 flex items-center gap-2 hover:scale-105 transition-transform"
        >
          <Download className="h-5 w-5" />
          <span className="font-medium hidden md:inline">Install App</span>
        </button>
      )}

      {/* Offline Banner */}
      {showOfflineBanner && (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white px-4 py-2 z-50 flex items-center justify-center gap-2 text-sm">
          <WifiOff className="h-4 w-4" />
          <span>You're offline. Some features may be limited.</span>
        </div>
      )}
    </>
  );
}
