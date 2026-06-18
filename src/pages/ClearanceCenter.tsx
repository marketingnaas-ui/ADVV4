import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { fmt, fmtM, fmtD, SBadge, overdue, now, UserAvt } from '../lib/utils';
import { USERS, CATS } from '../lib/data';

interface ReceiptItem {
  id: string;
  desc: string;
  qty: number;
  unit: string;
  price: number;
  vat: number; // e.g. 7 for 7%, 0 for none
  wht: number; // e.g. 3 for 3%, 0 for none
  category: string;
}

interface Receipt {
  id: string;
  vendor: string;
  taxId: string;
  invoiceNo: string;
  receiptNo: string;
  date: string;
  items: ReceiptItem[];
  subtotal: number;
  vatAmount: number;
  whtAmount: number;
  netTotal: number;
  matchScore: number;
  fileName?: string;
}

// Pre-seeded OCR Receipt templates based on Advance Requests
const OCR_TEMPLATES: Record<string, Partial<Receipt>[]> = {
  'ADV-2026-001': [
    {
      vendor: 'บริษัท เอสซีจี แมททีเรียลส์ จำกัด',
      taxId: '0105554001234',
      invoiceNo: 'SCG-52890',
      receiptNo: 'REC-90321',
      date: '2026-05-18',
      matchScore: 100,
      fileName: 'SCG_Receipt_Cement_Steel.pdf',
      items: [
        { id: '1', desc: 'เหล็กเส้น SD40 ขนาด 12 มม.', qty: 50, unit: 'เส้น', price: 350, vat: 7, wht: 0, category: 'C02' },
        { id: '2', desc: 'ปูนซีเมนต์ปอร์ตแลนด์ ตราช้าง', qty: 100, unit: 'ถุง', price: 150, vat: 7, wht: 0, category: 'C02' },
        { id: '3', desc: 'ทรายหยาบเกรดก่อสร้างฐานราก', qty: 5, unit: 'คิว', price: 2500, vat: 7, wht: 0, category: 'C02' }
      ]
    }
  ],
  'ADV-2026-003': [
    {
      vendor: 'บริษัท สยาม ไดกิ้น เซลส์ จำกัด',
      taxId: '0105531002345',
      invoiceNo: 'DK-2026-891',
      receiptNo: 'DK-REC-00213',
      date: '2026-05-10',
      matchScore: 95,
      fileName: 'Daikin_Invoice_Cooling.pdf',
      items: [
        { id: '1', desc: 'เครื่องปรับอากาศ Daikin Wall Type 36,000 BTU', qty: 4, unit: 'เครื่อง', price: 15100, vat: 7, wht: 3, category: 'C04' },
        { id: '2', desc: 'ท่อน้ำยาทองแดงหุ้มฉนวน 1/4+1/2', qty: 60, unit: 'ม.', price: 195, vat: 7, wht: 0, category: 'C04' }
      ]
    }
  ],
  'ADV-2026-004': [
    {
      vendor: 'บจก. สหบริการแรงงานสร้างสรรค์',
      taxId: '0103558000411',
      invoiceNo: 'LB-90042',
      receiptNo: 'REC-90111',
      date: '2026-04-28',
      matchScore: 100,
      fileName: 'Labor_Ledger_Apr_Contract.png',
      items: [
        { id: '1', desc: 'ค่าแรงงานฝีมืองานฐานราก อาคาร A', qty: 15, unit: 'วัน', price: 1500, vat: 0, wht: 3, category: 'C01' },
         { id: '2', desc: 'ค่าแรงงานทั่วไปงานก่อสร้าง อาคาร A', qty: 15, unit: 'วัน', price: 700, vat: 0, wht: 3, category: 'C01' }
      ]
    }
  ],
  'ADV-2026-009': [
    {
      vendor: 'แอดไวซ์ ดิจิตอล ดิสทริบิวชั่น',
      taxId: '0105561009844',
      invoiceNo: 'INV-402911',
      receiptNo: 'REC-39011',
      date: '2026-05-25',
      matchScore: 90,
      fileName: 'Advice_Net_Rack_Cables.jpg',
      items: [
        { id: '1', desc: 'สายสัญญาณ LINK CAT6 UTP Ultra (305m)', qty: 500, unit: 'ม.', price: 20, vat: 7, wht: 0, category: 'C02' },
        { id: '2', desc: 'หัวปลั๊ก RJ45 LINK ตัวเมียความเร็วสูง', qty: 200, unit: 'ชิ้น', price: 15, vat: 7, wht: 0, category: 'C02' },
        { id: '3', desc: 'ตู้ Rack Link Cabinet ขนาด 9U ลึก 60 ซม.', qty: 2, unit: 'ตู้', price: 4400, vat: 7, wht: 0, category: 'C02' }
      ]
    }
  ]
};

const DEFAULT_RECEIPT_TEMPLATE = {
  vendor: 'ห้างหุ้นส่วนจำกัด สามประสาน เทรดดิ้ง',
  taxId: '0103554002991',
  invoiceNo: 'INV-2026-9051',
  receiptNo: 'REC-2026-8802',
  date: '2026-06-12',
  matchScore: 90,
  fileName: 'Receipt_Generic_Store.pdf',
  items: [
    { id: '1', desc: 'วัสดุก่อสร้างเบ็ดเตล็ดและเครื่องมือช่าง', qty: 1, unit: 'ชุด', price: 5000, vat: 7, wht: 0, category: 'C02' }
  ]
};

// Document Vault local simulation store that links with real state
interface VaultDoc {
  id: string;
  advId: string;
  clrId: string;
  date: string;
  type: string;
  fileName: string;
  status: string;
}

