import React from 'react';
import { useApp } from '../context/AppContext';
import { AdvanceDetailView, useAdvanceActions } from '../components/AdvanceDetailView';
import { fmt, fmtD, SBadge, UserAvt } from '../lib/utils';

export const ApprovalCenter = () => {
  const { advances, openDrawer } = useApp();
  const data = advances.filter(r => r.status === 'PENDING_APPROVAL');

  const ActionButtons = ({ id }: { id: string }) => {
    const { doApprove, doReject } = useAdvanceActions(id, 'approval');
    return (
      <div className="g2" style={{ gap: '7px' }}>
        <button className="btn btn-err" style={{ justifyContent: 'center' }} onClick={doReject}>❌ ไม่อนุมัติ</button>
        <button className="btn btn-ok" style={{ justifyContent: 'center' }} onClick={doApprove}>✓ อนุมัติ</button>
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
      <div className="ph"><div><h2>Approval Center</h2><p>รออนุมัติ {data.length} รายการ</p></div></div>
      {!data.length ? (
        <div style={{ textAlign: 'center', padding: '52px', color: 'var(--tm)' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div><div style={{ fontSize: '14px' }}>ไม่มีรายการรออนุมัติ</div>
        </div>
      ) : (
        <div className="cg">
          {data.map(r => (
            <div key={r.id} className="apvc">
              <div className="flb" style={{ marginBottom: '10px' }}>
                <div><div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--p)' }}>{r.id}</div><div style={{ fontSize: '11px', color: 'var(--tm)' }}>{fmtD(r.reqDate)}</div></div>
                <SBadge status={r.status} date={r.dueDate} />
              </div>
              <div className="fl" style={{ gap: '8px', marginBottom: '8px' }}>
                <UserAvt ini={r.empName.substring(0, 2)} size={32} />
                <div><div style={{ fontSize: '13px', fontWeight: 600 }}>{r.empName}</div><div style={{ fontSize: '11px', color: 'var(--ts)' }}>{r.empDept}</div></div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ts)', marginBottom: '6px' }}>{r.pName}</div>
              <div style={{ fontSize: '11.5px', color: 'var(--ts)', background: 'var(--soft)', padding: '8px', borderRadius: 'var(--rs)', marginBottom: '12px' }}>{r.desc.substring(0, 80)}...</div>
              <div className="flb" style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--tm)' }}>ยอดขอเบิก</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--p)' }}>฿{fmt(r.amount)}</div>
              </div>
              <ActionButtons id={r.id} />
              <button className="btn btn-o btn-sm" style={{ width: '100%', marginTop: '7px', justifyContent: 'center' }} onClick={() => handleOpenAdv(r.id)}>ดูรายละเอียด</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
};
