import React from 'react';
import { Menu } from 'lucide-react';
import { useApp } from '../context/AppContext';

const TITLES: Record<string, [string, string]> = {
  dashboard: ['Executive Dashboard', 'ภาพรวมผู้บริหาร · 17 มิ.ย. 2569'],
  datacenter: ['Advance Data Center', 'ศูนย์รวมข้อมูลทั้งหมด'],
  list: ['Advance List', 'รายการเงินทดรองจ่ายทั้งหมด'],
  create: ['สร้างใบเบิกเงินทดรอง', 'กรอกข้อมูลและส่งคำขอ'],
  approval: ['Approval Center', 'สำหรับผู้บริหาร · อนุมัติ / ปฏิเสธ'],
  payment: ['Payment Center', 'สำหรับการเงิน · โอนเงินและ Slip'],
  clearance: ['Clearance Center', 'เคลียร์ยอดเงินทดรอง'],
  detail: ['Advance Detail', 'ศูนย์กลาง Workflow ของแต่ละรายการ'],
  reports: ['Reports & Analytics', 'รายงานเชิงบริหาร'],
  settings: ['Settings', 'ตั้งค่าระบบ'],
};

export const Topbar = () => {
  const { page, setSidebarOpen, sidebarOpen } = useApp();
  const [t, s] = TITLES[page] || ['', ''];

  return (
    <header className="topbar">
      <div className="tb-l">
        <button className="ham" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="เมนู">
          <Menu size={22} />
        </button>
        <div>
          <div className="tb-title">{t}</div>
          <div className="tb-sub">{s}</div>
        </div>
      </div>
      <div className="tb-r">
        <div style={{ fontSize: '11.5px', color: 'var(--tm)', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span className="live"></span> Firestore (Mock)
        </div>
        <div className="avt" title="System Admin">SA</div>
      </div>
    </header>
  );
};
