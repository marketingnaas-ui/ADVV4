import React from 'react';
import { useApp } from '../context/AppContext';
import { fmt, fmtD, SBadge, UserAvt } from '../lib/utils';
import { AdvanceDetailView } from '../components/AdvanceDetailView';

export const AdvanceList = () => {
  const { advances, setPage, openDrawer } = useApp();
  const [listF, setListF] = React.useState('');

  const data = listF ? advances.filter(r => r.status === listF) : advances;

  const handleOpenAdv = (id: string) => {
    openDrawer(
      <AdvanceDetailView.Header id={id} />,
      <AdvanceDetailView.Body id={id} />,
      <AdvanceDetailView.Footer id={id} />
    );
  };

  const tabs = [
    { f: '', l: 'ทั้งหมด', n: advances.length, col: 'var(--p)' },
    { f: 'PENDING_APPROVAL', l: 'รออนุมัติ', n: advances.filter(r => r.status === 'PENDING_APPROVAL').length, col: '#f59e0b' },
    { f: 'WAITING_TRANSFER', l: 'รอโอน', n: advances.filter(r => r.status === 'WAITING_TRANSFER').length, col: '#3b82f6' },
    { f: 'WAITING_CLEARANCE', l: 'รอเคลียร์', n: advances.filter(r => r.status === 'WAITING_CLEARANCE').length, col: '#8b5cf6' }
  ];

  return (
    <>
      <div className="ph">
        <div><h2>Advance List</h2><p>รายการทั้งหมด เรียงจากล่าสุด</p></div>
        <button className="btn btn-p btn-sm" onClick={() => setPage('create')}>+ สร้างใบเบิก</button>
      </div>
      
      <div className="sum-bar">
        {tabs.map(t => (
          <div key={t.f} className={`sb-c ${listF === t.f ? 'active' : ''}`} onClick={() => setListF(t.f)}>
            <div className="sb-n" style={{ color: t.col }}>{t.n}</div>
            <div className="sb-l">{t.l}</div>
          </div>
        ))}
      </div>

      <div className="tw">
        <table className="dt">
          <thead>
            <tr><th>เลขที่</th><th>สถานะ</th><th>ผู้เบิก</th><th>โครงการ</th><th>วันเบิก</th><th style={{ textAlign: 'right' }}>ยอดเบิก</th><th>Action</th></tr>
          </thead>
          <tbody>
            {[...data].reverse().map(r => (
              <tr key={r.id} onClick={() => handleOpenAdv(r.id)}>
                <td><span className="dn">{r.id}</span></td>
                <td><SBadge status={r.status} date={r.dueDate} /></td>
                <td><div className="fl" style={{ gap: '6px' }}><UserAvt ini={r.empName.substring(0, 2)} size={24} /><span style={{ fontSize: '12px' }}>{r.empName}</span></div></td>
                <td style={{ fontSize: '11.5px', maxWidth: '130px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{r.pName}</td>
                <td style={{ fontSize: '12px', color: 'var(--ts)' }}>{fmtD(r.reqDate)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>฿{fmt(r.amount)}</td>
                <td><button className="btn btn-o btn-xs" onClick={(e) => { e.stopPropagation(); handleOpenAdv(r.id); }}>รายละเอียด</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};