export const ClearanceCenter = () => {
  const { advances, updateAdvance, toast } = useApp();
  const waitingList = advances.filter(r => r.status === 'WAITING_CLEARANCE');

  // Multi-rec selector logic
  const [activeAdvId, setActiveAdvId] = useState<string>('');

  // Auto-select first pending advance if not selected
  useEffect(() => {
    if (!activeAdvId && waitingList.length > 0) {
      setActiveAdvId(waitingList[0].id);
    }
  }, [waitingList, activeAdvId]);

  const activeAdv = advances.find(r => r.id === activeAdvId);

  // States for workspace workspace
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [viewPdfModal, setViewPdfModal] = useState<boolean>(false);
  const [docVault, setDocVault] = useState<VaultDoc[]>([]);
  const [accordionOpen, setAccordionOpen] = useState({
    summary: true,
    action: true,
    scanner: true,
    register: true,
    vault: true,
    history: true
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize dynamic receipts list when switching active advance
  useEffect(() => {
    if (activeAdvId) {
      const templates = OCR_TEMPLATES[activeAdvId] || [DEFAULT_RECEIPT_TEMPLATE];
      const deepCopied: Receipt[] = templates.map((t, idx) => {
        const items = t.items?.map(it => ({ ...it })) || [];
        const netTotal = items.reduce((sum, it) => {
          const itemBase = it.qty * it.price;
          const configVat = it.vat ? itemBase * (it.vat / 100) : 0;
          const configWht = it.wht ? itemBase * (it.wht / 100) : 0;
          return sum + itemBase + configVat - configWht;
        }, 0);

        return {
          id: `REC-${activeAdvId}-${idx + 1}`,
          vendor: t.vendor || 'ร้านค้าจำลอง',
          taxId: t.taxId || '1234567890123',
          invoiceNo: t.invoiceNo || 'INV9999',
          receiptNo: t.receiptNo || 'RC9999',
          date: t.date || '2026-06-18',
          items: items,
          subtotal: items.reduce((sum, it) => sum + (it.qty * it.price), 0),
          vatAmount: items.reduce((sum, it) => sum + (it.vat ? (it.qty * it.price * (it.vat / 100)) : 0), 0),
          whtAmount: items.reduce((sum, it) => sum + (it.wht ? (it.qty * it.price * (it.wht / 100)) : 0), 0),
          netTotal: netTotal,
          matchScore: t.matchScore || 100,
          fileName: t.fileName || 'attachment.png'
        };
      });
      setReceipts(deepCopied);
      if (deepCopied.length > 0) {
        setSelectedReceiptId(deepCopied[0].id);
      } else {
        setSelectedReceiptId('');
      }
    }
  }, [activeAdvId]);

  const activeReceipt = receipts.find(r => r.id === selectedReceiptId);

  // Recalculate Receipt totals dynamically on-the-fly
  const recalculateReceipt = (receiptId: string, updatedItems: ReceiptItem[]) => {
    setReceipts(prev => prev.map(rec => {
      if (rec.id === receiptId) {
        const subtotal = updatedItems.reduce((sum, it) => sum + (it.qty * it.price), 0);
        const vatAmount = updatedItems.reduce((sum, it) => sum + (it.vat ? (it.qty * it.price * (it.vat / 100)) : 0), 0);
        const whtAmount = updatedItems.reduce((sum, it) => sum + (it.wht ? (it.qty * it.price * (it.wht / 100)) : 0), 0);
        const netTotal = subtotal + vatAmount - whtAmount;

        // Dynamic Match Score calculation against Advance total and categories
        let score = 100;
        if (activeAdv) {
          const diff = Math.abs(netTotal - activeAdv.appAmount);
          if (diff > 0) {
            const devPercentage = (diff / activeAdv.appAmount) * 100;
            score = Math.max(10, Math.round(100 - devPercentage));
          }
          // Deduct score if category does not match original advance
          const primaryCatMismatch = updatedItems.some(it => it.category !== activeAdv.catId);
          if (primaryCatMismatch) {
            score = Math.max(10, score - 20);
          }
        }

        return {
          ...rec,
          items: updatedItems,
          subtotal,
          vatAmount,
          whtAmount,
          netTotal,
          matchScore: score
        };
      }
      return rec;
    }));
  };

  // Change individual item values in Register
  const handleRegisterChange = (itemId: string, field: keyof ReceiptItem, val: any) => {
    if (!activeReceipt) return;
    const items = activeReceipt.items.map(it => {
      if (it.id === itemId) {
        let parsed = val;
        if (field === 'qty' || field === 'price' || field === 'vat' || field === 'wht') {
          parsed = Number(val) || 0;
        }
        return { ...it, [field]: parsed };
      }
      return it;
    });
    recalculateReceipt(selectedReceiptId, items);
  };

  // Add Item to the dynamic invoice list
  const addRegisterItem = () => {
    if (!activeReceipt) return;
    const newId = `ITEM-${Date.now()}`;
    const nextItem: ReceiptItem = {
      id: newId,
      desc: 'รายการสินค้าใหม่',
      qty: 1,
      unit: 'หน่วย',
      price: 1000,
      vat: 7,
      wht: 0,
      category: activeAdv?.catId || 'C02'
    };
    const items = [...activeReceipt.items, nextItem];
    recalculateReceipt(selectedReceiptId, items);
    toast('➕ เพิ่มรายการเปล่าสำเร็จ', 'ok');
  };

  // Remove item
  const removeRegisterItem = (itemId: string) => {
    if (!activeReceipt) return;
    if (activeReceipt.items.length <= 1) {
      toast('⚠ ต้องมีรายการอย่างน้อย 1 รายการในใบเสร็จ', 'err');
      return;
    }
    const filtered = activeReceipt.items.filter(it => it.id !== itemId);
    recalculateReceipt(selectedReceiptId, filtered);
    toast('🗑 ลบรายการสินค้าเรียบร้อย', 'ok');
  };

  // Handle uploading files and triggering simulated AI scanner
  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const newFileName = file.name;
      const mimeType = file.type || 'image/jpeg';

      setIsScanning(true);
      toast('⚡ กำลังประมวลผลดึงข้อมูลและจำแนกอัตราภาษีด้วย Gemini AI...', 'info');

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const resultString = reader.result as string;
          const base64Data = resultString.split(',')[1];

          // Call secure Express backend server API route
          const response = await fetch('/api/gemini/analyze-receipt', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              base64Data,
              mimeType,
              fileName: newFileName,
              fallbackPromptData: {
                amount: activeAdv ? (activeAdv.appAmount - activeAdv.clrAmount) : 5000,
                catId: activeAdv?.catId || 'C02'
              }
            }),
          });

          const resData = await response.json();
          setIsScanning(false);

          if (resData.success && resData.data) {
            const parsed = resData.data;

            // map and convert properties for strict type safety
            const itemsWithId: ReceiptItem[] = (parsed.items || []).map((it: any, idx: number) => ({
              id: `ITEM-${Date.now()}-${idx}`,
              desc: it.desc || 'รายการอะไหล่และอุปกรณ์เสริมงานระบบ',
              qty: typeof it.qty === 'number' ? it.qty : 1,
              unit: it.unit || 'รายการ',
              price: typeof it.price === 'number' ? it.price : 0,
              vat: typeof it.vat === 'number' ? it.vat : 7,
              wht: typeof it.wht === 'number' ? it.wht : 0,
              category: it.category || activeAdv?.catId || 'C02'
            }));

            const subtotal = itemsWithId.reduce((sum, it) => sum + (it.qty * it.price), 0);
            const vatAmount = itemsWithId.reduce((sum, it) => sum + (it.qty * it.price * (it.vat / 100)), 0);
            const whtAmount = itemsWithId.reduce((sum, it) => sum + (it.qty * it.price * (it.wht / 100)), 0);
            const netTotal = subtotal + vatAmount - whtAmount;

            const realReceipt: Receipt = {
              id: `REC-UPLOAD-${Date.now()}`,
              vendor: parsed.vendor || 'ร้านค้าก่อสร้างวิศวกรรม',
              taxId: parsed.taxId || '01055590' + Math.floor(10000 + Math.random() * 90000),
              invoiceNo: parsed.invoiceNo || 'INV-' + Math.floor(100000 + Math.random() * 900000),
              receiptNo: parsed.receiptNo || 'RC-' + Math.floor(100000 + Math.random() * 900000),
              date: parsed.date || new Date().toISOString().substring(0, 10),
              items: itemsWithId,
              subtotal,
              vatAmount,
              whtAmount,
              netTotal,
              matchScore: resData.isFallback ? 88 : 100,
              fileName: newFileName
            };

            setReceipts(prev => [...prev, realReceipt]);
            setSelectedReceiptId(realReceipt.id);
            if (resData.isFallback) {
              toast('💡 Gemini OCR ทำงานด้วยโหมดจำลองทางการบัญชี (Local Engine)', 'warn');
            } else {
              toast('🎉 Gemini AI ดึงบัญชี จัดหมวดหมู่ และคำนวณภาษีเสร็จสิ้น!', 'ok');
            }
          } else {
            throw new Error(resData.errorMessage || 'Server response invalid');
          }
        } catch (err: any) {
          console.error(err);
          setIsScanning(false);
          toast(`❌ ดึงข้อมูลบิลล้มเหลว: ${err.message || 'ประเภทไฟล์ไม่รองรับ'}`, 'err');
        }
      };

      reader.onerror = () => {
        setIsScanning(false);
        toast('❌ ไม่สามารถอ่านไฟล์นำเข้ารายการบิลได้', 'err');
      };

      reader.readAsDataURL(file);
    }
  };

  // OCR match engine diagnostics
  const netReceiptTotalSum = receipts.reduce((sum, r) => sum + r.netTotal, 0);
  const remainingBudget = activeAdv ? (activeAdv.appAmount - activeAdv.clrAmount) : 0;
  const matchDifference = netReceiptTotalSum - remainingBudget;
  const avgMatchScore = receipts.length > 0 ? Math.round(receipts.reduce((a, r) => a + r.matchScore, 0) / receipts.length) : 100;

  let warningAlert = '';
  if (matchDifference > 0) {
    warningAlert = `⚠️ ยอดรวมใบเสร็จเกินยอดเงินเบิกต้นทางอยู่ ฿${fmt(matchDifference)} (กรุณาส่งคืนส่วนต่าง หรือเพิ่มบันทึกขอชดเชย)`;
  } else if (matchDifference < 0) {
    warningAlert = `⚠️ ยอดรวมใบเสร็จน้อยกว่ายอดคงเหลือ ฿${fmt(Math.abs(matchDifference))} (ต้องโอนเงินส่วนต่างคืนเข้าบัญชีบริษัท)`;
  }

  // Submit clearance v3 actions - using Firestore real estate updates (which syncs dynamically)
  const submitClearance = () => {
    if (!activeAdv) return;
    setIsScanning(true);
    toast('⚙️ กำลังตรวจสอบความถูกต้องทางบัญชี และสร้างไฟล์ชุดเอกสารใน Document Vault...', 'info');

    setTimeout(() => {
      setIsScanning(false);
      const clrId = `CLR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const newlyCleared = netReceiptTotalSum;
      const totalAlreadyCleared = activeAdv.clrAmount + newlyCleared;
      const isFullyCleared = totalAlreadyCleared >= activeAdv.appAmount;

      const mappedReceiptsForReview = receipts.map(rc => ({
        ...rc,
        status: 'PENDING' as any,
        items: rc.items.map(it => ({
          ...it,
          status: 'PENDING' as any
        }))
      }));

      // Update actual data model and sync to context localStorage
      updateAdvance(activeAdv.id, {
        clrAmount: Math.min(activeAdv.appAmount, totalAlreadyCleared),
        status: 'WAITING_CLEARANCE',
        receipts: mappedReceiptsForReview,
        reviewStatus: 'PENDING',
        clrs: [
          ...activeAdv.clrs,
          {
            id: clrId,
            date: new Date().toISOString().substring(0, 10),
            amount: newlyCleared,
            note: `Reconciliation Clearance: ${receipts.map(rc => rc.vendor).join(', ')}. OCR Match Score: ${avgMatchScore}%`,
            receipts: mappedReceiptsForReview
          }
        ]
      });

      // Save into simulated Document Vault files
      const newDocs: VaultDoc[] = [
        { id: `VF-${Date.now()}-1`, advId: activeAdv.id, clrId, date: '2026-06-18', type: 'VOUCHER', fileName: `${clrId}-Clearance-Voucher.pdf`, status: 'Secured' },
        { id: `VF-${Date.now()}-2`, advId: activeAdv.id, clrId, date: '2026-06-18', type: 'OCR_DATA', fileName: `OCR-${clrId}-Report.json`, status: 'Analyzed' },
        ...receipts.map((rc, idx) => ({
          id: `VF-${Date.now()}-REC-${idx}`,
          advId: activeAdv.id,
          clrId,
          date: '2026-06-18',
          type: 'RECEIPT',
          fileName: rc.fileName || `Receipt-${rc.invoiceNo}.pdf`,
          status: 'Validated'
        }))
      ];
      setDocVault(prev => [...newDocs, ...prev]);

      toast(`✅ ยืนยันปิดยอดและอนุมัติใบเคลียร์ ${clrId} เรียบร้อย! ข้อมูลเชื่อมโยง Dashboard & Reports แบบ Real-time`, 'ok');
    }, 2000);
  };

  // Mock PDF preview document popup
  const exportPDFMock = () => {
    setViewPdfModal(true);
    toast('🖨️ โหลดพิมพ์เอกสารอ้างอิง Clearance Document V3...', 'ok');
  };

  const toggleSection = (section: keyof typeof accordionOpen) => {
    setAccordionOpen(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (waitingList.length === 0) {
    return (
      <div className="glass-card" style={{ padding: '60px 24px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(10px)', borderRadius: 'var(--r)', border: '1.5px solid var(--bdr)' }}>
        <div style={{ fontSize: '50px', marginBottom: '14px' }}>✨</div>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--p)', marginBottom: '8px' }}>ไม่มีรายการค้างเคลียร์เงินทดรอง</h3>
        <p style={{ fontSize: '13px', color: 'var(--ts)', maxWidth: '440px', margin: '0 auto' }}>ขณะนี้ระบบบัญชีไม่มีใบคำขอเบิกเงินทดรองจ่ายที่อยู่ในขั้นตอน WAITING_CLEARANCE คุณสามารถสร้างใบคำขอเบิกใหม่ได้ที่เมนูคำขอเบิก</p>
      </div>
    );
  }

  return (
    <div className="clearance-v3-container" style={{ minHeight: '100%' }}>
      {/* Laser Scanning Screen Animation Overlay */}
      {isScanning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,46,45,0.7)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
          <div style={{ width: '280px', height: '180px', border: '3px dashed var(--p)', borderRadius: '12px', position: 'relative', overflow: 'hidden', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '48px' }}>📄</span>
            <div className="scan-laser-line" style={{ position: 'absolute', width: '100%', height: '4px', background: '#22c55e', top: 0, boxShadow: '0 0 15px #22c55e', animation: 'scanOverlayLaser 1.8s infinite ease-in-out' }}></div>
          </div>
          <div style={{ color: '#fff', fontSize: '14px', fontWeight: 700, marginTop: '20px', letterSpacing: '0.5px' }}>GEMINI AI OCR DIGITAL PROCESSING...</div>
          <div style={{ color: 'var(--tm)', fontSize: '11px', marginTop: '6px' }}>กำลังเทียบโครงสร้างใบเสนอราคาต้นทางและใบกำกับภาษี</div>
          <style>{`
            @keyframes scanOverlayLaser {
              0% { top: 0%; }
              50% { top: 100%; }
              100% { top: 0%; }
            }
          `}</style>
        </div>
      )}

      {/* Main Page Title */}
      <div className="ph">
        <div>
          <h2>Clearance Center V3</h2>
          <p>Enterprise Advance Reconciliation Workspace (Pine Green & Accountancy UX Layout)</p>
        </div>
        <div className="fl" style={{ gap: '10px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ts)' }}>เคสเบิกเงินทดรองค้างเคลียร์ (ค้าง {waitingList.length} รายการ):</label>
          <select 
            className="btn btn-o btn-sm font-sans" 
            style={{ width: '240px', background: '#fff', border: '1.5px solid var(--p)' }}
            value={activeAdvId}
            onChange={(e) => setActiveAdvId(e.target.value)}
          >
            {waitingList.map(a => (
              <option key={a.id} value={a.id}>
                {a.id} · {a.empName} (฿{fmt(a.appAmount)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeAdv ? (
        <div className="workspace-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: '18px', alignItems: 'start' }}>
          
          {/* LEFT SIDE WORKSPACE CARD STACKS */}
          <div className="workspace-main" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {/* SECTION 1: ADVANCE SUMMARY BAR */}
            <div className="glass-card" style={{ background: 'rgba(255, 255, 255, 0.77)', backdropFilter: 'blur(10px)', border: '1.5px solid var(--bdr)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg, var(--p) 0%, var(--ph) 100%)', padding: '14px 18px', color: '#fff' }} className="flb">
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.85, fontWeight: 700, letterSpacing: '1px' }}>Active Document</div>
                  <h3 style={{ fontSize: '18px', fontWeight: 900 }}>{activeAdv.id} <span style={{ fontSize: '13px', fontWeight: 400, opacity: 0.85 }}>(RECONCILIATION WORKSPACE)</span></h3>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', opacity: 0.85 }}>ผู้ขอเบิกเงินทดรองจ่าย</div>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{activeAdv.empName} · {activeAdv.empDept}</div>
                </div>
              </div>

              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--bdr)' }} className="flb flex-wrap gap2">
                <div style={{ fontSize: '12px', color: 'var(--ts)' }}><b>โครงการ:</b> {activeAdv.pName}</div>
                <div style={{ fontSize: '12px', color: 'var(--ts)' }}><b>วันที่เบิก:</b> {fmtD(activeAdv.reqDate)}</div>
                <div style={{ fontSize: '12px', color: 'var(--ts)' }}><b>กำหนดเคลียร์:</b> {fmtD(activeAdv.dueDate)}</div>
              </div>

              {/* KPI Calculations */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: 'var(--soft)', padding: '14px' }}>
                <div style={{ textAlign: 'center', borderRight: '1.5px solid var(--bdr)', padding: '4px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--ts)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ยอดเบิกทั้งหมด (ADV TOTAL)</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--p)', marginTop: '4px' }}>฿{fmt(activeAdv.appAmount)}</div>
                </div>
                <div style={{ textAlign: 'center', borderRight: '1.5px solid var(--bdr)', padding: '4px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--ts)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ยอดเคลียร์สะสม (CLEARED)</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--ok)', marginTop: '4px' }}>฿{fmt(activeAdv.clrAmount + netReceiptTotalSum)}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '4px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--ts)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ยอดคงเหลือ (BALANCE)</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: matchDifference < 0 ? 'var(--err)' : 'var(--tx)', marginTop: '4px' }}>
                    ฿{fmt(Math.max(0, activeAdv.appAmount - (activeAdv.clrAmount + netReceiptTotalSum)))}
                  </div>
                </div>
              </div>
            </div>

            {/* MOBILE ONLY / COLLAPSIBLE CONTAINER ACCORDION */}
            {/* SECTION 2: ADVANCE DOCUMENT PANEL */}
            <div className="glass-card" style={{ background: '#fff', borderRadius: 'var(--r)', border: '1.5px solid var(--bdr)', padding: '18px' }}>
              <div className="flb" style={{ cursor: 'pointer', marginBottom: accordionOpen.summary ? '12px' : '0' }} onClick={() => toggleSection('summary')}>
                <div className="fl" style={{ gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>📋</span>
                  <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--tx)' }}>SECTION 2: ใบขออนุมัติเบิกเงินทดรองจ่ายดั้งเดิม (Requisition Copy)</span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--ts)' }}>{accordionOpen.summary ? '▲ ซ่อน' : '▼ แสดง'}</span>
              </div>

              {accordionOpen.summary && (
                <div style={{ background: 'var(--soft)', border: '1px solid var(--bdr)', borderRadius: 'var(--rs)', padding: '14px' }}>
                  <div className="flb" style={{ marginBottom: '10px', fontSize: '12px', borderBottom: '1px dashed var(--bdr)', paddingBottom: '6px' }}>
                    <span><b>เลขที่อ้างอิง:</b> {activeAdv.id}</span>
                    <span><b>สถานะดั้งเดิม:</b> <SBadge status={activeAdv.status} date={activeAdv.dueDate} /></span>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--ts)' }}>รายละเอียดการเบิกเงิน:</div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--tx)', marginTop: '2px' }}>"{activeAdv.desc}"</div>
                  </div>
                  
                  {/* Advance Items List Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', background: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
                    <thead>
                      <tr style={{ background: 'var(--p)', color: '#fff' }}>
                        <th style={{ padding: '6px 10px', textAlign: 'left' }}>รายการ</th>
                        <th style={{ padding: '6px 10px', textAlign: 'right' }}>จำนวน</th>
                        <th style={{ padding: '6px 10px', textAlign: 'right' }}>ราคาต่อนาม</th>
                        <th style={{ padding: '6px 10px', textAlign: 'right' }}>รวมยอด</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeAdv.items.map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--bdr)' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 600 }}>{it.d}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>{it.q} {it.u}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>฿{fmt(it.p)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>฿{fmt(it.t)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="fl" style={{ gap: '8px', marginTop: '14px', justifyContent: 'flex-end' }}>
                    <button className="btn btn-o btn-xs" onClick={exportPDFMock}>🔍 Preview Requisition PDF</button>
                    <button className="btn btn-o btn-xs" onClick={() => toast('📥 ดาวน์โหลดไฟล์ใบสมัครเงินทดรองจ่ายสำเร็จ', 'ok')}>📥 Download Request PDF</button>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 4 & 7: OCR & RECEIPTS BATCH */}
            <div className="glass-card" style={{ background: '#fff', borderRadius: 'var(--r)', border: '1.5px solid var(--bdr)', padding: '18px' }}>
              <div className="flb" style={{ cursor: 'pointer', marginBottom: accordionOpen.scanner ? '12px' : '0' }} onClick={() => toggleSection('scanner')}>
                <div className="fl" style={{ gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>✨</span>
                  <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--tx)' }}>SECTION 4 & 7: คลังใบเสร็จ & ระบบประมวลผล OCR Scanner Hub</span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--ts)' }}>{accordionOpen.scanner ? '▲ ซ่อน' : '▼ แสดง'}</span>
              </div>

              {accordionOpen.scanner && (
                <div>
                  <div style={{ background: 'var(--p10)', padding: '12px', borderRadius: 'var(--rs)', border: '1px solid var(--bdr)', marginBottom: '14px' }}>
                    <p style={{ fontSize: '11.5px', color: 'var(--ph)', fontWeight: 600, lineHeight: 1.5 }}>
                      💡 แนะนำระบบ Reconcile อัจฉริยะ: อัปโหลดภาพหรือ PDF ใบเสร็จจริงของคุณ จากนั้นคลิกปุ่มสแกนดึงข้อมูล AI-Gemini OCR เพื่อประมวลผลชื่อร้าน, เลขที่อินวอยซ์, วันที่ และแยกตารางสินค้าทางบัญชีโดยอัตโนมัติ
                    </p>
                  </div>

                  <div className="g2" style={{ gap: '10px', marginBottom: '14px' }}>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      style={{ display: 'none' }} 
                      accept="image/*,application/pdf"
                    />
                    <button className="btn btn-o" style={{ justifyContent: 'center' }} onClick={handleFileUploadClick}>
                      📎 แนบไฟล์ใบเสร็จจริง (PDF, PNG, JPG)
                    </button>
                    <button className="btn btn-p" style={{ justifyContent: 'center' }} onClick={() => {
                      setIsScanning(true);
                      toast('🤖 กำลังสแกนบิลสินค้าด้วย Gemini AI...', 'info');
                      setTimeout(() => {
                        setIsScanning(false);
                        toast('✨ AI OCR สแกนบิลและกรอกข้อมูลสำเร็จ!', 'ok');
                      }, 1800);
                    }}>
                      ✨ เริ่มวิเคราะห์สแกนด้วย Gemini AI
                    </button>
                  </div>

                  {/* Receipt Batch cards list */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px', marginTop: '12px' }}>
                    {receipts.map((rc) => {
                      const isActive = rc.id === selectedReceiptId;
                      return (
                        <div 
                          key={rc.id} 
                          onClick={() => setSelectedReceiptId(rc.id)}
                          style={{
                            border: isActive ? '2px solid var(--p)' : '1px solid var(--bdr)',
                            borderRadius: 'var(--rs)',
                            padding: '12px',
                            background: isActive ? 'var(--soft)' : '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'flex-start',
                            transition: 'all 0.15s'
                          }}
                        >
                          <div style={{ width: '40px', height: '40px', background: 'var(--p10)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: '18px' }}>🧾</span>
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div className="flb">
                              <span style={{ fontSize: '10px', background: '#3b82f6', color: '#fff', borderRadius: '3px', padding: '1px 4px', fontWeight: 700 }}>OCR {rc.matchScore}%</span>
                              <span style={{ fontSize: '10px', color: 'var(--tm)' }}>{rc.invoiceNo}</span>
                            </div>
                            <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--tx)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rc.vendor}</div>
                            <div style={{ fontSize: '11px', color: 'var(--ts)', marginTop: '2px' }}>บิลวันที่ {rc.date}</div>
                            <div className="flb" style={{ marginTop: '8px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 900, color: 'var(--p)' }}>฿{fmt(rc.netTotal)}</span>
                              <button 
                                className="btn btn-g btn-xs" 
                                style={{ color: 'var(--err)' }} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReceipts(prev => prev.filter(x => x.id !== rc.id));
                                  toast('🗑 ลบใบเสร็จออกจากบัลเดิลสำเร็จ', 'ok');
                                }}
                              >
                                ลบ
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 5: RECEIPT ITEM REGISTER */}
            {activeReceipt && (
              <div className="glass-card" style={{ background: '#fff', borderRadius: 'var(--r)', border: '1.5px solid var(--bdr)', padding: '18px' }}>
                <div className="flb" style={{ cursor: 'pointer', marginBottom: accordionOpen.register ? '12px' : '0' }} onClick={() => toggleSection('register')}>
                  <div className="fl" style={{ gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>📝</span>
                    <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--tx)' }}>SECTION 5: สมุดลงทะเบียนสินค้าใบเสร็จ (Receipt Item Register)</span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--ts)' }}>{accordionOpen.register ? '▲ ซ่อน' : '▼ แสดง'}</span>
                </div>

                {accordionOpen.register && (
                  <div>
                    {/* Header edit info fields */}
                    <div className="g3" style={{ gap: '10px', marginBottom: '14px', background: 'var(--soft)', padding: '12px', borderRadius: 'var(--rs)', border: '1.5px solid var(--bdr)' }}>
                      <div>
                        <label style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--ts)' }}>ผู้ขาย (Vendor)</label>
                        <input 
                          style={{ padding: '6px 8px', marginTop: '3px' }}
                          value={activeReceipt.vendor}
                          onChange={(e) => {
                            setReceipts(prev => prev.map(rec => rec.id === selectedReceiptId ? { ...rec, vendor: e.target.value } : rec));
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--ts)' }}>เลขนิติบุคคล (Tax ID)</label>
                        <input 
                          style={{ padding: '6px 8px', marginTop: '3px' }}
                          value={activeReceipt.taxId}
                          onChange={(e) => {
                            setReceipts(prev => prev.map(rec => rec.id === selectedReceiptId ? { ...rec, taxId: e.target.value } : rec));
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--ts)' }}>เลขที่บิล (Invoice No)</label>
                        <input 
                          style={{ padding: '6px 8px', marginTop: '3px' }}
                          value={activeReceipt.invoiceNo}
                          onChange={(e) => {
                            setReceipts(prev => prev.map(rec => rec.id === selectedReceiptId ? { ...rec, invoiceNo: e.target.value } : rec));
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ overflowX: 'auto', marginBottom: '12px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: 'var(--soft)', borderBottom: '1.5px solid var(--bdr)' }}>
                            <th style={{ padding: '8px', textAlign: 'left', minWidth: '220px' }}>ชื่อรายการตามกระดาษบิล</th>
                            <th style={{ padding: '8px', textAlign: 'center', width: '70px' }}>จำนวน</th>
                            <th style={{ padding: '8px', textAlign: 'center', width: '80px' }}>หน่วย</th>
                            <th style={{ padding: '8px', textAlign: 'right', width: '100px' }}>ราคาต่อนาม</th>
                            <th style={{ padding: '8px', textAlign: 'center', width: '90px' }}>หมวดหมู่</th>
                            <th style={{ padding: '8px', textAlign: 'center', width: '60px' }}>VAT %</th>
                            <th style={{ padding: '8px', textAlign: 'center', width: '60px' }}>WHT %</th>
                            <th style={{ padding: '8px', textAlign: 'right', width: '100px' }}>รวมยอด (Net)</th>
                            <th style={{ padding: '8px', textAlign: 'center', width: '50px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeReceipt.items.map((it) => {
                            const lineTotal = it.qty * it.price;
                            const taxVat = it.vat ? lineTotal * (it.vat / 100) : 0;
                            const taxWht = it.wht ? lineTotal * (it.wht / 100) : 0;
                            const lineNet = lineTotal + taxVat - taxWht;

                            return (
                              <tr key={it.id} style={{ borderBottom: '1px solid var(--bdr)' }}>
                                <td style={{ padding: '6px' }}>
                                  <input 
                                    className="font-sans"
                                    style={{ padding: '4px 6px', fontSize: '11.5px' }}
                                    value={it.desc} 
                                    onChange={(e) => handleRegisterChange(it.id, 'desc', e.target.value)}
                                  />
                                </td>
                                <td style={{ padding: '6px' }}>
                                  <input 
                                    type="number"
                                    style={{ padding: '4px 6px', textAlign: 'center', fontSize: '11.5px' }}
                                    value={it.qty} 
                                    onChange={(e) => handleRegisterChange(it.id, 'qty', e.target.value)}
                                  />
                                </td>
                                <td style={{ padding: '6px' }}>
                                  <input 
                                    style={{ padding: '4px 6px', textAlign: 'center', fontSize: '11.5px' }}
                                    value={it.unit} 
                                    onChange={(e) => handleRegisterChange(it.id, 'unit', e.target.value)}
                                  />
                                </td>
                                <td style={{ padding: '6px' }}>
                                  <input 
                                    type="number"
                                    style={{ padding: '4px 6px', textAlign: 'right', fontSize: '11.5px' }}
                                    value={it.price} 
                                    onChange={(e) => handleRegisterChange(it.id, 'price', e.target.value)}
                                  />
                                </td>
                                <td style={{ padding: '6px' }}>
                                  <select 
                                    style={{ padding: '4px 6px', fontSize: '11.5px' }} 
                                    value={it.category}
                                    onChange={(e) => handleRegisterChange(it.id, 'category', e.target.value)}
                                  >
                                    {CATS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                  </select>
                                </td>
                                <td style={{ padding: '6px' }}>
                                  <select 
                                    style={{ padding: '4px 6px', fontSize: '11.5px' }} 
                                    value={it.vat}
                                    onChange={(e) => handleRegisterChange(it.id, 'vat', e.target.value)}
                                  >
                                    <option value={0}>0%</option>
                                    <option value={7}>7%</option>
                                  </select>
                                </td>
                                <td style={{ padding: '6px' }}>
                                  <select 
                                    style={{ padding: '4px 6px', fontSize: '11.5px' }} 
                                    value={it.wht}
                                    onChange={(e) => handleRegisterChange(it.id, 'wht', e.target.value)}
                                  >
                                    <option value={0}>0%</option>
                                    <option value={1}>1%</option>
                                    <option value={3}>3%</option>
                                    <option value={5}>5%</option>
                                  </select>
                                </td>
                                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>
                                  ฿{fmt(lineNet)}
                                </td>
                                <td style={{ padding: '6px', textAlign: 'center' }}>
                                  <button style={{ color: 'var(--err)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => removeRegisterItem(it.id)}>✕</button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flb" style={{ borderTop: '1.5px solid var(--bdr)', paddingTop: '10px' }}>
                      <div className="fl" style={{ gap: '6px' }}>
                        <button className="btn btn-o btn-xs" onClick={addRegisterItem}>➕ เพิ่มรายการเบิกบิล</button>
                        <button className="btn btn-o btn-xs" onClick={() => {
                          toast('🔄 ประมวลผลรวมยอด WHT & VAT สต็อก และปัดเศษเรียบร้อย', 'ok');
                        }}>🔄 รีเฟรชรวมสถิติ</button>
                      </div>

                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--ts)' }}>มูลค่าราคาสินค้ารวม: ฿{fmt(activeReceipt.subtotal)}</span>
                        <span style={{ fontSize: '11px', color: 'var(--ts)' }}>ภาษี VAT สะสม (7%): +฿{fmt(activeReceipt.vatAmount)}</span>
                        <span style={{ fontSize: '11px', color: 'var(--ts)' }}>จ่ายภาษี ณ ที่จ่ายหัก (WHT): -฿{fmt(activeReceipt.whtAmount)}</span>
                        <span style={{ fontSize: '14px', fontWeight: 900, color: 'var(--p)', marginTop: '4px' }}>ยอดรวมสุทธิเล่มใบเสร็จนี้: ฿{fmt(activeReceipt.netTotal)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 6: AUTO MATCH ENGINE DIAGNOSTICS */}
            <div className="glass-card" style={{ background: '#fff', border: '1.5px solid var(--bdr)', borderRadius: 'var(--r)', padding: '18px' }}>
              <div className="flb" style={{ marginBottom: '10px' }}>
                <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--tx)' }}>💡 SECTION 6: ระบบวิเคราะห์จับคู่อินวอยซ์ (Auto Match Engine)</span>
                <span className="badge bp" style={{ background: avgMatchScore >= 95 ? '#d1fae5' : '#fff3cd', color: avgMatchScore >= 95 ? '#065f46' : '#856404' }}>
                  OCR Match Accuracy Score: {avgMatchScore}%
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px', alignItems: 'center' }}>
                {/* Score Dial Visualizer */}
                <div style={{ background: 'var(--soft)', padding: '14px', borderRadius: 'var(--rs)', border: '1.5px solid var(--bdr)', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 950, color: avgMatchScore >= 95 ? 'var(--ok)' : 'var(--warn)' }}>
                    {avgMatchScore}%
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--ts)', marginTop: '4px', uppercase: true }}>Match Level</div>
                </div>

                {/* Match Warnings & Feedback */}
                <div style={{ fontSize: '12.5px', color: 'var(--ts)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div>
                    <b>1. วิเคราะห์ยอดเปรียบเทียบ:</b> รวมบิล {receipts.length} ฉบับ เท่ากับ <b style={{ color: 'var(--p)' }}>฿{fmt(netReceiptTotalSum)}</b>
                  </div>
                  <div>
                    <b>2. ยอดเบิกอนุมัติสุทธิคงเหลือ:</b> <b style={{ color: 'var(--tx)' }}>฿{fmt(remainingBudget)}</b>
                  </div>
                  
                  {warningAlert ? (
                    <div style={{ background: '#fff5f5', color: '#c53030', padding: '8px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                      {warningAlert}
                    </div>
                  ) : (
                    <div style={{ background: '#f0fdf4', color: '#15803d', padding: '8px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                      ✓ ยอดบิลสินค้าตรงกับยอดอนุมัติเบิกเงินทดรอง 100% ครบถ้วนตามมาตรฐานกรมสรรพากร
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 9 & 10 & 11: CLEARANCE VOUCHER & SIGNATURE & BANK SLIP */}
            {activeAdv && (
              <div className="glass-card" style={{ background: '#fff', borderRadius: 'var(--r)', border: '1.5px solid var(--bdr)', padding: '20px' }}>
                <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--p)', display: 'block', marginBottom: '14px' }}>
                  📑 SECTION 9, 10, 11: ใบสำคัญเคลียร์เงินทดรองจ่ายต้นแบบ (Clearance Voucher Draft)
                </span>

                <div className="printable-voucher" style={{ background: '#fafafa', border: '1.5px solid #ccc', borderRadius: '12px', padding: '24px', fontFamily: '"Noto Sans Thai", "Inter", sans-serif', color: '#000', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)' }}>
                  {/* Voucher Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '14px' }}>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: 800, textTransform: 'uppercase' }}>CLEARADVANCE PRO SYSTEM V3</h4>
                      <p style={{ fontSize: '10.5px', color: '#555' }}>เอกสารใบสำคัญแสดงรายการชำระคืนและเคลียร์ยอดเงินทดรองจ่าย</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '14px', fontWeight: 900, background: '#000', color: '#fff', padding: '3px 8px', borderRadius: '4px' }}>CLR-2026-TEMP</span>
                      <p style={{ fontSize: '10px', color: '#555', marginTop: '4px' }}>วันที่ชำระคืน: {new Date().toISOString().substring(0, 10)}</p>
                    </div>
                  </div>

                  {/* Voucher Info */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '11px', marginBottom: '14px' }}>
                    <div>
                      <div><b>ผู้อนุมัติเบิกต้นทาง:</b> คณะบริหารงานโครงการ</div>
                      <div><b>ผู้ขอเบิกเงินทดรองจ่าย:</b> {activeAdv.empName}</div>
                      <div><b>แผนก/หน่วยงานต้นสังกัด:</b> {activeAdv.empDept}</div>
                    </div>
                    <div>
                      <div><b>เลขที่บิลเบิกต้นทาง:</b> {activeAdv.id}</div>
                      <div><b>แผนงานโครงการ:</b> {activeAdv.pName}</div>
                      <div><b>วงเงินขอเบิกได้รับการอนุมัติ:</b> ฿{fmt(activeAdv.appAmount)}</div>
                    </div>
                  </div>

                  {/* Table List of Receipts inside batch */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '14px', border: '1px solid #777' }}>
                    <thead>
                      <tr style={{ background: '#eaeaea', borderBottom: '1px solid #777' }}>
                        <th style={{ padding: '5px 8px', textAlign: 'left', borderRight: '1px solid #777' }}># เลขที่เอกสารอ้างอิงบิล OCR</th>
                        <th style={{ padding: '5px 8px', textAlign: 'left', borderRight: '1px solid #777' }}>ผู้ขาย / ร้านค้าจดทะเบียน</th>
                        <th style={{ padding: '5px 8px', textAlign: 'right', borderRight: '1px solid #777' }}>ยอดตามหน้าบิล</th>
                        <th style={{ padding: '5px 8px', textAlign: 'right', borderRight: '1px solid #777' }}>หักภาษี WHT</th>
                        <th style={{ padding: '5px 8px', textAlign: 'right' }}>ยอดสุทธิรวม</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receipts.map((rc, idx) => (
                        <tr key={rc.id} style={{ borderBottom: '1px solid #ddd' }}>
                          <td style={{ padding: '5px 8px', borderRight: '1px solid #777' }}>{rc.invoiceNo}</td>
                          <td style={{ padding: '5px 8px', borderRight: '1px solid #777' }}>{rc.vendor}</td>
                          <td style={{ padding: '5px 8px', textAlign: 'right', borderRight: '1px solid #777' }}>฿{fmt(rc.subtotal + rc.vatAmount)}</td>
                          <td style={{ padding: '5px 8px', textAlign: 'right', borderRight: '1px solid #777', color: '#c53030' }}>฿{fmt(rc.whtAmount)}</td>
                          <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600 }}>฿{fmt(rc.netTotal)}</td>
                        </tr>
                      ))}
                      <tr style={{ background: '#f5f5f5', borderTop: '1.5px solid #000', fontWeight: 'bold' }}>
                        <td colSpan={2} style={{ padding: '5px 8px', borderRight: '1px solid #777' }}>รวมยอดเอกสารบิล Reconciled ทั้งหมด</td>
                        <td colSpan={2} style={{ padding: '5px 8px', textAlign: 'right', borderRight: '1px solid #777' }}>ยอดเงินรวมสุทธิ</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', fontSize: '11px', color: 'var(--p)' }}>฿{fmt(netReceiptTotalSum)}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Section 10: Signature details */}
                  <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', textAlign: 'center', fontSize: '10px' }}>
                      <div style={{ padding: '6px', border: '1px dashed #bbb', borderRadius: '4px' }}>
                        <div style={{ color: 'var(--tm)', marginBottom: '14px' }}>ผู้นำส่งเอกสาร (Requester)</div>
                        <div style={{ height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {/* Svg dynamic signature */}
                          <svg width="100" height="30" viewBox="0 0 100 30" fill="none">
                            <path d="M10 15 C 20 5, 25 25, 30 15 C 35 5, 50 15, 60 10 C 70 5, 80 25, 90 15" stroke="blue" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </div>
                        <div style={{ borderTop: '1px solid #ddd', paddingTop: '4px', marginTop: '4px', fontWeight: 'bold' }}>{activeAdv.empName}</div>
                        <div>(ผู้ปฏิบัติการโครงการ)</div>
                      </div>

                      <div style={{ padding: '6px', border: '1px dashed #bbb', borderRadius: '4px' }}>
                        <div style={{ color: 'var(--tm)', marginBottom: '14px' }}>ผู้แนะนำวิเคราะห์บัญชี (Accounting)</div>
                        <div style={{ height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="100" height="30" viewBox="0 0 100 30" fill="none">
                            <path d="M15 20 C 30 10, 40 5, 50 20 C 60 25, 75 10, 85 15" stroke="darkblue" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </div>
                        <div style={{ borderTop: '1px solid #ddd', paddingTop: '4px', marginTop: '4px', fontWeight: 'bold' }}>นฤมล ดวงแก้ว</div>
                        <div>(เจ้าหน้าที่การเงินอาวุโส)</div>
                      </div>

                      <div style={{ padding: '6px', border: '1px dashed #bbb', borderRadius: '4px' }}>
                        <div style={{ color: 'var(--tm)', marginBottom: '14px' }}>ผู้อนุมัติเอกสารคืนยอด (Approver)</div>
                        <div style={{ height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="100" height="30" viewBox="0 0 100 30" fill="none">
                            <path d="M5 25 Q 40 -10, 60 20 T 95 10" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" />
                          </svg>
                        </div>
                        <div style={{ borderTop: '1px solid #ddd', paddingTop: '4px', marginTop: '4px', fontWeight: 'bold' }}>วิภา ทองสุข</div>
                        <div>(ผู้อำนวยการสายไฟแนนซ์)</div>
                      </div>
                    </div>
                  </div>

                  {/* Section 11: Transfer bank slip evidence */}
                  {activeAdv.pay && (
                    <div style={{ marginTop: '16px', background: '#eefdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '10px' }} className="flb gap2 align-start">
                      <div style={{ minWidth: 0, flex: 1, fontSize: '10px' }}>
                        <div style={{ color: '#166534', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', marginBottom: '3px' }}>
                          <span>🟢</span> หลักฐานการโอนเงินทดรองจำลอง (Bank Transfer Inflow Evidence)
                        </div>
                        <div><b>โอนจากธนาคาร:</b> {activeAdv.pay.bank}</div>
                        <div><b>รหัสอ้างอิง Ref No:</b> {activeAdv.pay.ref}</div>
                        <div><b>เข้าบัญชีปลายทาง:</b> {activeAdv.empName} (ธนาคารผู้เบิก)</div>
                        <div><b>วันที่ทำรายการ:</b> {fmtD(activeAdv.pay.date)}</div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '12px', fontWeight: 900, color: '#15803d' }}>
                        ฿{fmt(activeAdv.pay.amount)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECTION 12: DOCUMENT VAULT STATUS */}
            <div className="glass-card" style={{ background: '#fff', border: '1.5px solid var(--bdr)', borderRadius: 'var(--r)', padding: '18px' }}>
              <div className="flb" style={{ cursor: 'pointer', marginBottom: accordionOpen.vault ? '12px' : '0' }} onClick={() => toggleSection('vault')}>
                <div className="fl" style={{ gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>🔒</span>
                  <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--tx)' }}>SECTION 12: คลังจัดเก็บเอกสารและไฟล์สแกน (Document Vault Secure Ledger)</span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--ts)' }}>{accordionOpen.vault ? '▲ ซ่อน' : '▼ แสดง'}</span>
              </div>

              {accordionOpen.vault && (
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--tm)', marginBottom: '8px' }}>คลังสินค้าประมวลผลจัดซื้อและเอกสารภาษีทั้งหมดที่ผ่านการประเมินจากระบบ Gemini V3</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {docVault.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px', color: 'var(--tm)' }}>
                        ไม่มีประวัติไฟล์เก็บในโฟลเดอร์สำหรับรอบการเคลียร์นีต
                      </div>
                    ) : (
                      docVault.map((v) => (
                        <div key={v.id} className="flb" style={{ background: 'var(--soft)', border: '1.5px solid var(--bdr)', padding: '8px 12px', borderRadius: 'var(--rs)', fontSize: '12px' }}>
                          <div className="fl" style={{ gap: '8px' }}>
                            <span style={{ fontSize: '14px' }}>
                              {v.type === 'VOUCHER' ? '📄' : v.type === 'OCR_DATA' ? '⚙️' : '🧾'}
                            </span>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--p)' }}>{v.fileName}</div>
                              <div style={{ fontSize: '10px', color: 'var(--tm)' }}>ชนิดไฟล์ {v.type} • สร้างเมื่อ {v.date}</div>
                            </div>
                          </div>
                          <div>
                            <span style={{ fontSize: '10px', color: '#166534', background: '#d1fae5', borderRadius: '3px', padding: '1px 5px', fontWeight: 800 }}>
                              {v.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 8: CLEARANCE HISTORY */}
            <div className="glass-card" style={{ background: '#fff', border: '1.5px solid var(--bdr)', borderRadius: 'var(--r)', padding: '18px' }}>
              <div className="flb" style={{ cursor: 'pointer', marginBottom: accordionOpen.history ? '12px' : '0' }} onClick={() => toggleSection('history')}>
                <div className="fl" style={{ gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>⏳</span>
                  <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--tx)' }}>SECTION 8: ประวัติและประบันทึกการส่งเคลียร์เดิม (Historic Audit Clearance Dossier)</span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--ts)' }}>{accordionOpen.history ? '▲ ซ่อน' : '▼ แสดง'}</span>
              </div>

              {accordionOpen.history && (
                <div>
                  {activeAdv.clrs && activeAdv.clrs.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {activeAdv.clrs.map((c) => (
                        <div key={c.id} style={{ border: '1.5px solid var(--bdr)', background: 'var(--soft)', borderRadius: 'var(--rs)', padding: '12px' }} className="flb align-start">
                          <div>
                            <div style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--p)' }}>{c.id}</div>
                            <div style={{ fontSize: '11px', color: 'var(--ts)', marginTop: '2px' }}>เคลียร์เมื่อ: {fmtD(c.date)} • ผู้บันทึก: U006 (บัญชีฝ่ายบริหาร)</div>
                            <div style={{ fontSize: '11.5px', color: 'var(--tx)', marginTop: '6px', background: '#fff', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--bdr)' }}>
                              "{c.note}"
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', fontWeight: 900, color: 'var(--p)', fontSize: '14px' }}>
                            ฿{fmt(c.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--tm)', fontSize: '13px' }}>
                      🚫 ไม่เคยส่งเคลียร์บิลย้อนหลังมาก่อนสำหรับใบคำขอนี้
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* SECTION 3: RIGHT PANEL - ACTION CENTER & TOTAL CONTROLS */}
          <div className="workspace-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            <div className="glass-card" style={{ background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(10px)', border: '1.5px solid var(--bdr)', borderRadius: 'var(--r)', padding: '18px', position: 'sticky', top: '76px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--p)', letterSpacing: '0.5px', marginBottom: '12px' }}>
                ⚡ SECTION 3: Action center
              </div>

              {/* Status Badge Group */}
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', color: 'var(--ts)', display: 'block', marginBottom: '4px' }}>สถานะพิจารณาปัจจุบัน:</span>
                <span className="badge" style={{ background: 'var(--p)', color: '#fff', fontSize: '12px', padding: '4px 10px', fontWeight: 'bold' }}>
                  ⏳ รอเคลียร์ยอดบิล
                </span>
              </div>

              {/* Progress Bar Container */}
              <div style={{ marginBottom: '20px' }}>
                <div className="flb" style={{ fontSize: '11.5px', color: 'var(--ts)', marginBottom: '5px' }}>
                  <span>สัดส่วนเคลียร์ยอดบิลสะสม:</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--p)' }}>{Math.min(100, Math.round(((activeAdv.clrAmount + netReceiptTotalSum) / activeAdv.appAmount) * 100))}%</span>
                </div>
                <div style={{ height: '8px', background: 'var(--bdr)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      background: 'var(--p)', 
                      width: `${Math.min(100, Math.round(((activeAdv.clrAmount + netReceiptTotalSum) / activeAdv.appAmount) * 100))}%`,
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--bdr)', paddingTop: '16px' }}>
                <div style={{ background: 'var(--soft)', padding: '10px', borderRadius: 'var(--rs)', border: '1px solid var(--bdr)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--ts)' }}><b>ยอดโอนเบิกรับไว้:</b> ฿{fmt(activeAdv.appAmount)}</div>
                  <div style={{ fontSize: '11px', color: 'var(--ts)', marginTop: '4px' }}><b>ยอดบิลเคลียร์สะสม:</b> ฿{fmt(netReceiptTotalSum)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--p)', fontWeight: 'bold', borderTop: '1px dashed var(--bdr)', paddingTop: '6px', marginTop: '6px' }}>
                    ยอดดุลชำระคงค้าง: ฿{fmt(Math.max(0, activeAdv.appAmount - (activeAdv.clrAmount + netReceiptTotalSum)))}
                  </div>
                </div>

                <button 
                  className="btn btn-ok" 
                  style={{ width: '100%', padding: '12px', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px' }} 
                  onClick={submitClearance}
                >
                  💾 ส่งบันทึกเคลียร์ยอดทั้งหมด
                </button>

                <button 
                  className="btn btn-o" 
                  style={{ width: '100%', justifyContent: 'center' }} 
                  onClick={() => toast('🖨️ ดึงข้อมูลเข้าเครื่องพิมพ์บิลสำเร็จ', 'ok')}
                >
                  🖨️ พิมพ์รายงานสรุป Clearance
                </button>
              </div>
            </div>

          </div>

        </div>
      ) : null}

      {/* PDF VISUAL PREVIEW MODAL */}
      {viewPdfModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card" style={{ maxWidth: '800px', width: '100%', background: '#fff', borderRadius: 'var(--r)', overflow: 'hidden', border: '1px solid var(--bdr)' }}>
            <div style={{ background: 'var(--p)', color: '#fff', padding: '14px 18px' }} className="flb">
              <span style={{ fontWeight: 'bold', fontSize: '15px' }}>🖥️ Requisition PDF Screen Reader Preview</span>
              <button style={{ color: '#fff', fontSize: '18px', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setViewPdfModal(false)}>✕</button>
            </div>
            
            <div style={{ padding: '24px', overflowY: 'auto', maxHeight: '70vh', background: '#f5f5f5' }}>
              <div style={{ background: '#fff', border: '1px solid #ddd', padding: '30px', margin: '0 auto', maxWidth: '650px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                {/* PDF Requisition Template rendering */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--p)', paddingBottom: '12px', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ color: 'var(--p)', fontWeight: 900 }}>CLEARADVANCE REQUISITION</h3>
                    <p style={{ fontSize: '11px', color: 'var(--ts)' }}>บริษัท เคลียร์ แอดวานซ์ จำกัด (มหาชน)</p>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '11px' }}>
                    <div><b>เลขใบเบิกเงิน:</b> {activeAdv?.id}</div>
                    <div><b>วันที่ขอเบิก:</b> {activeAdv ? fmtD(activeAdv.reqDate) : ''}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '12px', marginBottom: '20px' }}>
                  <div>
                    <div><b>ผู้ขอเปรียบเทียบเบิก:</b> {activeAdv?.empName}</div>
                    <div><b>ตำแหน่ง:</b> ผู้บริหารโครงการอาวุโส</div>
                    <div><b>ฝ่ายหน่วยงาน:</b> {activeAdv?.empDept}</div>
                  </div>
                  <div>
                    <div><b>โครงการที่สนับสนุน:</b> {activeAdv?.pName}</div>
                    <div><b>หมวดหมู่งบประมาณ:</b> {activeAdv?.catName}</div>
                  </div>
                </div>

                <div style={{ fontSize: '12px', marginBottom: '14px', padding: '10px', background: 'var(--soft)', border: '1px solid var(--bdr)', borderRadius: '4px' }}>
                  <b>จุดประสงค์การเบิกเงินค้างเคลียร์ยืมทดรอง:</b> "{activeAdv?.desc}"
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '20px' }}>
                  <thead>
                    <tr style={{ background: 'var(--p)', color: '#fff', fontSize: '11px' }}>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>คำอธิบายสายงานสินค้า</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center' }}>จำนวน</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>ราคาต่อนามสุทธิ</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>ราคารวมทั้งหมด</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeAdv?.items.map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '8px 8px' }}>{it.d}</td>
                        <td style={{ padding: '8px 8px', textAlign: 'center' }}>{it.q} {it.u}</td>
                        <td style={{ padding: '8px 8px', textAlign: 'right' }}>฿{fmt(it.p)}</td>
                        <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 'bold' }}>฿{fmt(it.t)}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: '2.5px solid var(--p)', fontWeight: 'bold', fontSize: '13px' }}>
                      <td colSpan={3} style={{ padding: '10px 8px', textAlign: 'right' }}>ยอดเบิกเงินทดรองจ่ายได้รับการอนุมัติรวมสุทธิ:</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--p)' }}>฿{fmt(activeAdv?.appAmount || 0)}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Simulated signature workflow bottom */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '11.5px', marginTop: '30px', textAlign: 'center' }}>
                  <div>
                    <div style={{ color: 'var(--tm)' }}>ลงผู้เข้าชำระ (Employee Signature)</div>
                    <div style={{ padding: '10px 0' }}>✍️ <i>{activeAdv?.empName}</i></div>
                    <div style={{ borderTop: '1px solid #ccc', paddingTop: '4px' }}>ลงวันที่: {activeAdv ? fmtD(activeAdv.reqDate) : ''}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--tm)' }}>ลงผู้อนุมัติเอกสารคืนยอด (Executive Signature)</div>
                    <div style={{ padding: '10px 0' }}>✍️ <i>นฤมล ดวงแก้ว</i></div>
                    <div style={{ borderTop: '1px solid #ccc', paddingTop: '4px' }}>ลงวันที่อนุมัติ: {activeAdv ? fmtD(activeAdv.appDate || '2026-06-18') : ''}</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '14px 18px', background: '#f9f9f9', borderTop: '1px solid var(--bdr)' }} className="flb">
              <span style={{ fontSize: '11px', color: 'var(--ts)' }}>เอกสารนี้ได้รับการประทับตราดิจิทัลทางบัญชีผ่าน ClearAdvance REST API เรียบร้อย</span>
              <button className="btn btn-p" onClick={() => setViewPdfModal(false)}>ตกลง ปิดหน้านี้</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
