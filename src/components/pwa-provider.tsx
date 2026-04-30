"use client";

import * as React from "react";
import { usePWA } from "@/hooks/use-pwa";
import { Button } from "@/components/ui/button";
import { Download, WifiOff, X } from "lucide-react";

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const { isInstallable, isInstalled, isOnline, installApp } = usePWA();
  const [showInstallPrompt, setShowInstallPrompt] = React.useState(false);
  const [showOfflineBanner, setShowOfflineBanner] = React.useState(false);

  React.useEffect(() => {
    // Show install prompt after 3 seconds if installable
    if (isInstallable && !isInstalled) {
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled]);

  React.useEffect(() => {
    setShowOfflineBanner(!isOnline);
  }, [isOnline]);

  return (
    <>
      {children}
      
      {/* Install Prompt */}
      {showInstallPrompt && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl p-4 shadow-2xl z-50 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-1">Install MoneyWise</h3>
              <p className="text-sm text-white/80 mb-3">
                Add to your home screen for quick access and offline support
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    installApp();
                    setShowInstallPrompt(false);
                  }}
                  className="bg-white text-cyan-600 hover:bg-white/90 flex-1"
                >
                  <Download className="h-4 w-4 mr-1" /> Install
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowInstallPrompt(false)}
                  className="text-white hover:bg-white/20"
                >
                  Later
                </Button>
              </div>
            </div>
            <button
              onClick={() => setShowInstallPrompt(false)}
              className="text-white/60 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
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
