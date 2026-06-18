import React from 'react';
import { LayoutDashboard, Database, List, PlusCircle, CheckSquare, CreditCard, CornerRightDown, FileText, BarChart2, Settings, FolderArchive } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Sidebar = () => {
  const { advances, page, setPage, sidebarOpen } = useApp();
  
  const cList = advances.filter(r => !['CLOSED', 'REJECTED'].includes(r.status)).length;
  const cApp = advances.filter(r => r.status === 'PENDING_APPROVAL').length;
  const cPay = advances.filter(r => r.status === 'WAITING_TRANSFER').length;
  const cClr = advances.filter(r => r.status === 'WAITING_CLEARANCE').length;
  const cAcc = advances.filter(r => r.status === 'WAITING_CLEARANCE').length;
  const cVault = advances.filter(r => ['WAITING_TRANSFER', 'WAITING_CLEARANCE', 'CLOSED'].includes(r.status)).length;

  const NavItem = ({ id, label, icon: Icon, badge }: { id: string; label: string; icon: any; badge?: number }) => (
    <button className={`ni ${page === id ? 'active' : ''}`} onClick={() => setPage(id)}>
      <Icon size={15} />
      {label}
      {badge && badge > 0 ? <span className="bc">{badge}</span> : null}
    </button>
  );

  return (
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} id="sidebar">
      <div className="slogo">
        <div className="slogo-ic">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        </div>
        <div>
          <div className="slogo-t">ClearAdvance</div>
          <div className="slogo-s">PRO V2 · Phase 2 · 10 Pages</div>
        </div>
      </div>
      <nav className="snav">
        <div className="snav-sec">ภาพรวม</div>
        <NavItem id="dashboard" label="Executive Dashboard" icon={LayoutDashboard} />
        <div className="snav-sec">ข้อมูล</div>
        <NavItem id="datacenter" label="Advance Data Center" icon={Database} />
        <NavItem id="list" label="Advance List" icon={List} badge={cList} />
        <NavItem id="create" label="สร้างใบเบิก" icon={PlusCircle} />
        <div className="snav-sec">Workflow</div>
        <NavItem id="approval" label="Approval Center" icon={CheckSquare} badge={cApp} />
        <NavItem id="payment" label="Payment Center" icon={CreditCard} badge={cPay} />
        <NavItem id="clearance" label="Clearance Center" icon={CornerRightDown} badge={cClr} />
        <NavItem id="accounting" label="Accounting Review" icon={CheckSquare} badge={cAcc} />
        <div className="snav-sec">รายงาน & ตั้งค่า</div>
        <NavItem id="detail" label="Advance Detail" icon={FileText} />
        <NavItem id="vault" label="Document Vault" icon={FolderArchive} badge={cVault} />
        <NavItem id="reports" label="Reports & Analytics" icon={BarChart2} />
        <NavItem id="settings" label="Settings" icon={Settings} />
      </nav>
      <div className="sfooter">
        <span className="live"></span> Live Mock Data &nbsp;·&nbsp; v2.0-phase2<br/>
        <span style={{ color: 'var(--p)', fontWeight: 700 }}>Workflow: Create→Approve→Transfer→Clearance→Close</span>
      </div>
    </aside>
  );
};
