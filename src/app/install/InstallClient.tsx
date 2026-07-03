"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ArrowDownToLine, 
  Smartphone, 
  Share, 
  Plus, 
  Check, 
  Info, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  CloudLightning 
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android" | "desktop";

export default function InstallClient() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<Platform>("android");
  const [isStandalone, setIsStandalone] = useState(false);
  const [activeTab, setActiveTab] = useState<Platform>("android");

  useEffect(() => {
    // Check if already installed
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    // Detect user platform
    const ua = navigator.userAgent.toLowerCase();
    if (/ipad|iphone|ipod/.test(ua)) {
      setPlatform("ios");
      setActiveTab("ios");
    } else if (/android/.test(ua)) {
      setPlatform("android");
      setActiveTab("android");
    } else {
      setPlatform("desktop");
      setActiveTab("desktop");
    }

    // Listen for browser install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else {
      setIsModalOpen(true);
    }
  };

  const steps = {
    ios: [
      { icon: <Share className="size-4 text-brand inline" />, text: "Tap the Share button in Safari's bottom toolbar." },
      { icon: <Plus className="size-4 text-brand inline" />, text: "Scroll down the menu and tap 'Add to Home Screen'." },
      { icon: <Check className="size-4 text-emerald-500 inline" />, text: "Tap 'Add' in the top-right corner to install." }
    ],
    android: [
      { icon: <span className="font-bold text-brand">⋮</span>, text: "Tap the browser menu (3 dots) in the top-right corner." },
      { icon: <ArrowDownToLine className="size-4 text-brand inline" />, text: "Select 'Install App' or 'Add to Home screen'." },
      { icon: <Check className="size-4 text-emerald-500 inline" />, text: "Tap 'Install' or 'Add' to confirm." }
    ],
    desktop: [
      { icon: <span className="font-bold text-brand">⊕</span>, text: "Look at your browser's address bar (top right)." },
      { icon: <ArrowDownToLine className="size-4 text-brand inline" />, text: "Click the install icon or button." },
      { icon: <Check className="size-4 text-emerald-500 inline" />, text: "Click 'Install' in the confirmation prompt." }
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-navy via-brand-navy to-slate-900 text-white font-sans selection:bg-brand selection:text-white">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand/20 via-brand-blue/10 to-transparent pointer-events-none" />

      <header className="container mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <Link href="/" className="flex items-center gap-2 group">
          <Image
            src="/icons/icon-192.png"
            alt="DoorSmith logo"
            width={36}
            height={36}
            className="rounded-lg shadow-md group-hover:scale-105 transition-transform"
          />
          <span className="font-semibold text-lg tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            DoorSmith
          </span>
        </Link>
        <Link 
          href="/login" 
          className="text-sm font-medium bg-white/10 hover:bg-white/15 active:bg-white/20 px-4 py-2 rounded-full border border-white/15 transition-all focus-ring"
          id="btn-nav-login"
        >
          Sign In
        </Link>
      </header>

      <main className="container mx-auto px-6 py-12 lg:py-20 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Info & Action */}
          <div className="lg:col-span-7 space-y-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-semibold uppercase tracking-wider animate-pulse">
              <Sparkles className="size-3.5" />
              Official App Download
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
                Download & Install <br />
                <span className="bg-gradient-to-r from-brand to-orange-400 bg-clip-text text-transparent">
                  DoorSmith App
                </span>
              </h1>
              <p className="text-gray-300 text-lg max-w-xl">
                Install the DoorSmith Karigar Rewards app directly to your mobile device or desktop. Enjoy fast page loading, offline utility, and quick notifications.
              </p>
            </div>

            {/* Quick value proposition badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-lg">
              <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 p-3 rounded-xl">
                <Zap className="text-brand size-5 shrink-0" />
                <span className="text-sm font-medium text-gray-200">Instant Load</span>
              </div>
              <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 p-3 rounded-xl">
                <CloudLightning className="text-brand size-5 shrink-0" />
                <span className="text-sm font-medium text-gray-200">Lightweight</span>
              </div>
              <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 p-3 rounded-xl">
                <ShieldCheck className="text-brand size-5 shrink-0" />
                <span className="text-sm font-medium text-gray-200">Safe & Secure</span>
              </div>
            </div>

            {/* Primary Action Widget */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 sm:p-8 rounded-2xl max-w-2xl shadow-overlay">
              {isStandalone ? (
                <div className="text-center py-4 space-y-3">
                  <div className="size-12 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                    <Check className="size-6" />
                  </div>
                  <h3 className="font-semibold text-lg text-emerald-400">App successfully installed!</h3>
                  <p className="text-sm text-gray-300">You can now open DoorSmith from your home screen icon.</p>
                  <Link 
                    href="/khati" 
                    className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors mt-2"
                  >
                    Open Dashboard
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Direct Download button (always visible) */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-brand/10 border border-brand/20 p-5 rounded-xl">
                      <div className="text-center sm:text-left flex-1">
                        <p className="font-semibold text-gray-200 text-base">Direct Web Download & Install</p>
                        <p className="text-xs text-gray-400">Click below to install this app on your device instantly.</p>
                      </div>
                      <button
                        onClick={handleInstallClick}
                        id="btn-pwa-install-native"
                        className="w-full sm:w-auto bg-brand hover:bg-brand-dark px-8 py-4 rounded-xl font-bold text-base shadow-lg flex items-center justify-center gap-2 transition-transform hover:scale-105 active:scale-95 cursor-pointer shrink-0 focus-ring"
                      >
                        <ArrowDownToLine className="size-5" />
                        Download App
                      </button>
                    </div>
                  </div>

                  {/* Desktop / Mobile installation explanation */}
                  <div className="flex items-start gap-3 text-xs bg-white/5 border border-white/10 p-3 rounded-lg text-gray-300">
                    <Info className="size-4 text-brand shrink-0 mt-0.5" />
                    <p>
                      This app uses progressive technology (PWA). Instead of downloading a heavy file from an app store, you install it directly through the browser, saving space and data.
                    </p>
                  </div>

                  {/* Manual Steps Selector */}
                  <div className="space-y-4">
                    <div className="flex border-b border-white/10">
                      {(["android", "ios", "desktop"] as Platform[]).map((p) => (
                        <button
                          key={p}
                          onClick={() => setActiveTab(p)}
                          className={`flex-1 pb-3 text-sm font-medium transition-colors border-b-2 relative capitalize ${
                            activeTab === p 
                              ? "text-brand border-brand font-semibold" 
                              : "text-gray-400 border-transparent hover:text-white"
                          }`}
                        >
                          {p === "ios" ? "iOS (iPhone)" : p}
                          {platform === p && (
                            <span className="absolute -top-1 right-2 w-1.5 h-1.5 bg-brand rounded-full" title="Detected platform" />
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-4 pt-2">
                      {activeTab === "ios" && (
                        <ol className="space-y-3">
                          {steps.ios.map((step, idx) => (
                            <li key={idx} className="flex gap-3 text-sm text-gray-300">
                              <span className="size-6 bg-white/10 text-brand text-xs font-semibold rounded-full flex items-center justify-center shrink-0">{idx + 1}</span>
                              <span className="flex items-center gap-1.5 flex-wrap">
                                {step.text} (Icon: {step.icon})
                              </span>
                            </li>
                          ))}
                        </ol>
                      )}

                      {activeTab === "android" && (
                        <ol className="space-y-3">
                          {steps.android.map((step, idx) => (
                            <li key={idx} className="flex gap-3 text-sm text-gray-300">
                              <span className="size-6 bg-white/10 text-brand text-xs font-semibold rounded-full flex items-center justify-center shrink-0">{idx + 1}</span>
                              <span className="flex items-center gap-1.5 flex-wrap">
                                {step.text} (Icon: {step.icon})
                              </span>
                            </li>
                          ))}
                        </ol>
                      )}

                      {activeTab === "desktop" && (
                        <ol className="space-y-3">
                          {steps.desktop.map((step, idx) => (
                            <li key={idx} className="flex gap-3 text-sm text-gray-300">
                              <span className="size-6 bg-white/10 text-brand text-xs font-semibold rounded-full flex items-center justify-center shrink-0">{idx + 1}</span>
                              <span className="flex items-center gap-1.5 flex-wrap">
                                {step.text} (Icon: {step.icon})
                              </span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Interactive Phone Mockup */}

          <div className="lg:col-span-5 flex justify-center relative">
            {/* Glow effect under the phone */}
            <div className="absolute inset-0 bg-brand/10 rounded-full blur-3xl opacity-60 scale-75 pointer-events-none" />
            
            {/* Phone Container */}
            <div className="relative w-[300px] h-[600px] bg-slate-950 rounded-[40px] border-[8px] border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col group hover:border-slate-700 transition-colors">
              {/* Phone Speaker/Camera Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-800 rounded-b-xl z-20 flex items-center justify-center">
                <div className="w-12 h-1 bg-slate-900 rounded-full mb-1" />
              </div>

              {/* Status Bar */}
              <div className="h-8 bg-slate-900 flex items-center justify-between px-6 pt-2 z-10 text-[10px] font-medium text-gray-400 select-none">
                <span>9:41</span>
                <div className="flex items-center gap-1.5">
                  <Smartphone className="size-3.5" />
                  <span>5G</span>
                  <div className="w-5 h-2.5 border border-gray-400 rounded-sm p-0.5 flex items-center">
                    <div className="h-full w-full bg-gray-400 rounded-2xs" />
                  </div>
                </div>
              </div>

              {/* App Screen Inside Phone */}
              <div className="flex-1 bg-gray-50 text-gray-900 overflow-y-auto flex flex-col text-xs font-sans relative">
                
                {/* Custom App Header */}
                <div className="bg-brand-navy text-white px-4 pt-4 pb-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-8 bg-white rounded-lg flex items-center justify-center shadow-md">
                      <Image src="/logo.png" alt="Brand Logo" width={24} height={24} className="h-4 w-auto object-contain" />
                    </div>
                    <div>
                      <p className="font-bold text-[11px] leading-tight">DoorSmith</p>
                      <p className="text-[9px] text-brand">Karigar Portal</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 block">Total Points</span>
                    <span className="font-bold text-sm text-brand">1,250</span>
                  </div>
                </div>

                {/* Dashboard Summary Card */}
                <div className="-mt-3 mx-3 bg-white p-3 rounded-xl shadow-card border border-gray-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Quick Scan</span>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">Active</span>
                  </div>
                  
                  {/* Mock QR Scanner Button */}
                  <div className="bg-brand-light border border-brand/20 p-2.5 rounded-lg text-center cursor-pointer hover:bg-brand/10 transition-colors">
                    <div className="size-8 bg-brand rounded-full flex items-center justify-center mx-auto mb-1 shadow-sm">
                      <ArrowDownToLine className="size-4 text-white rotate-180" />
                    </div>
                    <span className="font-bold text-[10px] text-brand">Scan Product QR Code</span>
                  </div>
                </div>

                {/* Recent Rewards Feed */}
                <div className="flex-1 p-3 space-y-2.5">
                  <p className="font-semibold text-gray-700 text-[10px]">Recent Activity</p>
                  
                  <div className="space-y-1.5">
                    {/* Item 1 */}
                    <div className="bg-white p-2 rounded-lg border border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-6 bg-brand-light text-brand rounded-full flex items-center justify-center font-bold text-[10px]">
                          +
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-[10px]">Premium Wooden Door</p>
                          <p className="text-[8px] text-gray-400">Scan ID: #48192</p>
                        </div>
                      </div>
                      <span className="font-bold text-emerald-600 text-[11px]">+100 pts</span>
                    </div>

                    {/* Item 2 */}
                    <div className="bg-white p-2 rounded-lg border border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-6 bg-brand-light text-brand rounded-full flex items-center justify-center font-bold text-[10px]">
                          +
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-[10px]">Flush Door Classic</p>
                          <p className="text-[8px] text-gray-400">Scan ID: #48011</p>
                        </div>
                      </div>
                      <span className="font-bold text-emerald-600 text-[11px]">+50 pts</span>
                    </div>

                    {/* Item 3 */}
                    <div className="bg-white p-2 rounded-lg border border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-6 bg-brand-blue/10 text-brand-blue rounded-full flex items-center justify-center font-bold text-[10px]">
                          ↺
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-[10px]">Points Redeemed</p>
                          <p className="text-[8px] text-gray-400">Khati Counter #3</p>
                        </div>
                      </div>
                      <span className="font-bold text-brand-blue text-[11px]">-500 pts</span>
                    </div>
                  </div>
                </div>

                {/* Bottom App Tab bar */}
                <div className="h-12 bg-white border-t border-gray-100 flex items-center justify-around text-gray-400 select-none">
                  <div className="flex flex-col items-center gap-0.5 text-brand">
                    <span className="text-[12px]">🏠</span>
                    <span className="text-[8px]">Home</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[12px]">📸</span>
                    <span className="text-[8px]">Scan</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[12px]">🎁</span>
                    <span className="text-[8px]">Redeem</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[12px]">👤</span>
                    <span className="text-[8px]">Profile</span>
                  </div>
                </div>
              </div>

              {/* Virtual Home Indicator Bar */}
              <div className="h-5 bg-slate-950 flex justify-center items-center pb-1">
                <div className="w-24 h-1 bg-slate-700 rounded-full" />
              </div>
            </div>
          </div>

        </div>
      </main>

      <footer className="border-t border-white/5 py-12 relative z-10 bg-slate-950/40">
        <div className="container mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-sm text-gray-400">
            © 2026 DoorSmith · Powered by{" "}
            <a
              href="https://gatigrowthlabs.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:underline font-medium"
            >
              Gati Growth Labs
            </a>
          </p>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link href="/login" className="hover:text-white transition-colors">
              Staff Portal
            </Link>
            <Link href="/login/khati" className="hover:text-white transition-colors">
              Karigar Portal
            </Link>
          </div>
        </div>
      </footer>

      {/* Installation Guide Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all">
          <div className="bg-slate-900 border border-white/15 rounded-3xl max-w-md w-full p-6 space-y-6 text-white shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <ArrowDownToLine className="size-5 text-brand" />
                  Install DoorSmith App
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Add to home screen for direct app access.
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-full transition-colors focus-ring"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Platform indicator badge */}
            <div className="bg-brand/10 border border-brand/20 px-3 py-2 rounded-xl flex items-center gap-2.5 text-xs text-brand">
              <Smartphone className="size-4 shrink-0" />
              <span>We detected you are using a <strong>{platform === "ios" ? "iPhone / iPad" : platform}</strong>. Follow these quick steps to download:</span>
            </div>

            {/* Instruction Steps */}
            <ol className="space-y-4">
              {steps[platform].map((step, idx) => (
                <li key={idx} className="flex gap-3 text-sm text-gray-300">
                  <span className="size-6 bg-white/5 text-brand text-xs font-semibold rounded-full flex items-center justify-center shrink-0 border border-white/10">
                    {idx + 1}
                  </span>
                  <span className="flex items-center gap-1.5 flex-wrap">
                    {step.text} {step.icon && <span className="inline-flex bg-white/5 px-1.5 py-0.5 rounded text-xs items-center gap-1">{step.icon}</span>}
                  </span>
                </li>
              ))}
            </ol>

            {/* Close / Action button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="w-full bg-brand hover:bg-brand-dark py-3 rounded-xl font-bold text-sm text-white shadow-md transition-colors cursor-pointer focus-ring"
            >
              Got it, install now!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
