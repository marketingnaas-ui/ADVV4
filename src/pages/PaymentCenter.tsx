import React from 'react';
import { useApp } from '../context/AppContext';
import { AdvanceDetailView, useAdvanceActions } from '../components/AdvanceDetailView';
import { fmt, fmtD, SBadge, UserAvt } from '../lib/utils';
import { USERS } from '../lib/data';

export const PaymentCenter = () => {
  const { advances, openDrawer } = useApp();
  const data = advances.filter(r => r.status === 'WAITING_TRANSFER');

  const ActionButton = ({ id }: { id: string }) => {
    const { doTransfer } = useAdvanceActions(id, 'payment');
    return (
      <div className="upz" onClick={doTransfer}>
        <div style={{ fontSize: '13px', color: 'var(--p)', fontWeight: 600 }}>📎 Upload Slip การโอน</div>
        <div style={{ fontSize: '11px', color: 'var(--tm)' }}>คลิกเพื่อจำลอง OCR Slip อัตโนมัติ</div>
      </div>
    );
  };

  const handleOpenAdv = (id: string) => {
    openDrawer(
      <AdvanceDetailView.Header id={id} />,
      <AdvanceDetailView.Body id={id} />,
      <AdvanceDetailView.Footer id={id} />
    );
  };

  return (
    <>
      <div className="ph"><div><h2>Payment Center</h2><p>รอโอนเงิน {data.length} รายการ</p></div></div>
      {!data.length ? (
        <div style={{ textAlign: 'center', padding: '52px', color: 'var(--tm)' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>💸</div><div style={{ fontSize: '14px' }}>ไม่มีรายการรอโอนเงิน</div>
        </div>
      ) : (
        <div className="cg">
          {data.map(r => {
            const u = USERS.find(x => x.id === r.empId);
            return (
              <div key={r.id} className="apvc">
                <div className="flb" style={{ marginBottom: '10px' }}>
                  <div><div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--p)' }}>{r.id}</div><div style={{ fontSize: '11px', color: 'var(--tm)' }}>{fmtD(r.reqDate)}</div></div>
                  <SBadge status={r.status} date={r.dueDate} />
                </div>
                <div className="fl" style={{ gap: '8px', marginBottom: '8px' }}>
                  <UserAvt ini={r.empName.substring(0, 2)} size={32} />
                  <div><div style={{ fontSize: '13px', fontWeight: 600 }}>{r.empName}</div><div style={{ fontSize: '11px', color: 'var(--ts)' }}>{r.empDept}</div></div>
                </div>
                <div style={{ background: 'var(--soft)', borderRadius: 'var(--rs)', padding: '11px', marginBottom: '12px', border: '1.5px solid var(--bdr)' }}>
                  <div style={{ fontSize: '10.5px', color: 'var(--tm)' }}>บัญชีปลายทาง</div>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{u?.bank || '–'}</div>
                  <div style={{ fontSize: '12px', letterSpacing: '2px' }}>{u?.bankNo || '–'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--ts)' }}>{u?.name}</div>
                </div>
                <div className="flb" style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--tm)' }}>ยอดโอน</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--p)' }}>฿{fmt(r.appAmount)}</div>
                </div>
                <ActionButton id={r.id} />
                <button className="btn btn-o btn-sm" style={{ width: '100%', marginTop: '7px', justifyContent: 'center' }} onClick={() => handleOpenAdv(r.id)}>ดูรายละเอียด</button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};
