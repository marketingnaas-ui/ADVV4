import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { USERS, PROJECTS, CATS } from '../lib/data';
import { overdue, fmtD, fmt, SBadge, UserAvt } from '../lib/utils';
import { AdvanceDetailView } from '../components/AdvanceDetailView';

export const DataCenter = () => {
  const { advances, pageExtra, toast, setPage, openDrawer } = useApp();
  const [view, setView] = useState('table');
  const [fSearch, setFSearch] = useState('');
  const [fStatus, setFStatus] = useState(pageExtra?.statusF !== undefined ? pageExtra.statusF : '');
  const [fEmp, setFEmp] = useState('');
  const [fProj, setFProj] = useState('');
  const [fCat, setFCat] = useState('');

  const [calY, setCalY] = useState(2026);
  const [calM, setCalM] = useState(6);

  useEffect(() => {
    if (pageExtra?.statusF !== undefined) setFStatus(pageExtra.statusF);
  }, [pageExtra]);

  const clearF = () => { setFSearch(''); setFStatus(''); setFEmp(''); setFProj(''); setFCat(''); };

  const filtered = advances.filter(r => {
    const s = fSearch.toLowerCase();
    const ms = !s || r.id.toLowerCase().includes(s) || r.empName.toLowerCase().includes(s) || r.pName.toLowerCase().includes(s) || r.desc.toLowerCase().includes(s);
    const mst = !fStatus || (fStatus === 'OVERDUE' ? overdue(r) : r.status === fStatus);
    const me = !fEmp || r.empId === fEmp;
    const mp = !fProj || r.pIds.includes(fProj);
    const mc = !fCat || r.catId === fCat;
    return ms && mst && me && mp && mc;
  });

  const handleOpenAdv = (id: string) => {
    openDrawer(
      <AdvanceDetailView.Header id={id} />,
      <AdvanceDetailView.Body id={id} />,
      <AdvanceDetailView.Footer id={id} />
    );
  };

  const FilterBar = () => (
    <div className="fb">
      <div className="sw">
        <svg className="si" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input placeholder="ค้นหา เลขที่ / ชื่อ / โครงการ..." value={fSearch} onChange={e => setFSearch(e.target.value)} />
      </div>
      <div className="fg">
        <label>สถานะ</label>
        <select value={fStatus} onChange={e => setFStatus(e.target.value)}>
          <option value="">ทั้งหมด</option>
          <option value="PENDING_APPROVAL">รออนุมัติ</option>
          <option value="WAITING_TRANSFER">รอโอน</option>
          <option value="WAITING_CLEARANCE">รอเคลียร์</option>
          <option value="OVERDUE">⚠ เกินกำหนด</option>
          <option value="CLOSED">ปิดยอด</option>
          <option value="REJECTED">ไม่อนุมัติ</option>
        </select>
      </div>
      <div className="fg">
        <label>พนักงาน</label>
        <select value={fEmp} onChange={e => setFEmp(e.target.value)}>
          <option value="">ทั้งหมด</option>
          {USERS.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>
      <div className="fg">
        <label>โปรเจกต์</label>
        <select value={fProj} onChange={e => setFProj(e.target.value)}>
          <option value="">ทั้งหมด</option>
          {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="fg">
        <label>หมวด</label>
        <select value={fCat} onChange={e => setFCat(e.target.value)}>
          <option value="">ทั้งหมด</option>
          {CATS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <button className="btn btn-g btn-sm" onClick={clearF}>✕ ล้าง</button>
    </div>
  );

  const renderTable = () => (
    <>
      <FilterBar />
      <div className="tw">
        <table className="dt">
          <thead>
            <tr><th>เลขที่</th><th>สถานะ</th><th>ผู้เบิก</th><th>โครงการ</th><th>หมวด</th><th>วันเบิก</th><th>ครบกำหนด</th><th style={{ textAlign: 'right' }}>ยอดเบิก</th><th style={{ textAlign: 'right' }}>คงค้าง</th></tr>
          </thead>
          <tbody>
            {filtered.length ? filtered.map(r => {
              const out = (r.appAmount || r.amount) - r.clrAmount;
              const od = overdue(r);
              return (
                <tr key={r.id} onClick={() => handleOpenAdv(r.id)}>
                  <td><span className="dn">{r.id}</span></td>
                  <td><SBadge status={r.status} date={r.dueDate} /></td>
                  <td><div className="fl" style={{ gap: '6px' }}><UserAvt ini={r.empName.substring(0, 2)} size={24} /><span style={{ fontSize: '12px' }}>{r.empName}</span></div></td>
                  <td style={{ fontSize: '11.5px', maxWidth: '130px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{r.pName}</td>
                  <td><span className="tag">{r.catName}</span></td>
                  <td style={{ fontSize: '12px', color: 'var(--ts)' }}>{fmtD(r.reqDate)}</td>
                  <td style={{ fontSize: '12px', color: od ? '#ef4444' : 'var(--ts)' }}>{fmtD(r.dueDate)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>฿{fmt(r.amount)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: out > 0 ? '#ef4444' : '#10b981' }}>฿{fmt(out)}</td>
                </tr>
              );
            }) : <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--tm)', padding: '28px' }}>ไม่พบรายการ</td></tr>}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '8px', fontSize: '11.5px', color: 'var(--tm)' }}>แสดง {filtered.length}/{advances.length} รายการ · คลิกแถวดูรายละเอียด</div>
    </>
  );

  const renderCard = () => {
    const SC: Record<string, string> = { PENDING_APPROVAL: '#f59e0b', WAITING_TRANSFER: '#3b82f6', WAITING_CLEARANCE: '#8b5cf6', CLOSED: '#10b981', REJECTED: '#ef4444' };
    return (
      <>
        <FilterBar />
        <div className="cg">
          {filtered.length ? filtered.map(r => {
            const out = (r.appAmount || r.amount) - r.clrAmount;
            const od = overdue(r);
            const col = od ? '#ef4444' : (SC[r.status] || '#6b7280');
            return (
              <div key={r.id} className="ac" onClick={() => handleOpenAdv(r.id)}>
                <div className="ac-h" style={{ borderTop: `3px solid ${col}` }}>
                  <div><div style={{ fontSize: '12px', fontWeight: 800, color: col }}>{r.id}</div><div style={{ fontSize: '11px', color: 'var(--tm)', marginTop: '1px' }}>{r.pName}</div></div>
                  <SBadge status={r.status} date={r.dueDate} />
                </div>
                <div className="ac-b">
                  <div className="flb" style={{ marginBottom: '5px' }}><span style={{ fontSize: '11px', color: 'var(--tm)' }}>ผู้เบิก</span><div className="fl" style={{ gap: '5px' }}><UserAvt ini={r.empName.substring(0, 2)} size={22} /><span style={{ fontSize: '12.5px', fontWeight: 500 }}>{r.empName}</span></div></div>
                  <div className="flb" style={{ marginBottom: '5px' }}><span style={{ fontSize: '11px', color: 'var(--tm)' }}>วันที่เบิก</span><span style={{ fontSize: '12px' }}>{fmtD(r.reqDate)}</span></div>
                  <div className="flb" style={{ marginBottom: '10px' }}><span style={{ fontSize: '11px', color: 'var(--tm)' }}>ครบกำหนด</span><span style={{ fontSize: '12px', color: od ? '#ef4444' : 'inherit' }}>{fmtD(r.dueDate)}</span></div>
                  <div style={{ textAlign: 'center', borderTop: '1px solid var(--bdr)', paddingTop: '10px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--tm)' }}>ยอดเบิก</div>
                    <div className="ac-amt">฿{fmt(r.amount)}</div>
                    {out > 0 && r.status !== 'REJECTED' && <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>คงค้าง ฿{fmt(out)}</div>}
                  </div>
                </div>
                <div className="ac-f"><button className="btn btn-o btn-xs" onClick={(e) => { e.stopPropagation(); handleOpenAdv(r.id); }}>ดูรายละเอียด →</button></div>
              </div>
            );
          }) : <div style={{ color: 'var(--tm)', padding: '32px', textAlign: 'center' }}>ไม่พบรายการ</div>}
        </div>
      </>
    );
  };

  const renderCal = () => {
    const first = new Date(calY, calM - 1, 1).getDay();
    const dim = new Date(calY, calM, 0).getDate();
    const mN = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const evts: Record<number, any[]> = {};
    
    advances.forEach(r => {
      const add = (ds: string, tp: string) => {
        if (!ds) return;
        const d = new Date(ds);
        if (d.getFullYear() === calY && d.getMonth() === calM - 1) {
          const day = d.getDate();
          if (!evts[day]) evts[day] = [];
          evts[day].push({ tp, r });
        }
      };
      add(r.reqDate, 'adv');
      if (r.clrs?.[0]) add(r.clrs[0].date, 'clr');
      if (overdue(r)) add(r.dueDate, 'due');
    });

    const cells = [];
    for (let i = 0; i < first; i++) cells.push(<div key={`om-${i}`} className="cal-c om"></div>);
    for (let d = 1; d <= dim; d++) {
      const isTd = d === 17 && calM === 6 && calY === 2026;
      const de = evts[d] || [];
      cells.push(
        <div key={`d-${d}`} className={`cal-c ${isTd ? 'today' : ''}`}>
          <div className="cal-dt" style={{ color: isTd ? 'var(--p)' : '' }}>{d}</div>
          {de.slice(0, 3).map((e, i) => (
            <div key={i} className={`ce ${e.tp === 'adv' ? 'ce-a' : e.tp === 'clr' ? 'ce-c' : 'ce-d'}`} onClick={(ev) => { ev.stopPropagation(); handleOpenAdv(e.r.id); }}>
              <div className="cav">{e.r.empName[0]}</div><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.r.id.slice(-3)}</span>
            </div>
          ))}
          {de.length > 3 && <div style={{ fontSize: '9px', color: 'var(--tm)' }}>+{de.length - 3}</div>}
        </div>
      );
    }

    const calNav = (delta: number) => {
      let nm = calM + delta, ny = calY;
      if (nm > 12) { nm = 1; ny++; }
      if (nm < 1) { nm = 12; ny--; }
      setCalM(nm); setCalY(ny);
    };

    return (
      <>
        <div className="flb" style={{ marginBottom: '12px' }}>
          <button className="btn btn-g btn-sm" onClick={() => calNav(-1)}>◀</button>
          <div style={{ fontSize: '15px', fontWeight: 700 }}>{mN[calM]} {calY}</div>
          <button className="btn btn-g btn-sm" onClick={() => calNav(1)}>▶</button>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', fontSize: '11px', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#d1fae5', display: 'inline-block' }}></span>วันเบิก</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#fef3c7', display: 'inline-block' }}></span>วันเคลียร์</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#fee2e2', display: 'inline-block' }}></span>เกินกำหนด</span>
        </div>
        <div className="cal-g">
          {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(n => <div key={n} className="cal-dn">{n}</div>)}
          {cells}
        </div>
      </>
    );
  };

  return (
    <>
      <div className="ph">
        <div><h2>Advance Data Center</h2><p>{advances.length} รายการ · ศูนย์รวมข้อมูลทั้งหมด</p></div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-o btn-sm" onClick={() => toast('Export Excel (Mock)')}>⬇ Excel</button>
          <button className="btn btn-o btn-sm" onClick={() => toast('Export CSV (Mock)')}>⬇ CSV</button>
          <button className="btn btn-p btn-sm" onClick={() => setPage('create')}>+ ใบเบิกใหม่</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
        <div className="vtabs">
          <button className={`vtab ${view === 'table' ? 'active' : ''}`} onClick={() => setView('table')}>🗂 Table</button>
          <button className={`vtab ${view === 'card' ? 'active' : ''}`} onClick={() => setView('card')}>🃏 Card</button>
          <button className={`vtab ${view === 'calendar' ? 'active' : ''}`} onClick={() => setView('calendar')}>📅 Calendar</button>
        </div>
      </div>
      {view === 'table' ? renderTable() : view === 'card' ? renderCard() : renderCal()}
    </>
  );
};
