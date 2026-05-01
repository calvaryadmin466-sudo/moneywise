'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Download, Smartphone, Monitor, Share2, Apple } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

function detectPlatform(): 'ios' | 'android' | 'desktop' | 'unknown' {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/win32|win64|macintosh|mac intel|linux/.test(ua)) return 'desktop';
  return 'unknown';
}

function wasDismissedRecently(): boolean {
  try {
    const dismissed = localStorage.getItem('mw-pwa-dismissed');
    if (!dismissed) return false;
    const daysSince = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24);
    return daysSince < 7;
  } catch {
    return false;
  }
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const platform = useRef(detectPlatform()).current;

  useEffect(() => {
    // Already installed as PWA
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    // Don't show if dismissed recently
    if (wasDismissedRecently()) return;

    // Listen for native browser install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Show install prompt after delay for all platforms
    // Chrome requires HTTPS for native install, so we always show manual instructions
    let timer: ReturnType<typeof setTimeout> | null = null;
    timer = setTimeout(() => {
      if (!wasDismissedRecently()) {
        setShowPrompt(true);
      }
    }, 2000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (timer) clearTimeout(timer);
    };
  }, [platform]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowPrompt(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    try {
      localStorage.setItem('mw-pwa-dismissed', Date.now().toString());
    } catch {}
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[60]">
      <Card className="shadow-2xl border-cyan-500/30 bg-[#0d2137]/95 backdrop-blur-sm text-white">
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 text-white">
              <Download className="h-5 w-5 text-cyan-400" />
              Install MoneyWise
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-gray-400 hover:text-white hover:bg-white/10"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          {platform === 'ios' && (
            <div className="space-y-2">
              <p className="text-sm text-gray-400">
                Add MoneyWise to your iPhone home screen:
              </p>
              <ol className="text-sm space-y-1.5 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-cyan-400 w-4 shrink-0">1.</span>
                  <span>Tap the <Share2 className="h-4 w-4 inline mx-0.5 text-cyan-400" /> Share button in Safari</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-cyan-400 w-4 shrink-0">2.</span>
                  <span>Scroll down and tap <strong className="text-white">"Add to Home Screen"</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-cyan-400 w-4 shrink-0">3.</span>
                  <span>Tap <strong className="text-white">"Add"</strong> to install</span>
                </li>
              </ol>
            </div>
          )}

          {platform === 'android' && deferredPrompt && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">
                Install the app for the best experience — works offline too!
              </p>
              <Button onClick={handleInstallClick} className="w-full gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400">
                <Smartphone className="h-4 w-4" />
                Install App
              </Button>
            </div>
          )}

          {platform === 'android' && !deferredPrompt && (
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Add MoneyWise to your home screen:</p>
              <p className="text-sm text-gray-300">
                Tap the browser menu <strong className="text-white">⋮</strong> → <strong className="text-white">"Add to Home screen"</strong>
              </p>
            </div>
          )}

          {(platform === 'desktop') && deferredPrompt && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">
                Install as a desktop app for quick access:
              </p>
              <Button onClick={handleInstallClick} className="w-full gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400">
                <Monitor className="h-4 w-4" />
                Install Desktop App
              </Button>
            </div>
          )}

          {platform === 'desktop' && !deferredPrompt && (
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Install MoneyWise on your computer:</p>
              <p className="text-sm text-gray-300">
                Chrome: Click <strong className="text-white">⋮</strong> → <strong className="text-white">"Install MoneyWise..."</strong>
              </p>
              <p className="text-xs text-gray-500">
                Note: Chrome may require HTTPS to show install option
              </p>
            </div>
          )}

          {platform === 'unknown' && (
            <div className="space-y-2">
              <p className="text-sm text-gray-400">
                Install MoneyWise for quick access:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/5 p-2 rounded text-gray-300">
                  <Apple className="h-3 w-3 inline mr-1" />
                  <strong>iOS:</strong> Share → Add to Home Screen
                </div>
                <div className="bg-white/5 p-2 rounded text-gray-300">
                  <Smartphone className="h-3 w-3 inline mr-1" />
                  <strong>Android:</strong> Menu → Add to Home screen
                </div>
                <div className="bg-white/5 p-2 rounded col-span-2 text-gray-300">
                  <Monitor className="h-3 w-3 inline mr-1" />
                  <strong>Desktop:</strong> Chrome menu → Install app
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
