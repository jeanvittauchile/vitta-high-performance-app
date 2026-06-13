'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user || user.user_metadata?.role !== 'admin') {
        router.replace('/today');
      }
    });
  }, [router]);

  return (
    <div
      className="admin-layout"
      style={{
        width: '100vw', height: '100vh', overflow: 'hidden',
        display: 'grid',
        background: 'var(--bg)', color: 'var(--text)',
      }}
    >
      {sidebarOpen && (
        <div className="admin-backdrop" onClick={() => setSidebarOpen(false)}/>
      )}

      <AdminSidebar isMobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)}/>

      <div className="thin-scroll" style={{ overflow: 'auto', height: '100vh' }}>
        <div className="admin-topbar">
          <button
            className="admin-hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="2" y1="5" x2="16" y2="5"/>
              <line x1="2" y1="9" x2="16" y2="9"/>
              <line x1="2" y1="13" x2="16" y2="13"/>
            </svg>
          </button>
          <span className="display" style={{ fontStyle: 'italic', fontSize: 17, color: 'var(--vitta-navy-deep)' }}>VITTA</span>
          <span style={{ fontSize: 9, letterSpacing: '0.16em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>High Performance</span>
        </div>
        {children}
      </div>
    </div>
  );
}
