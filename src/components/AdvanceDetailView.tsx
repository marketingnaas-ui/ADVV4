import React from 'react';
import { useApp } from '../context/AppContext';
import { fmt, fmtD, SBadge, overdue, clrId, now, UserAvt } from '../lib/utils';
import { USERS } from '../lib/data';

// These components can be extracted into individual files, but we keep them bundled in this orchestrator to minimize boilerplate.

// Action helpers that use the AppContext to mutate global state
export const useAdvanceActions = (id: string, closeAndRedirect?: string) => {
  const { advances, updateAdvance, openModal, closeModal, closeDrawer, toast, setPage } = useApp();
  const r = advances.find(x => x.id === id);

  const done = () => {
    closeModal(); closeDrawer();
    if (closeAndRedirect) setPage(closeAndRedirect);
  };

  const doApprove = () => {
    openModal('ยืนยันอนุมัติ', <span>อนุมัติรายการ <b>{id}</b> ใช่หรือไม่?</span>,
      <><button className="btn btn-o" onClick={closeModal}>ยกเลิก</button><button className="btn btn-ok" onClick={() => {
        updateAdvance(id, { status: 'WAITING_TRANSFER', appDate: '2026-06-17', appBy: 'U006', appAmount: r!.amount });
        toast(`✓ อนุมัติ ${id} · รอโอนเงิน`, 'ok');
        done();
      }}>ยืนยัน</button></>
    );
  };

  const doReject = () => {
    openModal('ยืนยันไม่อนุมัติ', <><div style={{ marginBottom: '8px' }}>เหตุผล:</div><textarea id="rr" placeholder="ระบุเหตุผล..."></textarea></>,
      <><button className="btn btn-o" onClick={closeModal}>ยกเลิก</button><button className="btn btn-err" onClick={() => {
        const rr = (document.getElementById('rr') as HTMLTextAreaElement)?.value || 'ไม่ระบุเหตุผล';
        updateAdvance(id, { status: 'REJECTED', rejReason: rr });
        toast(`ไม่อนุมัติ ${id}`, 'err');
        done();
      }}>ยืนยัน</button></>
    );
  };

  const doTransfer = () => {
    openModal('OCR Slip อัตโนมัติ', 
      <div style={{ background: 'var(--soft)', borderRadius: 'var(--rs)', padding: '14px', textAlign: 'center', border: '1.5px solid var(--bdr)' }}>
        <div style={{ fontSize: '11px', color: 'var(--ts)' }}>🤖 AI อ่านข้อมูล Slip</div>
        <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--p)', margin: '6px 0' }}>฿{fmt(r!.appAmount)}</div>
        <div style={{ fontSize: '12px', color: 'var(--ts)' }}>ธนาคาร กสิกรไทย · 17/06/2569<br/>Ref: KTB26061700{id.slice(-3)}</div>
      </div>,
      <><button className="btn btn-o" onClick={closeModal}>ยกเลิก</button><button className="btn btn-p" onClick={() => {
        updateAdvance(id, { 
          pay: { bank: 'กสิกรไทย', amount: r!.appAmount, date: '2026-06-17', ref: 'KTB26061700' + id.slice(-3), slip: 'slip_new.jpg' }, 
          status: 'WAITING_CLEARANCE' 
        });
        toast('✓ อัปโหลด Slip · โอนไป รอเคลียร์', 'ok');
        done();
      }}>ยืนยัน Slip</button></>
    );
  };

  const doClearance = (maxOut: number) => {
    openModal('สร้างใบเคลียร์ยอด',
      <>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--p)', marginBottom: '10px' }}>{id}</div>
        <div className="g2" style={{ marginBottom: '10px' }}>
          <div><label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--ts)', display: 'block', marginBottom: '4px' }}>ยอดเคลียร์</label><input type="number" id="ca" defaultValue={maxOut} max={maxOut} min="0"/></div>
          <div><label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--ts)', display: 'block', marginBottom: '4px' }}>วันที่</label><input type="date" id="cd" defaultValue="2026-06-17"/></div>
        </div>
        <div><label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--ts)', display: 'block', marginBottom: '4px' }}>หมายเหตุ</label><textarea id="cn" placeholder="หมายเหตุ..."></textarea></div>
        <div style={{ background: 'var(--soft)', borderRadius: 'var(--rs)', padding: '8px', marginTop: '8px', fontSize: '12px', color: 'var(--ts)' }}>ยอดสูงสุด: ฿{fmt(maxOut)}</div>
      </>,
      <><button className="btn btn-o" onClick={closeModal}>ยกเลิก</button><button className="btn btn-p" onClick={() => {
        const amt = +(document.getElementById('ca') as HTMLInputElement)?.value || 0;
        const dt = (document.getElementById('cd') as HTMLInputElement)?.value || '2026-06-17';
        const note = (document.getElementById('cn') as HTMLTextAreaElement)?.value || '–';
        if (amt <= 0 || amt > maxOut) { toast('ยอดไม่ถูกต้อง', 'err'); return; }
        
        const newClrAmount = r!.clrAmount + amt;
        const newStatus = newClrAmount >= r!.appAmount ? 'CLOSED' : r!.status;
        
        updateAdvance(id, {
          clrs: [...r!.clrs, { id: clrId(id), date: dt, amount: amt, note }],
          clrAmount: newClrAmount,
          status: newStatus as any
        });
        toast(newStatus === 'CLOSED' ? `✓ ปิดยอด ${id} เรียบร้อย` : `✓ เคลียร์บางส่วน ${id}`, 'ok');
        done();
      }}>สร้างใบเคลียร์</button></>
    );
  };

  return { doApprove, doReject, doTransfer, doClearance };
};

