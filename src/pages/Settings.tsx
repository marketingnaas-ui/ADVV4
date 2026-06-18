import React from 'react';
import { useApp } from '../context/AppContext';
import { USERS, PROJECTS, CATS } from '../lib/data';
import { fmtM, UserAvt } from '../lib/utils';

export const Settings = () => {
  const { settings, updateSettings, toast } = useApp();

  const togSet = (k: string) => {
    updateSettings(k, !settings[k]);
    toast(`${!settings[k] ? 'เปิด' : 'ปิด'}: ${k}`);
  };

  return (
    <>
      <div className="ph"><div><h2>Settings</h2><p>ตั้งค่าระบบ ClearAdvance PRO V2</p></div></div>
      <div className="g2" style={{ alignItems: 'start' }}>
        <div>
          <div className="card" style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--p)', marginBottom: '12px' }}>👥 User Management</div>
            <div className="tw">
              <table className="dt">
                <thead><tr><th>ชื่อ</th><th>แผนก</th><th>Role</th><th>สถานะ</th></tr></thead>
                <tbody>
                  {USERS.map(u => (
                    <tr key={u.id}>
                      <td><div className="fl" style={{ gap: '6px' }}><UserAvt ini={u.ini} size={24} /><span style={{ fontSize: '12.5px' }}>{u.name}</span></div></td>
                      <td style={{ fontSize: '11.5px' }}>{u.dept}</td>
                      <td><span className="tag">{u.role}</span></td>
                      <td><span className="badge bk">active</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn btn-p btn-sm" style={{ marginTop: '10px' }} onClick={() => toast('เพิ่มผู้ใช้ (Mock)')}>+ เพิ่มผู้ใช้</button>
          </div>
          <div className="card">
            <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--p)', marginBottom: '12px' }}>🏗 Project Management</div>
            {PROJECTS.map(p => (
              <div key={p.id} className="flb" style={{ padding: '8px 0', borderBottom: '1px solid var(--bdr)' }}>
                <div><div style={{ fontSize: '13px', fontWeight: 600 }}>{p.name}</div><div style={{ fontSize: '11px', color: 'var(--tm)' }}>Budget ฿{fmtM(p.budget)}</div></div>
                <button className="btn btn-g btn-xs" onClick={() => toast(`แก้ไข: ${p.name}`)}>แก้ไข</button>
              </div>
            ))}
            <button className="btn btn-p btn-sm" style={{ marginTop: '10px' }} onClick={() => toast('เพิ่มโปรเจกต์ (Mock)')}>+ เพิ่มโปรเจกต์</button>
          </div>
        </div>
        
        <div>
          <div className="card" style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--p)', marginBottom: '12px' }}>📂 Category Management</div>
            {CATS.map(ct => (
              <div key={ct.id} className="flb" style={{ padding: '7px 0', borderBottom: '1px solid var(--bdr)' }}>
                <div className="fl" style={{ gap: '7px' }}><div style={{ width: '12px', height: '12px', borderRadius: '3px', background: ct.color, flexShrink: 0 }}></div><span style={{ fontSize: '13px' }}>{ct.name}</span></div>
                <button className="btn btn-g btn-xs" onClick={() => toast(`แก้ไข: ${ct.name}`)}>แก้ไข</button>
              </div>
            ))}
            <button className="btn btn-p btn-sm" style={{ marginTop: '10px' }} onClick={() => toast('เพิ่มหมวด (Mock)')}>+ เพิ่มหมวด</button>
          </div>
          
          <div className="card" style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--p)', marginBottom: '12px' }}>🔔 Notification Settings</div>
            {[
              { k: 'lineNotif', l: 'LINE Notification', d: 'แจ้งเตือนผ่าน LINE Official Account' },
              { k: 'emailNotif', l: 'Email Notification', d: 'แจ้งเตือนทางอีเมล' },
              { k: 'autoOCR', l: 'Auto OCR', d: 'อ่านข้อมูล Slip / ใบเสร็จอัตโนมัติ' },
              { k: 'overdueAlert', l: 'Overdue Alert', d: 'แจ้งเตือนรายการเกินกำหนด' },
              { k: 'auditLog', l: 'Audit Log', d: 'บันทึกทุก Action ในระบบ' }
            ].map(s => (
              <div key={s.k} className="set-row">
                <div><div className="set-lb">{s.l}</div><div className="set-d">{s.d}</div></div>
                <div className={`toggle ${settings[s.k] ? 'on' : ''}`} onClick={() => togSet(s.k)}></div>
              </div>
            ))}
          </div>
          
          <div className="card">
            <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--p)', marginBottom: '12px' }}>🔐 Approval Matrix</div>
            <div className="set-row"><div><div className="set-lb">โหมดอนุมัติ</div><div className="set-d">Single Approver</div></div><span className="badge bk">Single</span></div>
            <div className="set-row"><div><div className="set-lb">วงเงินอัตโนมัติ</div><div className="set-d">ต่ำกว่า ฿5,000 อนุมัติอัตโนมัติ</div></div><span className="badge bp">Mock</span></div>
            <div className="set-row"><div><div className="set-lb">Signature Management</div><div className="set-d">ลายเซ็นผู้มีอำนาจอนุมัติ</div></div><button className="btn btn-o btn-xs" onClick={() => toast('จัดการลายเซ็น (Mock)')}>จัดการ</button></div>
            <button className="btn btn-p btn-sm" style={{ width: '100%', marginTop: '10px', justifyContent: 'center' }} onClick={() => toast('แก้ไข Matrix (Mock)')}>แก้ไข Approval Matrix</button>
          </div>
        </div>
      </div>
    </>
  );
};
