import React from 'react';
import '../styles/tailwind.css';
import '../styles/index.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div lang="en" className="min-h-screen bg-[#0a0a0a] text-white antialiased font-sans">
      {children}
    </div>
  );
}