// UI Definition for the details drawer
export const AdvanceDetailView = {
  Header: ({ id }: { id: string }) => {
    const { advances, closeDrawer } = useApp();
    const r = advances.find(x => x.id === id);
    if (!r) return null;
    
    const pipeline = ['ส่งคำขอ', 'อนุมัติ', 'โอนเงิน', 'เคลียร์', 'ปิดยอด'];
    const pStep: Record<string, number> = { PENDING_APPROVAL: 0, WAITING_TRANSFER: 1, WAITING_CLEARANCE: 2, CLOSED: 4, REJECTED: 1 };
    const curStep = pStep[r.status] ?? 0;
    const isDone = (i: number) => r.status === 'REJECTED' ? i === 0 : i < curStep || (r.status === 'CLOSED' && i <= 4);

    return (
      <>
        <div style={{ flex: 1 }}>
          <div className="fl" style={{ gap: '8px', marginBottom: '3px' }}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--p)' }}>{r.id}</div>
            <SBadge status={r.status} date={r.dueDate} />
          </div>
          <div style={{ fontSize: '12px', color: 'var(--tm)' }}>{r.pName}</div>
          <div className="pipe">
            {pipeline.map((p, i) => {
              const st = r.status === 'REJECTED' && i === 1 ? 'ps-fail' : isDone(i) ? 'ps-ok' : i === curStep ? 'ps-ac' : 'ps-id';
              return <React.Fragment key={p}>{i > 0 && <span style={{ color: 'var(--tm)', fontSize: '14px' }}>›</span>}<span className={`ps ${st}`}>{p}</span></React.Fragment>;
            })}
          </div>
        </div>
        <button className="btn btn-g" onClick={closeDrawer}>✕</button>
      </>
    );
  },
  
  Body: ({ id }: { id: string }) => {
    const { advances } = useApp();
    const actions = useAdvanceActions(id);
    const r = advances.find(x => x.id === id);
    if (!r) return null;
    
    const out = (r.appAmount || r.amount) - r.clrAmount;
    const od = overdue(r);
    
    const tl = [
      { t: 'ส่งคำขอเบิก', d: fmtD(r.reqDate), ok: true },
      { t: r.status === 'REJECTED' ? 'ไม่อนุมัติ' : 'อนุมัติแล้ว', d: r.appDate ? fmtD(r.appDate) : (r.status === 'PENDING_APPROVAL' ? 'รออนุมัติ' : r.status === 'REJECTED' ? fmtD(r.reqDate) : '–'), ok: !!r.appDate && r.status !== 'REJECTED' },
      { t: 'โอนเงิน', d: r.pay ? fmtD(r.pay.date) : 'รอดำเนินการ', ok: !!r.pay },
      { t: 'เคลียร์ยอด', d: r.clrs?.[0] ? fmtD(r.clrs[0].date) : 'รอดำเนินการ', ok: !!r.clrs?.[0] },
    ];

    const renderActionBox = () => {
      if (r.status === 'PENDING_APPROVAL') return <div className="acb"><div className="acb-t">🔒 รออนุมัติ</div><p style={{ fontSize: '12.5px', color: 'var(--ts)' }}>รายการนี้รอการอนุมัติจากผู้บริหาร ยังไม่สามารถดำเนินการได้</p></div>;
      if (r.status === 'WAITING_TRANSFER') {
        const u = USERS.find(x => x.id === r.empId);
        return <div className="acb">
          <div className="acb-t">💳 รอโอนเงิน</div>
          <div className="fl" style={{ gap: '8px', marginBottom: '10px' }}><UserAvt ini={r.empName.substring(0, 2)} size={32} /><div><div style={{ fontSize: '13px', fontWeight: 700 }}>{r.empName}</div><div style={{ fontSize: '11.5px', color: 'var(--ts)' }}>ธนาคาร {u?.bank} · {u?.bankNo}</div></div></div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--p)', marginBottom: '12px' }}>฿{fmt(r.appAmount)}</div>
          <div className="upz" onClick={actions.doTransfer}><div style={{ fontSize: '13px', color: 'var(--p)', fontWeight: 600 }}>📎 Upload Slip การโอนเงิน</div><div style={{ fontSize: '11px', color: 'var(--tm)' }}>คลิกเพื่อจำลอง OCR Slip อัตโนมัติ</div></div>
        </div>;
      }
      if (r.status === 'WAITING_CLEARANCE') return <div className="acb">
        <div className="acb-t">📋 ข้อมูลการโอน & เคลียร์ยอด</div>
        {r.pay && <div className="slip-p" style={{ marginBottom: '12px' }}><div style={{ fontSize: '11px', color: 'var(--ts)', marginBottom: '4px' }}>✓ โอนแล้ว · {r.pay.bank}</div><div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--p)' }}>฿{fmt(r.pay.amount)}</div><div style={{ fontSize: '11.5px', color: 'var(--ts)' }}>Ref: {r.pay.ref} · {fmtD(r.pay.date)}</div></div>}
        {od && <div style={{ background: '#fee2e2', borderRadius: 'var(--rs)', padding: '9px 12px', marginBottom: '10px', fontSize: '12px', color: '#991b1b', fontWeight: 600 }}>⚠ เกินกำหนด {Math.floor((now().getTime() - new Date(r.dueDate).getTime()) / 86400000)} วัน</div>}
        <div style={{ fontSize: '13px', color: 'var(--ts)', marginBottom: '8px' }}>ยอดคงค้าง: <b style={{ color: '#ef4444' }}>฿{fmt(out)}</b></div>
        <button className="btn btn-p" style={{ width: '100%' }} onClick={() => actions.doClearance(out)}>สร้างใบเคลียร์ยอด</button>
      </div>;
      if (r.status === 'CLOSED') return <div className="acb" style={{ borderColor: '#d1fae5' }}><div className="acb-t" style={{ color: '#10b981' }}>✅ ปิดยอดเรียบร้อย</div><p style={{ fontSize: '12.5px', color: 'var(--ts)' }}>รายการนี้เคลียร์ครบถ้วนแล้ว</p></div>;
      if (r.status === 'REJECTED') return <div className="acb" style={{ borderColor: '#fee2e2' }}><div className="acb-t" style={{ color: '#ef4444' }}>❌ ไม่อนุมัติ</div><p style={{ fontSize: '12.5px', color: 'var(--ts)' }}>{r.rejReason || 'ไม่ระบุเหตุผล'}</p></div>;
      return null;
    };

    return (
      <>
        <div className="g2" style={{ marginBottom: '14px' }}>
          <div className="ah"><div className="ah-l">ยอดเบิกทั้งหมด</div><div className="ah-v">฿{fmt(r.amount)}</div></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', justifyContent: 'center' }}>
            {r.appAmount ? <div style={{ background: '#d1fae5', borderRadius: 'var(--rs)', padding: '8px 12px', fontSize: '12px', color: '#065f46', fontWeight: 600 }}>✓ อนุมัติ ฿{fmt(r.appAmount)}</div> : null}
            {out > 0 && r.status !== 'REJECTED' ? <div style={{ background: '#fee2e2', borderRadius: 'var(--rs)', padding: '8px 12px', fontSize: '12px', color: '#991b1b', fontWeight: 600 }}>คงค้าง ฿{fmt(out)}</div> : null}
            {r.clrAmount > 0 ? <div style={{ background: '#dbeafe', borderRadius: 'var(--rs)', padding: '8px 12px', fontSize: '12px', color: '#1e40af', fontWeight: 600 }}>เคลียร์แล้ว ฿{fmt(r.clrAmount)}</div> : null}
          </div>
        </div>
        {renderActionBox()}
        <div className="ds" style={{ marginTop: '16px' }}><div className="ds-t">Document Center</div>
          <div className="dg" style={{ marginBottom: '8px' }}>
            <div className="di"><label>ผู้เบิก</label><span>{r.empName}</span></div>
            <div className="di"><label>หน่วยงาน</label><span>{r.empDept}</span></div>
            <div className="di"><label>โครงการ</label><span>{r.pName}</span></div>
            <div className="di"><label>หมวดค่าใช้จ่าย</label><span>{r.catName}</span></div>
            <div className="di"><label>วันที่เบิก</label><span>{fmtD(r.reqDate)}</span></div>
            <div className="di"><label>กำหนดเคลียร์</label><span style={{ color: od ? '#ef4444' : 'inherit' }}>{fmtD(r.dueDate)}</span></div>
          </div>
          <div className="di"><label>รายละเอียด</label><span>{r.desc}</span></div>
        </div>
        <div className="ds"><div className="ds-t">รายการขอเบิก</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead><tr style={{ background: 'var(--soft)' }}><th style={{ padding: '6px 9px', textAlign: 'left', borderBottom: '1.5px solid var(--bdr)' }}>รายการ</th><th style={{ padding: '6px 9px', textAlign: 'right', borderBottom: '1.5px solid var(--bdr)' }}>จำนวน</th><th style={{ padding: '6px 9px', textAlign: 'right', borderBottom: '1.5px solid var(--bdr)' }}>หน่วยละ</th><th style={{ padding: '6px 9px', textAlign: 'right', borderBottom: '1.5px solid var(--bdr)' }}>รวม</th></tr></thead>
              <tbody>{r.items.map((it, i) => <tr key={i} style={{ background: i % 2 ? '#fafafa' : '' }}><td style={{ padding: '6px 9px' }}>{it.d}</td><td style={{ padding: '6px 9px', textAlign: 'right' }}>{it.q} {it.u}</td><td style={{ padding: '6px 9px', textAlign: 'right' }}>฿{fmt(it.p)}</td><td style={{ padding: '6px 9px', textAlign: 'right', fontWeight: 700 }}>฿{fmt(it.t)}</td></tr>)}</tbody>
              <tfoot><tr style={{ borderTop: '1.5px solid var(--bdr)' }}><td colSpan={3} style={{ padding: '8px 9px', fontWeight: 800, color: 'var(--p)' }}>รวมทั้งสิ้น</td><td style={{ padding: '8px 9px', textAlign: 'right', fontWeight: 900, color: 'var(--p)' }}>฿{fmt(r.amount)}</td></tr></tfoot>
            </table>
          </div>
        </div>
        {r.clrs?.length ? <div className="ds"><div className="ds-t">ประวัติเคลียร์ยอด</div>{r.clrs.map(cl => <div key={cl.id} style={{ background: 'var(--soft)', borderRadius: 'var(--rs)', padding: '11px', border: '1.5px solid var(--bdr)', marginBottom: '6px' }}><div className="flb"><span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--p)' }}>{cl.id}</span><span style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>฿{fmt(cl.amount)}</span></div><div style={{ fontSize: '11.5px', color: 'var(--ts)', marginTop: '3px' }}>วันที่: {fmtD(cl.date)} · {cl.note}</div></div>)}</div> : null}
        <div className="ds"><div className="ds-t">Audit Timeline</div>{tl.map((t, i) => <div key={i} className="tl-item"><div className="tl-dot" style={{ background: t.ok ? 'var(--p)' : 'var(--bdr)' }}></div><div><div className="tl-t" style={{ color: t.ok ? 'var(--tx)' : 'var(--tm)' }}>{t.t}</div><div className="tl-d">{t.d}</div></div></div>)}</div>
        {r.files?.length ? <div className="ds"><div className="ds-t">เอกสารแนบ ({r.files.length})</div>{r.files.map((f, i) => <div key={i} className="fl" style={{ gap: '8px', padding: '8px', background: 'var(--soft)', borderRadius: 'var(--rs)', marginBottom: '5px', border: '1.5px solid var(--bdr)' }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--p)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span style={{ fontSize: '12px', flex: 1 }}>{f}</span><button className="btn btn-g btn-xs">เปิด</button></div>)}</div> : null}
      </>
    );
  },

  Footer: ({ id }: { id: string }) => {
    const { advances, closeDrawer, toast, setPage } = useApp();
    const r = advances.find(x => x.id === id);
    if (!r) return null;

    return (
      <>
        <button className="btn btn-o" onClick={closeDrawer}>ปิด</button>
        {r.status === 'PENDING_APPROVAL' && <button className="btn btn-ok btn-sm" onClick={() => { closeDrawer(); setPage('approval'); }}>ไปอนุมัติ →</button>}
        {r.status === 'WAITING_TRANSFER' && <button className="btn btn-p btn-sm" onClick={() => { closeDrawer(); setPage('payment'); }}>ไปโอนเงิน →</button>}
        {r.status === 'WAITING_CLEARANCE' && <button className="btn btn-p btn-sm" onClick={() => { closeDrawer(); setPage('clearance'); }}>ไปเคลียร์ →</button>}
        <button className="btn btn-o btn-sm" onClick={() => toast(`🖨 Print: ${r.id} (Mock)`)}>🖨 พิมพ์</button>
      </>
    );
  }
};
