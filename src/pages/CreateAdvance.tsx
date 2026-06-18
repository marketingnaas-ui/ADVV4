import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { USERS, PROJECTS, CATS } from '../lib/data';
import { fmt, genId, UserAvt } from '../lib/utils';
import { User, AdvItem } from '../types';

export const CreateAdvance = () => {
  const { advances, toast, setPage, addAdvance } = useApp();
  
  const [emp, setEmp] = useState<User | null>(null);
  const [projs, setProjs] = useState<string[]>([]);
  const [items, setItems] = useState<AdvItem[]>([{ id: 1, d: '', cat: 'C01', q: 1, u: 'ชุด', p: 0, t: 0 }]);
  const [nid, setNid] = useState(2);
  const [files, setFiles] = useState<string[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const total = items.reduce((s, i) => s + i.t, 0);
  const advNo = genId(advances.length);

  const addProj = (id: string) => {
    if (id && !projs.includes(id)) setProjs([...projs, id]);
  };
  
  const updItem = (id: number, k: keyof AdvItem, v: any) => {
    setItems(items.map(i => {
      if (i.id !== id) return i;
      const updated = { ...i, [k]: v };
      updated.t = updated.q * updated.p;
      return updated;
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const names = Array.from(e.target.files).map((f: any) => f.name);
      setFiles((prev) => [...prev, ...names]);
      toast(`📎 อัปโหลดไฟล์ ${names.length} รายการสำเร็จ`, 'ok');
    }
  };

  const submit = () => {
    if (!emp) return toast('กรุณาเลือกพนักงาน', 'err');
    if (!projs.length) return toast('กรุณาเลือกโปรเจกต์', 'err');
    if (!total) return toast('กรุณากรอกรายการและยอดเงิน', 'err');
    
    addAdvance({
      id: advNo, empId: emp.id, empName: emp.name, empDept: emp.dept,
      pIds: projs, pName: PROJECTS.find(p => p.id === projs[0])?.name || '–',
      reqDate: '2026-06-17', dueDate: '2026-07-17', appDate: null, appBy: null,
      status: 'PENDING_APPROVAL', amount: total, appAmount: 0, clrAmount: 0,
      catId: items[0]?.cat || 'C01', catName: CATS.find(ct => ct.id === items[0]?.cat)?.name || '–',
      desc: items.map(i => i.d).join(', '), items: [...items], files: [...files], clrs: [], pay: null
    });
    
    toast(`✓ ส่ง ${advNo} สำเร็จ · สถานะ: รออนุมัติ`, 'ok');
    setTimeout(() => setPage('list'), 1200);
  };

  return (
    <>
      <div className="ph"><div><h2>สร้างใบเบิกเงินทดรอง</h2><p>กรอกข้อมูลและตรวจสอบ Live PDF Preview ก่อนส่ง</p></div></div>
      <div className="crl">
        <div>
          <div className="fs"><div className="fs-h">👤 1. ผู้ขอเบิก</div><div className="fs-b">
            {USERS.filter(u => u.role !== 'approver').map(u => (
              <button key={u.id} className={`ep ${emp?.id === u.id ? 'sel' : ''}`} onClick={() => setEmp(u)}>
                <UserAvt ini={u.ini} size={30} />
                <div><div style={{ fontSize: '13px', fontWeight: 600 }}>{u.name}</div><div style={{ fontSize: '11px', color: 'var(--tm)' }}>{u.dept}</div></div>
                {emp?.id === u.id && <svg style={{ marginLeft: 'auto', color: 'var(--p)' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </button>
            ))}
          </div></div>
          
          <div className="fs"><div className="fs-h">💳 2. บัญชีรับเงิน</div><div className="fs-b">
            {emp ? (
              <div className="bnk">
                <div style={{ fontSize: '10.5px', opacity: .8 }}>ธนาคาร {emp.bank}</div>
                <div style={{ fontSize: '14px', fontWeight: 700, margin: '3px 0' }}>{emp.name}</div>
                <div style={{ fontSize: '12.5px', letterSpacing: '2px', opacity: .85 }}>{emp.bankNo.replace(/(\d{4})(\d{4})(\d{2})/, '$1 $2 $3')}</div>
              </div>
            ) : <div style={{ textAlign: 'center', padding: '20px', color: 'var(--tm)', fontSize: '13px' }}>กรุณาเลือกพนักงานก่อน</div>}
          </div></div>

          <div className="fs"><div className="fs-h">🏗 3. เลือกโปรเจกต์</div><div className="fs-b">
            <select onChange={e => { addProj(e.target.value); e.target.value = ''; }} value="">
              <option value="">+ เพิ่มโปรเจกต์...</option>
              {PROJECTS.filter(p => !projs.includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' }}>
              {projs.map(pid => {
                const p = PROJECTS.find(x => x.id === pid);
                return <div key={pid} className="pchip" onClick={() => setProjs(projs.filter(x => x !== pid))}>{p?.name} <span style={{ fontSize: '14px', color: 'var(--tm)' }}>×</span></div>;
              })}
            </div>
          </div></div>

          <div className="fs"><div className="fs-h">📋 4. รายการขอเบิก</div><div className="fs-b">
            <div style={{ overflowX: 'auto' }}>
              <table className="it">
                <thead><tr><th>รายการ</th><th>หมวด</th><th>จำนวน</th><th>หน่วย</th><th>ราคา</th><th>รวม</th><th></th></tr></thead>
                <tbody>
                  {items.map(it => (
                    <tr key={it.id}>
                      <td><input placeholder="ชื่อรายการ" value={it.d} onChange={e => updItem(it.id!, 'd', e.target.value)} /></td>
                      <td><select value={it.cat} onChange={e => updItem(it.id!, 'cat', e.target.value)}>{CATS.map(ct => <option key={ct.id} value={ct.id}>{ct.name}</option>)}</select></td>
                      <td><input type="number" value={it.q} min="1" onChange={e => updItem(it.id!, 'q', +e.target.value)} style={{ width: '55px' }} /></td>
                      <td><input value={it.u} onChange={e => updItem(it.id!, 'u', e.target.value)} style={{ width: '50px' }} /></td>
                      <td><input type="number" value={it.p} min="0" onChange={e => updItem(it.id!, 'p', +e.target.value)} style={{ width: '75px' }} /></td>
                      <td style={{ fontWeight: 700, fontSize: '11.5px', whiteSpace: 'nowrap' }}>฿{fmt(it.t)}</td>
                      <td>{items.length > 1 && <button className="btn btn-g" onClick={() => setItems(items.filter(x => x.id !== it.id))} style={{ color: '#ef4444', padding: '2px' }}>✕</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="add-r" onClick={() => { setItems([...items, { id: nid, d: '', cat: 'C01', q: 1, u: 'ชุด', p: 0, t: 0 }]); setNid(n => n + 1); }}>+ เพิ่มรายการ</button>
            <div className="tot-b"><div style={{ fontSize: '12.5px', opacity: .85 }}>รวมยอดขอเบิก</div><div style={{ fontSize: '20px', fontWeight: 900 }}>฿{fmt(total)}</div></div>
          </div></div>

          <div className="fs">
            <div className="fs-h">📎 5. เอกสารแนบ</div>
            <div className="fs-b">
              <input 
                type="file" 
                ref={fileInputRef} 
                multiple 
                style={{ display: 'none' }} 
                onChange={handleFileChange} 
              />
              <div className="upz" onClick={() => fileInputRef.current?.click()}>
                <div style={{ fontSize: '22px', marginBottom: '5px' }}>📤</div>
                <div style={{ fontSize: '13px', color: 'var(--p)', fontWeight: 600 }}>คลิกเพื่ออัปโหลดเอกสารจริง</div>
                <div style={{ fontSize: '11px', color: 'var(--tm)' }}>PDF, JPG, PNG, Excel · Max 10MB</div>
              </div>
              {files.length > 0 && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {files.map((name, idx) => (
                    <div key={idx} className="fl" style={{ gap: '8px', padding: '8px', background: 'var(--soft)', borderRadius: 'var(--rs)', border: '1.5px solid var(--bdr)' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--p)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <span style={{ fontSize: '12px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                      <button className="btn btn-g btn-xs" style={{ color: '#ef4444' }} onClick={() => setFiles(files.filter((_, i) => i !== idx))}>ลบ</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="pdf-p">
            <div className="pdf-wm">DRAFT</div>
            <div className="pdf-title">ใบขอเบิกเงินทดรองจ่าย</div>
            <div className="pdf-sub">ADVANCE REQUEST FORM</div>
            <div className="pdf-sub" style={{ fontWeight: 800, color: 'var(--p)', marginBottom: '4px' }}>{advNo}</div>
            <hr className="pdf-hr" />
            <div className="pdf-row"><span>ผู้ขอเบิก: <b>{emp?.name || '................................'}</b></span><span>วันที่: <b>17/06/2569</b></span></div>
            <div className="pdf-row"><span>หน่วยงาน: <b>{emp?.dept || '................................'}</b></span><span>ครบกำหนด: <b>17/07/2569</b></span></div>
            <div className="pdf-row" style={{ marginTop: '3px' }}><span>โปรเจกต์: <b>{projs.map(pid => PROJECTS.find(p => p.id === pid)?.name).join(', ') || '................................'}</b></span></div>
            <hr className="pdf-hr" />
            <table className="pdf-tbl">
              <thead><tr><th>#</th><th>รายการ</th><th>หมวด</th><th style={{ textAlign: 'right' }}>จำนวน</th><th style={{ textAlign: 'right' }}>หน่วยละ</th><th style={{ textAlign: 'right' }}>รวม</th></tr></thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i}><td>{i + 1}</td><td>{it.d || '–'}</td><td>{CATS.find(ct => ct.id === it.cat)?.name || '–'}</td><td style={{ textAlign: 'right' }}>{it.q} {it.u}</td><td style={{ textAlign: 'right' }}>฿{fmt(it.p)}</td><td style={{ textAlign: 'right' }}>฿{fmt(it.t)}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="pdf-tot">รวมทั้งสิ้น: ฿{fmt(total)}</div>
            <hr className="pdf-hr" style={{ marginTop: '18px' }} />
            <div className="pdf-sig">
              <div className="pdf-sig-b"><div className="pdf-sig-l"></div><div className="pdf-sig-n">ผู้ขอเบิก</div><div style={{ fontSize: '10.5px', color: 'var(--tm)' }}>({emp?.name || '.....................'})</div></div>
              <div className="pdf-sig-b"><div className="pdf-sig-l"></div><div className="pdf-sig-n">ผู้อนุมัติ</div><div style={{ fontSize: '10.5px', color: 'var(--tm)' }}>(.....................)</div></div>
            </div>
          </div>
        </div>
      </div>
      <div className="sbar">
        <button className="btn btn-o" onClick={() => toast('บันทึกร่าง · ' + advNo)}>💾 บันทึกร่าง</button>
        <button className="btn btn-p" onClick={submit}>📨 ส่งคำขอเบิก</button>
      </div>
    </>
  );
};
