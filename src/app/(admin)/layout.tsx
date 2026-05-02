import AdminSidebar from '@/components/admin/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      display: 'grid', gridTemplateColumns: '220px 1fr',
      background: 'var(--bg)', color: 'var(--text)',
    }}>
      <AdminSidebar/>
      <div className="thin-scroll" style={{ overflow: 'auto', height: '100vh' }}>
        {children}
      </div>
    </div>
  );
}
