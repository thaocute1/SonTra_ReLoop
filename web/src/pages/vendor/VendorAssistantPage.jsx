import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import VendorSidebar from '../../components/vendor/VendorSidebar';
import ReLoopAssistantPage from '../../features/dashboard/pages/ReLoopAssistantPage';

export default function VendorAssistantPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="vendor-portal-shell m3-app-page m3-portal-shell flex min-h-[100dvh] min-w-0 bg-white font-sans text-[#191C1A] relative overflow-x-clip">
      <VendorSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="min-w-0 flex-1">
        <div className="lg:hidden flex items-center gap-2.5 p-4 border-b border-[#C5CCC7] bg-[#F2F5F1] sticky top-0 z-30">
          <button
            type="button"
            aria-label="Mở menu đối tác"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(true)}
            className="min-w-12 min-h-12 inline-flex items-center justify-center bg-white text-[#191C1A] rounded-full border border-[#C5CCC7] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5D4A]/40 motion-press"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-[#191C1A] text-base font-bold font-be-vietnam">Sơn Trà REloop</span>
        </div>
        <ReLoopAssistantPage />
      </main>
    </div>
  );
}
