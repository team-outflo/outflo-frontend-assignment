import React, { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
// import { useLocation } from 'react-router-dom'; // Only needed if you have specific logic based on location that might be causing issues

const DashboardLayout = ({ children, activePage }: { children: React.ReactNode, activePage: string }) => {

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  const handleToggleSidebar = (expanded: boolean) => {
    setIsSidebarExpanded(expanded);
  };

  return (
    <div className="flex h-screen bg-[#FBFAFF] "> {/* Use theme background color */}
      <Sidebar
        isExpanded={isSidebarExpanded}
        onToggle={handleToggleSidebar}
        activePage={activePage}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;