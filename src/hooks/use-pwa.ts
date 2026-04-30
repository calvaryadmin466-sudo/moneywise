"use client";

import { useEffect, useState } from "react";

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  deferredPrompt: Event | null;
}

export function usePWA() {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOnline: true,
    deferredPrompt: null,
  });

  useEffect(() => {
    // Check if running as installed PWA
    if (typeof window !== "undefined") {
      const isStandalone = 
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes("android-app://");
      
      setState((prev) => ({ ...prev, isInstalled: isStandalone }));

      // Listen for beforeinstallprompt
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setState((prev) => ({
          ...prev,
          isInstallable: true,
          deferredPrompt: e,
        }));
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

      // Listen for app installed
      window.addEventListener("appinstalled", () => {
        setState((prev) => ({
          ...prev,
          isInstalled: true,
          isInstallable: false,
        }));
      });

      // Online/offline detection
      const handleOnline = () => setState((prev) => ({ ...prev, isOnline: true }));
      const handleOffline = () => setState((prev) => ({ ...prev, isOnline: false }));

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      setState((prev) => ({ ...prev, isOnline: navigator.onLine }));

      // Register service worker
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .register("/service-worker.js")
          .then((registration) => {
            console.log("SW registered:", registration);
          })
          .catch((error) => {
            console.log("SW registration failed:", error);
          });
      }

      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  const installApp = async () => {
    if (state.deferredPrompt) {
      const promptEvent = state.deferredPrompt as any;
      promptEvent.prompt();
      const result = await promptEvent.userChoice;
      
      if (result.outcome === "accepted") {
        console.log("User accepted install");
      } else {
        console.log("User dismissed install");
      }
      
      setState((prev) => ({ ...prev, deferredPrompt: null, isInstallable: false }));
    }
  };

  return { ...state, installApp };
}

// Request notification permission
export async function requestNotificationPermission() {
  if ("Notification" in window) {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
  return false;
}

// Schedule local notification
export function scheduleNotification(title: string, options: NotificationOptions, delay: number) {
  setTimeout(() => {
    if (Notification.permission === "granted") {
      new Notification(title, {
        ...options,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-72x72.png",
      });
    }
  }, delay);
}
