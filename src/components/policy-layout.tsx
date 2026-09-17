import React from "react";
import Link from "next/link";

interface PolicyLayoutProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  activePath: "/privacy-policy" | "/terms" | "/data-deletion";
  children: React.ReactNode;
}

export default function PolicyLayout({
  title,
  subtitle,
  lastUpdated,
  activePath,
  children,
}: PolicyLayoutProps) {
  const navItems = [
    { href: "/privacy-policy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
    { href: "/data-deletion", label: "Data Deletion" },
  ];

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-white/[0.08] bg-[#141414]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/privacy-policy" className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-wide text-white">BrandHive Studio</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                Legal & Compliance
              </span>
            </Link>
          </div>

          <nav className="flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => {
              const isActive = activePath === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                    isActive
                      ? "bg-white/[0.08] text-white font-medium"
                      : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10">
        {/* Page Hero */}
        <div className="mb-8 border-b border-white/[0.08] pb-6">
          <div className="text-xs font-mono text-emerald-400 mb-2">PUBLIC LEGAL POLICIES</div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">{title}</h1>
          <p className="text-sm text-white/60 max-w-2xl">{subtitle}</p>
          <div className="mt-4 text-xs font-mono text-white/40">Last Updated: {lastUpdated}</div>
        </div>

        {/* Policy Body */}
        <div className="prose prose-invert max-w-none text-white/80 space-y-8 text-sm leading-relaxed">
          {children}
        </div>

        {/* Official Contact Card */}
        <div className="mt-12 rounded-xl border border-white/[0.08] bg-[#141414] p-6">
          <h2 className="text-base font-semibold text-white mb-2">Official BrandHive Studio Contact</h2>
          <p className="text-xs text-white/60 mb-4">
            For inquiries regarding privacy, terms, data deletion, or project consultations, reach out through our official channels:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-white/40 block mb-1">Entity Name</span>
              <span className="text-white font-medium">BrandHive Studio</span>
            </div>
            <div>
              <span className="text-white/40 block mb-1">Official WhatsApp</span>
              <span className="text-emerald-400 font-mono">+94 70 641 0093</span>
            </div>
            <div>
              <span className="text-white/40 block mb-1">Official Email</span>
              <a
                href="mailto:brandhive.studio.lk@gmail.com"
                className="text-white/90 underline hover:text-emerald-400 transition-colors font-mono"
              >
                brandhive.studio.lk@gmail.com
              </a>
            </div>
            <div>
              <span className="text-white/40 block mb-1">Official Website</span>
              <span className="text-white/90 font-mono">www.brandhivestudio.com.lk</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-white/40 block mb-1">Support Hours</span>
              <span className="text-white/80">
                Monday–Saturday: 9:00 AM – 6:00 PM (Asia/Colombo, UTC+5:30) • Sunday: Closed
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-[#141414] py-8 text-xs text-white/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            © {new Date().getFullYear()} BrandHive Studio. All rights reserved.
          </div>
          <div className="flex items-center gap-4 text-white/60">
            <Link href="/privacy-policy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
            <span>•</span>
            <Link href="/data-deletion" className="hover:text-white transition-colors">
              Data Deletion
            </Link>
            <span>•</span>
            <Link href="/" className="hover:text-white transition-colors">
              Admin Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
