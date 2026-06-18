import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Advance, Receipt, ReceiptItem, AuditLogItem, AccountingTransaction } from '../types';
import { fmt, fmtD, UserAvt } from '../lib/utils';
import { 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  AlertTriangle, 
  ShieldCheck, 
  ShieldQuestion, 
  FileText, 
  Download, 
  Printer, 
  Lock, 
  Unlock, 
  CheckSquare, 
  History, 
  Share2, 
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Award
} from 'lucide-react';

// Help helper for Thai status translations
const STATUS_TXT = {
  PENDING: 'รอตรวจสอบ',
  PARTIAL: 'ตรวจสอบบางส่วน',
  REJECTED_PARTIAL: 'ตีกลับบางส่วน',
  APPROVED: 'ตรวจสอบแล้ว',
  READY: 'พร้อมปิดยอด'
};

const STAT_COLORS = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-300',
  PARTIAL: 'bg-blue-100 text-blue-800 border-blue-300',
  REJECTED_PARTIAL: 'bg-rose-100 text-rose-800 border-rose-300',
  APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  READY: 'bg-teal-100 text-teal-800 border-teal-300'
};

export const AccountingReview = () => {
  const { advances, updateAdvance, toast } = useApp();

  // Local state for keeping track of global / intermediate review transactions
  const [transactions, setTransactions] = useState<AccountingTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('advposh_review_transactions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('advposh_review_transactions', JSON.stringify(transactions));
  }, [transactions]);

  // Find all advances with WAITING_CLEARANCE or CLR records
  const reviewableList = advances.filter(a => a.status === 'WAITING_CLEARANCE' || a.status === 'CLOSED');

  const [selectedAdvId, setSelectedAdvId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'adv' | 'slip' | 'clr' | 'attachments' | 'ocr' | 'audit'>('attachments');
  
  // Mobile support states
  const [isFullscreenDrawerOpen, setIsFullscreenDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync first item if not chosen yet
  useEffect(() => {
    if (!selectedAdvId && reviewableList.length > 0) {
      const pendingOne = reviewableList.find(a => a.status === 'WAITING_CLEARANCE') || reviewableList[0];
      setSelectedAdvId(pendingOne.id);
    }
  }, [reviewableList, selectedAdvId]);

  const activeAdv = advances.find(a => a.id === selectedAdvId);

  // Auto-seed receipts/files for pre-seeded waiting clearances (ADV-2026-001, ADV-2026-003, ADV-2026-004) so that
  // the page is immediately interactive and fully loaded on first mount!
  useEffect(() => {
    if (activeAdv && !activeAdv.receipts && activeAdv.status === 'WAITING_CLEARANCE') {
      const seededReceipts: Receipt[] = generateMockReceiptsForAdvance(activeAdv);
      updateAdvance(activeAdv.id, {
        receipts: seededReceipts,
        reviewStatus: 'PENDING',
        reviewAuditLogs: [
          {
            id: `LOG-SEED-${Date.now()}`,
            advId: activeAdv.id,
            action: 'INITIAL_LOAD',
            detail: 'ฝ่ายบัญชีเปิดเอกสารและเตรียมวิเคราะห์สอบทาน OCR ด้วยหลักคณิตศาสตร์ประกันภัย',
            user: 'วิภา ทองสุข (ฝ่ายบัญชี)',
            timestamp: new Date().toISOString()
          }
        ]
      });
    }
  }, [activeAdv, updateAdvance]);

  // UI state for selected attachment for detailed dialog review
  const [selectedReceiptId, setSelectedReceiptId] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [showOverrideModal, setShowOverrideModal] = useState<boolean>(false);
  const [rejectItemReason, setRejectItemReason] = useState<{ [itemId: string]: string }>({});

  // Active receipts list
  const clientReceipts: Receipt[] = activeAdv?.receipts || [];
  
  // Auto select active receipt
  useEffect(() => {
    if (clientReceipts.length > 0 && !selectedReceiptId) {
      setSelectedReceiptId(clientReceipts[0].id);
    }
  }, [clientReceipts, selectedReceiptId]);

  const selectedReceipt = clientReceipts.find(r => r.id === selectedReceiptId) || clientReceipts[0];

  // Helper log function to record actions to Audit logs
  const logAuditAction = (action: string, detail: string) => {
    if (!activeAdv) return;
    const newLog: AuditLogItem = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      advId: activeAdv.id,
      action,
      detail,
      user: 'วิภา ทองสุข (ฝ่ายบัญชี)',
      timestamp: new Date().toISOString()
    };
    const currentLogs = activeAdv.reviewAuditLogs || [];
    updateAdvance(activeAdv.id, {
      reviewAuditLogs: [newLog, ...currentLogs]
    });
  };

  // Math totals calculation
  const totalAdvance = activeAdv?.appAmount || 0;
  const transferAmount = activeAdv?.pay?.amount || 0;
  
  // Dynamic summation of approved, rejected and pending receipts
  const currentCleared = clientReceipts.reduce((sum, r) => sum + r.netTotal, 0);

  // Items analysis
  const allItems = clientReceipts.flatMap(rc => 
    rc.items.map(it => ({
      ...it,
      receiptId: rc.id,
      vendor: rc.vendor,
      taxId: rc.taxId,
      invoiceNo: rc.invoiceNo,
      date: rc.date,
      matchScore: rc.matchScore
    }))
  );

  const approvedItemsTotal = allItems
    .filter(it => it.status === 'APPROVED')
    .reduce((sum, it) => {
      const lineTotal = it.qty * it.price;
      const vat = it.vat ? lineTotal * (it.vat / 100) : 0;
      const wht = it.wht ? lineTotal * (it.wht / 100) : 0;
      return sum + lineTotal + vat - wht;
    }, 0);

  const rejectedItemsTotal = allItems
    .filter(it => it.status === 'REJECTED')
    .reduce((sum, it) => {
      const lineTotal = it.qty * it.price;
      const vat = it.vat ? lineTotal * (it.vat / 100) : 0;
      const wht = it.wht ? lineTotal * (it.wht / 100) : 0;
      return sum + lineTotal + vat - wht;
    }, 0);

  // Standard balance calculations
  // Approved Clearance = total items approved.
  // Rejected Amount = total items rejected.
  const approvedClearance = approvedItemsTotal;
  const rejectedAmount = rejectedItemsTotal;

  // Remaining Balance that employee still has to reconcile or closed if perfect match.
  // Remaining Balance = Total Transfer - Approved Clearance
  const remainingCalculated = Math.max(0, transferAmount - approvedClearance);

  // Settlement Cases: (Case 1, Case 2, Case 3) based on Approved clearance vs actual transferred advance
  let settlementCase: 1 | 2 | 3 = 1;
  let settlementMsg = '';
  let settlementAmount = 0;

  if (approvedClearance === transferAmount) {
    settlementCase = 1;
    settlementMsg = 'ยอดพอดี ปิดบัญชีได้';
    settlementAmount = 0;
  } else if (approvedClearance < transferAmount) {
    settlementCase = 2;
    settlementMsg = 'พนักงานต้องโอนคืนบริษัท (Amount to Return)';
    settlementAmount = transferAmount - approvedClearance;
  } else {
    settlementCase = 3;
    settlementMsg = 'บริษัทต้องจ่ายเงินคืนเพิ่มให้พนักงาน (Amount to Reimburse)';
    settlementAmount = approvedClearance - transferAmount;
  }

  // AI Trust Score generator based on OCR parameters & math accuracy
  const calculateTrustScore = (rc: Receipt): { score: number; text: string; badge: string } => {
    let base = rc.matchScore;

    // Check 1: Does Tax ID exist and valid (13 digits)?
    if (!rc.taxId || rc.taxId.replace(/\D/g, '').length !== 13) {
      base -= 10;
    }

    // Check 2: Invoice No existence
    if (!rc.invoiceNo) {
      base -= 8;
    }

    // Check 3: Date matches advance schedule?
    if (activeAdv) {
      const advDate = new Date(activeAdv.reqDate);
      const rcDate = new Date(rc.date);
      const daysDiff = Math.abs((rcDate.getTime() - advDate.getTime()) / (1000 * 3600 * 24));
      if (daysDiff > 45) {
        base -= 15; // suspicious date too far
      }
    }

    // Check 4: Check math alignment of subtotal & VAT
    rc.items.forEach(it => {
      const lineMathSum = it.qty * it.price;
      const vatExpected = it.vat ? Math.round(lineMathSum * (it.vat / 100)) : 0;
      const whtExpected = it.wht ? Math.round(lineMathSum * (it.wht / 100)) : 0;
      
      // if any item has issues
      if (it.qty <= 0 || it.price <= 0) {
        base -= 5;
      }
    });

    const score = Math.max(10, Math.min(100, base));
    if (score >= 90) {
      return { score, text: 'น่าเชื่อถือสูง', badge: 'bg-emerald-500 text-white' };
    } else if (score >= 70) {
      return { score, text: 'ควรตรวจเพิ่ม', badge: 'bg-amber-500 text-white' };
    } else {
      return { score, text: 'เสี่ยง / ต้องตรวจละเอียด', badge: 'bg-rose-500 text-white animate-pulse' };
    }
  };

  // ACTIONS: Individual Receipt File approval/reject
  const approveReceipt = (rcId: string) => {
    if (!activeAdv) return;
    
    const updatedReceipts = clientReceipts.map(rc => {
      if (rc.id === rcId) {
        return {
          ...rc,
          status: 'APPROVED' as const,
          items: rc.items.map(it => ({ ...it, status: 'APPROVED' as const }))
        };
      }
      return rc;
    });

    // Auto calculate overall review status
    const allDone = updatedReceipts.every(r => r.status !== 'PENDING');
    const anyRej = updatedReceipts.some(r => r.status === 'REJECTED');
    const overallStatus = allDone ? (anyRej ? 'REJECTED_PARTIAL' : 'APPROVED') : 'PARTIAL';

    updateAdvance(activeAdv.id, {
      receipts: updatedReceipts,
      reviewStatus: overallStatus as any
    });

    toast(`✅ อนุมัติเอกสารแนบใบเสร็จรหัส ${rcId} และอนุมัติไลน์สินค้าภายในทั้งหมดเรียบร้อย`, 'ok');
    logAuditAction('APPROVE_RECEIPT', `อนุมัติเอกสารแนบเลขที่ ${rcId} ครบทุกรายการสินค้า`);
  };

  const rejectReceipt = (rcId: string, reason: string) => {
    if (!activeAdv) return;

    if (!reason) {
      toast('⚠️ กรุณาระบุเหตุผลการตีกลับเอกสารแนบนี้', 'warn');
      return;
    }

    const updatedReceipts = clientReceipts.map(rc => {
      if (rc.id === rcId) {
        return {
          ...rc,
          status: 'REJECTED' as const,
          reason,
          items: rc.items.map(it => ({ ...it, status: 'REJECTED' as const, reason }))
        };
      }
      return rc;
    });

    const allDone = updatedReceipts.every(r => r.status !== 'PENDING');
    const overallStatus = allDone ? 'REJECTED_PARTIAL' : 'PARTIAL';

    updateAdvance(activeAdv.id, {
      receipts: updatedReceipts,
      reviewStatus: overallStatus as any
    });

    toast(`❌ ตีกลับเอกสารแนบ ${rcId} เนื่องจาก: ${reason}`, 'err');
    logAuditAction('REJECT_RECEIPT', `ตีกลับเอกสารแนบเลขที่ ${rcId} เนื่องจาก: ${reason}`);
  };

  // ITEM ACTIONS: Individual line-item approval or reject
  const approveLineItem = (rcId: string, itemId: string) => {
    if (!activeAdv) return;

    const updatedReceipts = clientReceipts.map(rc => {
      if (rc.id === rcId) {
        const updatedItems = rc.items.map(it => 
          it.id === itemId ? { ...it, status: 'APPROVED' as const, reason: undefined } : it
        );
        
        // Compute parent invoice status based on items
        const rawAllItemsApproved = updatedItems.every(i => i.status === 'APPROVED');
        const rawAnyRejected = updatedItems.some(i => i.status === 'REJECTED');
        const fileStatus = rawAllItemsApproved ? 'APPROVED' as const : (rawAnyRejected ? 'REJECTED' as const : 'PARTIAL' as const);

        return { ...rc, items: updatedItems, status: fileStatus };
      }
      return rc;
    });

    const allFilesChecked = updatedReceipts.every(r => r.status !== 'PENDING');
    const overallStatus = allFilesChecked ? (updatedReceipts.some(r => r.status === 'REJECTED' || r.status === 'PARTIAL') ? 'REJECTED_PARTIAL' : 'APPROVED') : 'PARTIAL';

    updateAdvance(activeAdv.id, {
      receipts: updatedReceipts,
      reviewStatus: overallStatus as any
    });

    toast('🎉 อนุมัติรายการสินค้าเสร็จสิ้น!', 'ok');
    const targetItem = allItems.find(i => i.id === itemId);
    logAuditAction('APPROVE_ITEM', `อนุมัติวัสดุ/บริการ: ${targetItem?.desc || 'สินค้า'} ยอด ฿${fmt(targetItem?.qty ? targetItem.qty * targetItem.price : 0)}`);
  };

  const rejectLineItem = (rcId: string, itemId: string, reason: string) => {
    if (!activeAdv) return;
    if (!reason) {
      toast('⚠️ กรุณากรอกเหตุผลการตีกลับรายการนี้', 'warn');
      return;
    }

    const updatedReceipts = clientReceipts.map(rc => {
      if (rc.id === rcId) {
        const updatedItems = rc.items.map(it => 
          it.id === itemId ? { ...it, status: 'REJECTED' as const, reason } : it
        );

        return { ...rc, items: updatedItems, status: 'REJECTED' as const };
      }
      return rc;
    });

    updateAdvance(activeAdv.id, {
      receipts: updatedReceipts,
      reviewStatus: 'REJECTED_PARTIAL'
    });

    toast('❌ ตีกลับรายการสินค้าบางส่วนแล้ว', 'err');
    const targetItem = allItems.find(i => i.id === itemId);
    logAuditAction('REJECT_ITEM', `ปฏิเสธวัสดุ/บริการ: ${targetItem?.desc || 'สินค้า'} เนื่องจาก: ${reason}`);
    
    // Clear temp state
    setRejectItemReason(prev => ({ ...prev, [itemId]: '' }));
  };

  // Request more evidence on a line item
  const requestMoreEvidence = (rcId: string, itemId: string, reason: string) => {
    if (!activeAdv) return;
    if (!reason) {
      toast('⚠️ กรุณาระบุรายละเอียดคำขอหลักฐานเพิ่มเติม', 'warn');
      return;
    }

    const updatedReceipts = clientReceipts.map(rc => {
      if (rc.id === rcId) {
        const updatedItems = rc.items.map(it => 
          it.id === itemId ? { ...it, status: 'MORE_EVIDENCE' as const, reason } : it
        );
        return { ...rc, items: updatedItems, status: 'MORE_EVIDENCE' as const };
      }
      return rc;
    });

    updateAdvance(activeAdv.id, {
      receipts: updatedReceipts,
      reviewStatus: 'PARTIAL'
    });

    toast('💡 ส่งบันทึกคำขอเอกสารประกอบเพิ่มเติมแก่พนักงานแล้ว', 'info');
    const targetItem = allItems.find(i => i.id === itemId);
    logAuditAction('REQUEST_EVIDENCE', `ขอหลักฐานเพิ่มสำหรับ: ${targetItem?.desc || 'สินค้า'} เนื่องจาก: ${reason}`);
    setRejectItemReason(prev => ({ ...prev, [itemId]: '' }));
  };

  // manual overwrite controller
  const handleManualOverride = () => {
    if (!activeAdv) return;
    if (!overrideReason) {
      toast('⚠️ กรุณาระบุมติ Override ของผู้ตรวจสอบอย่างเป็นลายลักษณ์อักษร', 'warn');
      return;
    }

    const overriddenReceipts = clientReceipts.map(rc => ({
      ...rc,
      status: 'APPROVED' as const,
      items: rc.items.map(it => ({ ...it, status: 'APPROVED' as const }))
    }));

    updateAdvance(activeAdv.id, {
      receipts: overriddenReceipts,
      reviewStatus: 'APPROVED',
      overrideReason: overrideReason
    });

    toast('🛡️ ดำเนินการ Manual Override และอนุมัติเอกสารแนบทุกฉบับเรียบร้อยแล้ว', 'ok');
    logAuditAction('MANUAL_OVERRIDE', `ทำรายการ MANUAL APPROVAL OVERRIDE มติแนบท้ายกระดาษ: ${overrideReason}`);
    setShowOverrideModal(false);
  };

  // Save Review Draft
  const saveReviewDraft = () => {
    if (!activeAdv) return;
    toast('💾 บันทึกแบบร่างการตรวจสอบฝ่ายบัญชีเสร็จสิ้น ระบบเก็บประวัติเข้า Local Engine', 'ok');
    logAuditAction('SAVE_DRAFT', 'บันทึกแบบร่างการสอบทานรายการ (Draft Review Saved)');
  };

  // Confirm Accounting Review
  const confirmAccountingReview = () => {
    if (!activeAdv) return;
    toast('⚡ สอบทานความถูกต้องเรียบร้อย กรุณากดปุ่ม "ตรวจสอบและปิดยอด" เพื่อลงบัญชีปิดสมุดรายวันขั้นเด็ดขาด', 'info');
    logAuditAction('CONFIRM_REVIEW', 'บัญชียืนยันการเคลียร์ยอดเอกสารสมบูรณ์ รอการกดปิดบัญชีครั้งสุดท้าย');
  };

  // CLOSE ACCOUNT (ลงมติปิดบัญชีขั้นสุดท้าย)
  const handleCloseAccount = () => {
    if (!activeAdv) return;

    // VALIDATION CHECKS
    const hasPendingItems = allItems.some(it => it.status === 'PENDING');
    if (hasPendingItems) {
      toast('❌ ไม่สามารถปิดยอดได้: เนื่องจากยังมีสินค้าบางรายการยังไม่ได้ทำรีวิวตรวจสอบ', 'err');
      return;
    }

    const hasRejectedMissingReason = allItems.some(it => it.status === 'REJECTED' && !it.reason);
    if (hasRejectedMissingReason) {
      toast('❌ ไม่สามารถปิดยอดได้: มีเอกสารที่ระบุ ตีกลับ (Reject) แต่ยังไม่ระบุฟิลด์เหตุผลประกอบ', 'err');
      return;
    }

    // Verify aggregate math (Approved + Rejected equals Cleared Sum)
    const itemsNetSum = allItems.reduce((sum, it) => {
      const line = it.qty * it.price;
      const v = it.vat ? line * (it.vat / 100) : 0;
      const w = it.wht ? line * (it.wht / 100) : 0;
      return sum + line + v - w;
    }, 0);

    const roundedMath = Math.round(itemsNetSum);
    const roundedCleared = Math.round(currentCleared);
    if (Math.abs(roundedMath - roundedCleared) > 5) {
      toast('❌ ยอดรวมผลคำนวณ Approved + Rejected ต้องสะท้อนความจริงสมบูรณ์ก่อนบันทึกปิดสมุดบัญชี', 'err');
      return;
    }

    // Check if any receipt has average ocr score below rate and manual override is not given
    const lowOcrNoOverride = clientReceipts.some(rc => rc.matchScore < 70) && !activeAdv.overrideReason;
    if (lowOcrNoOverride) {
      toast('❌ ความน่าเชื่อถือเอกสารภายนอกต่ำกว่าเกณฑ์ (70%) บัญชีต้องอนุมัติ Manual Override ในแผงควบคุมก่อน', 'warn');
      return;
    }

    // SUCCESS - ENTIRE CLOSE LOGIC FLOW
    logAuditAction('CLOSE_ACCOUNT', `ปิดยอดบัญชีสำเร็จ (Closed Account) ยอดอนุมัติ ฿${fmt(approvedClearance)} ยอดตีกลับ ฿${fmt(rejectedAmount)}`);

    // Create PDF Final Accounting Packet and register under fake Document Vault
    const reviewNo = `REV-2026-${activeAdv.id.split('-')[2]}`;
    const finalDocName = `FINAL-CLOSING-${activeAdv.id}.pdf`;
    const reviewDocName = `ACCOUNTING-REVIEW-${reviewNo}.pdf`;

    // 1. Map to central records Database representation: AccountingTransaction schema
    const newTransactions: AccountingTransaction[] = allItems.map(it => {
      const lineMathTotal = it.qty * it.price;
      const lineVatAmount = it.vat ? lineMathTotal * (it.vat / 100) : 0;
      const lineWhtAmount = it.wht ? lineMathTotal * (it.wht / 100) : 0;

      return {
        advNo: activeAdv.id,
        clrNo: activeAdv.clrs[0]?.id || `CLR-${activeAdv.id.split('-')[2]}`,
        employee: activeAdv.empName,
        project: activeAdv.pName,
        category: activeAdv.catName,
        vendor: it.vendor,
        taxId: it.taxId,
        docType: it.vat > 0 ? 'Tax Invoice' : 'Receipt',
        docNo: it.invoiceNo || 'N/A',
        docDate: it.date,
        desc: it.desc,
        qty: it.qty,
        unit: it.unit,
        price: it.price,
        lineTotal: lineMathTotal,
        subtotal: lineMathTotal,
        vatAmount: lineVatAmount,
        whtAmount: lineWhtAmount,
        netAmount: lineMathTotal + lineVatAmount - lineWhtAmount,
        approvedAmount: it.status === 'APPROVED' ? (lineMathTotal + lineVatAmount - lineWhtAmount) : 0,
        rejectedAmount: it.status === 'REJECTED' ? (lineMathTotal + lineVatAmount - lineWhtAmount) : 0,
        rejectReason: it.reason,
        transferBank: activeAdv.pay?.bank,
        transferAccountNo: 'N/A',
        transferAccountName: activeAdv.empName,
        transferDate: activeAdv.pay?.date,
        transferTime: activeAdv.pay?.ref,
        transferRef: activeAdv.pay?.ref,
        ocrScore: it.matchScore,
        aiTrustScore: it.matchScore
      };
    });

    setTransactions(prev => [...newTransactions, ...prev]);

    // Save into Document Vault simulations inside localStorage
    try {
      const keyDocs = 'advposh_vault_docs';
      const existingDocs = JSON.parse(localStorage.getItem(keyDocs) || '[]');
      const newD1 = { id: `VF-${Date.now()}-A`, advId: activeAdv.id, clrId: reviewNo, date: '2026-06-18', type: 'ACCOUNTING_PACKET', fileName: finalDocName, status: 'Booked' };
      const newD2 = { id: `VF-${Date.now()}-B`, advId: activeAdv.id, clrId: reviewNo, date: '2026-06-18', type: 'AUDIT_REVIEW', fileName: reviewDocName, status: 'Archived' };
      localStorage.setItem(keyDocs, JSON.stringify([newD1, newD2, ...existingDocs]));
    } catch (e) {
      console.warn('Vault storage update skipped');
    }

    // 2. Perform global model update to status CLOSED
    updateAdvance(activeAdv.id, {
      status: 'CLOSED',
      clrAmount: approvedClearance,
      reviewStatus: 'READY'
    });

    toast(`🎉 ปิดสมุดปิดยอดบัญชีสมานเอกสารสำหรับชุดกองเบิก ${activeAdv.id} รหัสเสร็จสมบูรณ์แบบบัญชีคู่สากลเรียบร้อย!`, 'ok');
  };

  // Preview / print fake handler
  const printAction = () => {
    toast('🖨️ เชื่อมต่อเซสชั่นเครื่องพิมพ์ความละเอียดสูงพิมพ์สำเนาคู่มือการปิดเงินยืมสำรอง...', 'info');
  };

  return (
    <div className="accounting-review-workspace p-4 max-w-[1600px] mx-auto min-h-screen font-sans bg-slate-50 text-slate-900">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-teal-800 text-white p-6 rounded-2xl shadow-md mb-6 border-b-4 border-emerald-500">
        <div>
          <div className="flex items-center gap-3">
            <CheckSquare className="text-emerald-400 w-8 h-8" />
            <h1 className="text-2xl font-bold tracking-tight">Accounting Review Center</h1>
          </div>
          <p className="text-emerald-100 text-xs mt-1 font-medium select-none">
            ศูนย์ตรวจสอบเอกสารคัดกรองใบเคลียร์เงินทดรองและสอบทานภาษี (VAT/WHT) ก่อนปิดงบสมุดบัญชีรายวัน
          </p>
        </div>
        
        <div className="flex gap-2 mt-4 md:mt-0">
          <button onClick={printAction} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-teal-900 hover:bg-teal-950 rounded-lg border border-teal-700 transition">
            <Printer size={14} /> พิมพ์รายงาน
          </button>
          <button onClick={saveReviewDraft} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 rounded-lg transition">
            บันทึกร่างแบบตรวจสอบ
          </button>
        </div>
      </div>

      {/* THREE PANEL GRID LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* LEFT PANEL: 35% on Desktop (col-span-4) */}
        <div className="md:col-span-4 flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h2 className="text-sm font-bold text-slate-700 flex items-center justify-between mb-3 border-b pb-2">
              <span>📂 รายการเคลียร์ รอตรวจสอบบัญชี</span>
              <span className="text-xs font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                {reviewableList.length} งาน
              </span>
            </h2>

            {/* QUICK FILTER INFO */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {reviewableList.map(a => {
                const isActive = a.id === selectedAdvId;
                const isOverdue = a.dueDate && new Date(a.dueDate) < new Date('2026-06-17');
                const badgeStyle = STAT_COLORS[a.reviewStatus || 'PENDING'];
                const badgeTxt = STATUS_TXT[a.reviewStatus || 'PENDING'];

                return (
                  <div 
                    key={a.id}
                    onClick={() => {
                      setSelectedAdvId(a.id);
                      setSelectedReceiptId('');
                    }}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isActive 
                        ? 'bg-teal-50/75 border-teal-600 shadow-sm' 
                        : 'bg-white border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-sm font-bold text-slate-800 font-mono block">
                          CLR-{"2026"}-{a.id.split('-')[2]}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          อิงใบเบิก: {a.id}
                        </span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded border ${badgeStyle} font-semibold shadow-sm`}>
                        {badgeTxt}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 mb-2 space-y-1">
                      <div className="flex justify-between">
                        <span>ผู้รับเงินยืม:</span> 
                        <strong className="text-slate-800">{a.empName}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>โครงการสังกัด:</span>
                        <strong className="text-slate-800 max-w-[150px] truncate">{a.pName}</strong>
                      </div>
                      <div className="flex justify-between font-semibold mt-1">
                        <span>ยอดเคลียร์ยื่น:</span>
                        <span className="text-teal-700">฿{fmt(a.pay?.amount || a.amount)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-slate-50 px-2 py-1.5 rounded text-[10px] text-slate-500 font-mono border border-slate-100 mt-2">
                      <span className="flex items-center gap-1">
                        📄 แนบ {a.receipts?.length || a.files?.length || 1} ฉบับ
                      </span>
                      {isOverdue && (
                        <span className="text-rose-600 bg-rose-50 border border-rose-100 px-1 rounded font-bold">
                          ⚠ เกินกำหนดเคลียร์
                        </span>
                      )}
                      <span>
                        OCR Score: {a.receipts?.[0]?.matchScore || 100}%
                      </span>
                    </div>
                  </div>
                );
              })}

              {reviewableList.length === 0 && (
                <div className="text-center py-10 bg-slate-50 rounded-lg text-slate-400 text-xs">
                  ไม่มีใบคำขอเบิกเคลียร์สะสมค้างตรวจในฐานข้อมูล
                </div>
              )}
            </div>
          </div>

          {/* AI CHECKPOINT CORNER */}
          {activeAdv && (
            <div className="bg-gradient-to-br from-teal-900 to-slate-900 text-white rounded-xl shadow-md p-4 border border-teal-700">
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 mb-2 flex items-center gap-1">
                <Award size={14} /> AI Document Matcher Analysis
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-emerald-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-mono font-bold text-emerald-400">
                      {selectedReceipt ? calculateTrustScore(selectedReceipt).score : 90}%
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-100 flex items-center gap-1">
                      คะแนนความเชื่อถือเอกสารหลักฐาน
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${selectedReceipt?.status === 'REJECTED' ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase mt-1 inline-block ${selectedReceipt ? calculateTrustScore(selectedReceipt).badge : 'bg-slate-700'}`}>
                      {selectedReceipt ? calculateTrustScore(selectedReceipt).text : 'น่าเชื่อถือสูง'}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700 text-[11px] leading-relaxed text-slate-200">
                  <strong className="text-emerald-400 block mb-1">🔍 สรุปการตรวจสอบด่วน (Gemini Insights):</strong>
                  {selectedReceipt?.aiFeedback || (
                    `1. สลีปธนาคารและใบรับเงินมีจำนวนยอดรวมและตราประทับตรงตามเกณฑ์ 100% สอดคล้องกันสมบูรณ์ \n` +
                    `2. มีการคำนวณ VAT 7% เพิ่มเติมในไลน์วัสดุก่อสร้าง ถูกต้องตามหลักภาษีสรรพากร \n` +
                    `3. ข้อมูลผู้ขายและ Tax ID สอดคล้องกับทะเบียนคู่ค้าเชิงพาณิชย์ของบริษัทเรียบร้อย`
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CENTER PANEL: 45% on Desktop (col-span-5) */}
        <div className="md:col-span-5 flex flex-col gap-4 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between border-b pb-2 mb-2">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <FileText className="text-teal-600" size={16} /> Document Review Workspace
            </h2>
            <div className="flex gap-1">
              {(['attachments', 'adv', 'clr', 'slip', 'ocr', 'audit'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2 py-1 text-[11px] font-bold rounded capitalize border transition-all ${
                    activeTab === tab
                      ? 'bg-teal-700 text-white border-teal-700'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                  }`}
                >
                  {tab === 'adv' && 'ใบเบิก ADV'}
                  {tab === 'slip' && 'สลิปโอน'}
                  {tab === 'clr' && 'ใบเคลียร์ CLR'}
                  {tab === 'attachments' && 'เอกสารแนบ'}
                  {tab === 'ocr' && 'OCR Realtime'}
                  {tab === 'audit' && 'Audit Trail'}
                </button>
              ))}
            </div>
          </div>

          {/* TAB 1: ADV DOCUMENT CONTAINER */}
          {activeTab === 'adv' && activeAdv && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg text-slate-700">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold text-slate-800">📄 ใบขออนุมัติเบิกเงินทดรองจ่าย (ADV-VOUCHER)</h3>
                  <div className="flex gap-1.5">
                    <button onClick={printAction} className="p-1 text-slate-500 hover:text-slate-800 border bg-white rounded"><Printer size={13} /></button>
                    <a href="#" className="p-1 text-slate-500 hover:text-slate-800 border bg-white rounded"><Download size={13} /></a>
                  </div>
                </div>

                <div className="border-4 border-double border-slate-300 p-4 bg-white font-mono text-[11px] leading-relaxed relative">
                  <div className="absolute right-4 top-4 text-xs font-bold text-teal-800 border border-teal-500 px-2 py-1 transform rotate-6">
                    APPROVED
                  </div>
                  <div className="text-center font-bold text-sm mb-4">ใบขออนุมัติเบิกเงินจ่ายทดรองต้นฉบับ</div>
                  <p><strong>เลขที่ใบเสนอเบิก:</strong> {activeAdv.id}</p>
                  <p><strong>ผู้จัดทำ:</strong> {activeAdv.empName} ({activeAdv.empDept})</p>
                  <p><strong>โครงการอ้างอิง:</strong> {activeAdv.pName}</p>
                  <p><strong>วันที่ขอเงิน:</strong> {activeAdv.reqDate}</p>
                  <p><strong>วัตถุประสงค์สำแดง:</strong> {activeAdv.desc}</p>
                  <p><strong>วงเงินขอยื่น:</strong> ฿{fmt(activeAdv.amount)}</p>
                  <p><strong>วงเงินที่ได้รับการอนุมัติ:</strong> ฿{fmt(activeAdv.appAmount)}</p>
                  <p><strong>ผู้อนุมัติ:</strong> นฤมล ดวงแก้ว (ผู้บริหาร)</p>
                  <div className="mt-4 border-t pt-2 text-[10px] text-slate-400">
                    * พิมพ์แบบสำเนาความปลอดภัยอิเล็กทรอนิกส์
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRANSFER SLIP CONTAINER */}
          {activeTab === 'slip' && activeAdv && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold text-slate-800">📷 สลิปหลักฐานการโอนเงินกองคลังบริษัท (Cashier Transfer Receipt)</h3>
                <span className="text-[10px] bg-emerald-500 text-white font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                  สลีปสแกนสมบูรณ์
                </span>
              </div>

              {activeAdv.pay ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-800 rounded-lg p-2 flex items-center justify-center border-2 border-slate-300 min-h-[220px]">
                    {/* Simulated Mobile Net Bank Slippy design */}
                    <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white w-48 rounded-xl p-3 border-r-4 border-white shadow-lg text-[10px]">
                      <div className="flex justify-between items-center font-bold pb-2 border-b border-white/20 mb-3">
                        <span>{activeAdv.pay.bank} Easy App</span>
                        <span>โอนสำเร็จ</span>
                      </div>
                      <div className="text-center mb-3">
                        <div className="text-slate-300 text-[8px]">จำนวนเงินรวมทั้งสิ้น</div>
                        <div className="text-base font-bold">฿{fmt(activeAdv.pay.amount)}</div>
                      </div>
                      <p className="text-slate-300">จาก: บจก. แอดวานซ์ พอช มีเดีย</p>
                      <p className="text-slate-300">ถึง: {activeAdv.empName}</p>
                      <p className="text-slate-300 mt-2">วันที่โอน: {activeAdv.pay.date}</p>
                      <p className="text-slate-300">Ref: {activeAdv.pay.ref}</p>
                    </div>
                  </div>

                  <div className="space-y-1 bg-slate-50 p-3 rounded-lg text-xs leading-relaxed">
                    <strong className="text-slate-700 border-b pb-1 mb-2 block">📋 ข้อมูลสอบสวนสแกนสลีป (OCR Extract):</strong>
                    <p><strong>ธนาคารคลังพาร์ทเนอร์:</strong> {activeAdv.pay.bank}</p>
                    <p><strong>ชื่อผู้รับสลีปปลายทาง:</strong> {activeAdv.empName}</p>
                    <p><strong>เลขบัญชีบริษัทอ้างอิง:</strong> xxx-x-x1420-x</p>
                    <p><strong>ยอดเงินส่งโอน:</strong> ฿{fmt(activeAdv.pay.amount)}</p>
                    <p><strong>หมายเลข Ref. Transaction:</strong> {activeAdv.pay.ref}</p>
                    <p><strong>วันที่ทรานแซกชั่น:</strong> {activeAdv.pay.date}</p>
                    <div className="mt-3 p-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-[10px] font-medium">
                      ✓ AI ทำการตรวจสอบรหัสสลีป Ref ยืนยันว่า ยอดตรงสมบูรณ์ตามรายการกสิกรรม
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-50 text-slate-400 text-xs rounded">
                  ไม่มีหลักฐานการโอนเงินจ่ายสำรองสำหรับใบงานนี้
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CLR DOCUMENT CONTAINER */}
          {activeTab === 'clr' && activeAdv && (
            <div className="space-y-4">
              <div className="bg-slate-50 border p-4 rounded-lg text-slate-700 leading-relaxed font-mono text-[11px]">
                <h3 className="text-xs font-bold text-slate-800 mb-3 border-b pb-1 font-sans">📄 ใบเคลียร์เงินยืมทดรองจ่าย (CLEARANCE RECONCILIATION SHEET)</h3>
                
                <p><strong>รหัสทำเคลียร์ยอด:</strong> CLR-2026-{activeAdv.id.split('-')[2]}</p>
                <p><strong>อ้างอิงใบยืมต้นทาง:</strong> {activeAdv.id}</p>
                <p><strong>ผู้ยื่นสำแดง:</strong> {activeAdv.empName}</p>
                <p><strong>วันที่ยื่นเอกสาร:</strong> 18 มิ.ย. 22066 (2026)</p>
                <p><strong>ยอดส่งยื่นเคลียร์รวม:</strong> <span className="font-bold text-teal-800">฿{fmt(currentCleared)}</span></p>

                <table className="w-full text-[10px] mt-4 border-collapse">
                  <thead>
                    <tr className="bg-slate-200 text-slate-800">
                      <th className="p-1 border text-left">รายการสินค้า</th>
                      <th className="p-1 border text-right">จำนวน</th>
                      <th className="p-1 border text-right">ราคาพอร์ท</th>
                      <th className="p-1 border text-right">สุทธิ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allItems.map((it, idx) => (
                      <tr key={idx} className="bg-white">
                        <td className="p-1 border">{it.desc}</td>
                        <td className="p-1 border text-right">{it.qty} {it.unit}</td>
                        <td className="p-1 border text-right">฿{fmt(it.price)}</td>
                        <td className="p-1 border text-right text-slate-800 font-bold">฿{fmt(it.qty * it.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Simulated Digital e-Signature Block */}
                <div className="mt-6 flex justify-end">
                  <div className="text-center border border-dashed border-slate-300 p-2 rounded bg-white w-48 text-[9px]">
                    <div className="text-emerald-700 font-bold">✓ e-Signature Validated</div>
                    <div className="font-bold text-slate-800 mt-1">{activeAdv.empName}</div>
                    <div className="text-slate-400">IP: 192.168.1.144 | SHA256 Secure</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ATTACHMENTS (PRIMARY REVIEW FLOW) */}
          {activeTab === 'attachments' && activeAdv && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-2 rounded-lg flex gap-1.5 overflow-x-auto">
                {clientReceipts.map(rc => (
                  <button
                    key={rc.id}
                    onClick={() => setSelectedReceiptId(rc.id)}
                    className={`px-3 py-1.5 text-xs rounded border flex shadow-sm items-center gap-1 flex-shrink-0 transition ${
                      selectedReceiptId === rc.id
                        ? 'bg-emerald-700 text-white border-emerald-700 font-bold'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    📃 {rc.vendor}
                    {rc.status === 'APPROVED' && <CheckCircle2 className="text-emerald-400" size={12} />}
                    {rc.status === 'REJECTED' && <XCircle className="text-rose-400" size={12} />}
                  </button>
                ))}
              </div>

              {selectedReceipt ? (
                <div className="border border-slate-200 rounded-lg p-3 space-y-3 bg-slate-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{selectedReceipt.vendor}</h4>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Tax ID: {selectedReceipt.taxId} | Doc No: {selectedReceipt.invoiceNo || 'N/A'}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-teal-800 font-mono">
                        ฿{fmt(selectedReceipt.netTotal)}
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        VAT 7%: ฿{fmt(selectedReceipt.vatAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Simulated Receipt Preview graphic */}
                  <div className="bg-white border p-4 rounded text-center relative max-h-[180px] overflow-hidden flex flex-col justify-center items-center shadow-inner">
                    <span className="text-slate-300 text-3xl block">🧾</span>
                    <strong className="text-slate-800 text-xs font-mono">{selectedReceipt.fileName || 'SCG_Receipt_Cement_Steel.pdf'}</strong>
                    <span className="text-[10px] text-slate-400 mt-1">ใบกำกับภาษีเต็มรูปพร้อมประทับใบสำคัญรับเงินสำนักงานสรรพากร</span>
                    <div className="flex gap-1.5 mt-2">
                      <button onClick={printAction} className="flex items-center gap-1 px-2 py-1 text-[9px] bg-slate-100 hover:bg-slate-200 border rounded font-bold">
                        <Download size={10} /> Preview
                      </button>
                    </div>
                  </div>

                  {/* AI & INDIVIDUAL DECISION SLIDER FOR ATTACHMENT */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span>สถานะพิจารณาเอกสารฉบับนี้:</span>
                      <strong className={`font-semibold ${
                        selectedReceipt.status === 'APPROVED' ? 'text-emerald-700' :
                        selectedReceipt.status === 'REJECTED' ? 'text-rose-600' : 'text-amber-600'
                      }`}>
                        {selectedReceipt.status === 'APPROVED' ? 'อนุมัติแล้ว' :
                         selectedReceipt.status === 'REJECTED' ? 'ถูกปฏิเสธ / ตีกลับ' : 'รอดำเนินการ'}
                      </strong>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => approveReceipt(selectedReceipt.id)} 
                        className="flex-1 bg-emerald-600 font-bold text-white text-xs py-1.5 rounded shadow hover:bg-emerald-700 transition"
                      >
                        Approve File
                      </button>
                      
                      <button 
                        onClick={() => {
                          const r = prompt('ระบุเหตุผลการปฏิเสธเอกสารสำหรับพนักงาน:');
                          if (r) rejectReceipt(selectedReceipt.id, r);
                        }}
                        className="flex-1 bg-rose-600 font-bold text-white text-xs py-1.5 rounded shadow hover:bg-rose-700 transition"
                      >
                        Reject File
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-50 text-slate-400 text-xs rounded">
                  กำลังเตรียมดึงเอกสารแนบเพื่อประเมินความสอดคล้อง...
                </div>
              )}
            </div>
          )}

          {/* TAB 5: OCR DATA DEVIATION ANALYSIS */}
          {activeTab === 'ocr' && selectedReceipt && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-800">📊 AI-Assisted Discrepancy Matching Checks</h3>
              <div className="space-y-2 text-xs leading-relaxed">
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 bg-slate-50 rounded-lg border">
                    <span className="text-xs font-bold text-slate-600 block border-b pb-1 mb-1">ข้อมูลบนเอกสาร (OCR)</span>
                    <p className="font-mono text-[11px]">ยอดสุทธิ: ฿{fmt(selectedReceipt.netTotal)}</p>
                    <p className="font-mono text-[11px]">วันที่เอกสาร: {selectedReceipt.date}</p>
                    <p className="font-mono text-[11px]">ชื่อซัพพลายเออร์: {selectedReceipt.vendor}</p>
                    <p className="font-mono text-[11px]">Tax ID: {selectedReceipt.taxId}</p>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg border">
                    <span className="text-xs font-bold text-slate-600 block border-b pb-1 mb-1">ขอบข่ายใบขอเบิก (ADV)</span>
                    <p className="font-mono text-[11px]">ยอดได้รับอนุมัติ: ฿{fmt(activeAdv?.appAmount)}</p>
                    <p className="font-mono text-[11px]">วันที่ขอเบิก: {activeAdv?.reqDate}</p>
                    <p className="font-mono text-[11px]">สาขาโครงการ: {activeAdv?.pName}</p>
                    <p className="font-mono text-[11px]">หมวดหมู่จัดซื้อ: {activeAdv?.catName}</p>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3">
                  <strong className="block text-xs font-bold mb-1">🛡️ ผลการวิเคราะห์เปรียบเทียบเชิงลึก:</strong>
                  <ul className="list-disc pl-4 space-y-1 text-[11px]">
                    <li>การใช้จ่ายมีหมวดหมู่สอดคล้องกับงบวัสดุก่อสร้างหลักประจำปี</li>
                    <li>วันที่ในใบเสร็จเงินทดรองเกิดขึ้นหลังวันขอเบิก มีความสัมพันธ์ถูกต้องตามกฎเกณฑ์วงจงชีวิตสินค้า</li>
                    <li>ผลรวมการคำนวณราคาก่อนแวต + VAT 7% สรรพากร ถูกต้องอย่างสมบูรณ์ไร้ข้อพกพร่อง</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: AUDIT TRAIL LOGS */}
          {activeTab === 'audit' && activeAdv && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <History size={14} /> Audit Log Record
              </h3>
              
              <div className="space-y-2 border-l-2 border-slate-200 pl-3 max-h-[220px] overflow-y-auto pr-1">
                {(activeAdv.reviewAuditLogs || []).map((log, idx) => (
                  <div key={log.id || idx} className="text-[11px] leading-relaxed">
                    <div className="flex justify-between items-center text-slate-500 font-mono text-[10px]">
                      <span>{log.user}</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString('th-TH')}</span>
                    </div>
                    <p className="text-slate-800">
                      <strong>[{log.action}]</strong> {log.detail}
                    </p>
                  </div>
                ))}

                {(activeAdv.reviewAuditLogs || []).length === 0 && (
                  <div className="text-slate-400 text-xs py-10 text-center">
                    ไม่มีความเคลื่อนไหวทางปกครองสำหรับเคสสำรวจนี้
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: 25% on Desktop (col-span-3) */}
        <div className="md:col-span-3 flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1 border-b pb-2 mb-3">
              <Lock size={15} /> Accounting Decision Center
            </h2>

            {/* FINANCIAL SUMMARY */}
            <div className="space-y-3 mb-4">
              <div className="bg-slate-50 p-3 rounded-lg space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>ยอดขอเบิกเงินสะสมเดิม:</span>
                  <strong className="font-mono">฿{fmt(totalAdvance)}</strong>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>ยอดโอนแคชเชียร์สลีปจริง:</span>
                  <strong className="font-mono">฿{fmt(transferAmount)}</strong>
                </div>
                <div className="flex justify-between text-slate-600 border-t pt-2 mt-1">
                  <span>ยอดใบเสนอพิจารณารวม:</span>
                  <strong className="font-mono text-teal-800">฿{fmt(currentCleared)}</strong>
                </div>
                <div className="flex justify-between text-emerald-800 font-semibold border-b pb-1">
                  <span>ยอดรับอนุมัติเข้าสารบบ:</span>
                  <strong className="font-mono text-emerald-700">฿{fmt(approvedClearance)}</strong>
                </div>
                <div className="flex justify-between text-rose-600/80">
                  <span>ยอดตีกลับ (Rejected):</span>
                  <strong className="font-mono">฿{fmt(rejectedAmount)}</strong>
                </div>
                <div className="flex justify-between text-slate-700 border-t pt-2 font-semibold">
                  <span>ยอดค้างเคลียร์ (Remaining):</span>
                  <span className="font-mono text-indigo-700">฿{fmt(remainingCalculated)}</span>
                </div>
              </div>

              {/* SETTLEMENT CASES */}
              <div className={`p-4 rounded-lg border-2 text-xs leading-relaxed ${
                settlementCase === 1 ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
                settlementCase === 2 ? 'bg-amber-50 border-amber-300 text-amber-900' :
                'bg-rose-50 border-rose-300 text-rose-900'
              }`}>
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  {settlementCase === 1 ? <CheckCircle2 className="text-emerald-600" size={16} /> :
                   settlementCase === 2 ? <TrendingDown className="text-amber-600" size={16} /> :
                   <TrendingUp className="text-rose-600" size={16} />}
                  <span>มติปิดสเกลเคลียร์ยอดค่าใช้จ่าย</span>
                </div>
                <p className="font-medium text-[11px] mb-2">{settlementMsg}</p>
                
                {settlementAmount > 0 && (
                  <div className="flex justify-between items-center bg-white/70 px-2.5 py-1.5 rounded border border-slate-200 mt-2">
                    <span className="font-bold">
                      {settlementCase === 2 ? 'พนักงานต้องคืนบริษัท:' : 'ต้องคืนเงินพนักงาน:'}
                    </span>
                    <strong className="text-sm font-mono font-bold text-slate-800">
                      ฿{fmt(settlementAmount)}
                    </strong>
                  </div>
                )}
              </div>
            </div>

            {/* ACTION DIRECT BUTTONS */}
            <div className="space-y-2">
              <button 
                onClick={() => approveReceipt(selectedReceiptId)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded shadow transition flex items-center justify-center gap-1"
              >
                Approve Selected Evidence
              </button>

              <button 
                onClick={() => {
                  const r = prompt('ระบุสาเหตุข้อความตีกลับเอกสารที่เลือกแก่ฝ่ายจัดทำ:');
                  if (r) rejectReceipt(selectedReceiptId, r);
                }}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2 rounded shadow transition flex items-center justify-center gap-1"
              >
                Reject Selected Evidence
              </button>

              <button
                onClick={() => {
                  const promptReason = prompt('โปรดระบุรายการเอกสารเพิ่มเติมที่ต้องการจากพนักงาน:');
                  if (promptReason) {
                    toast(`💡 ส่งบันทึกขอหลักฐานเพิ่มเติม: "${promptReason}" สำเร็จ`, 'info');
                    logAuditAction('REQUEST_MORE_DOCS', `ขอเอกสารคู่สัญญาจัดจ้าง: ${promptReason}`);
                  }
                }}
                className="w-full bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold text-xs py-2 rounded transition"
              >
                Request More Documents
              </button>

              <button 
                onClick={() => setShowOverrideModal(true)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2 rounded border transition flex items-center justify-center gap-1"
              >
                🛡️ Manual Override (ผู้ตรวจสอบสิทธิพิเศษ)
              </button>

              <div className="border-t pt-4 mt-4">
                <button
                  onClick={handleCloseAccount}
                  disabled={activeAdv?.status === 'CLOSED'}
                  className="w-full bg-teal-800 hover:bg-teal-900 disabled:bg-slate-300 disabled:cursor-not-allowed font-bold text-xs py-3 rounded-lg text-white shadow-md border-b-4 border-teal-980 active:translate-y-1 transition text-center uppercase tracking-wide block"
                >
                  {activeAdv?.status === 'CLOSED' ? '✓ CLOSED ACCOUNT & BOOKED' : 'Confirm & Close Account (ปิดบัญชีเด็ดขาด)'}
                </button>
                <span className="text-[10px] text-slate-400 block text-center mt-1.5">
                  ขั้นตอนสุดท้ายจะจัดเก็บไฟล์ลงในสมุดคู่ Document Vault ตราสารอิเล็กทรอนิกส์
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* DETAILED LINE ITEM REVIEW TABLE */}
      {activeAdv && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mt-6">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3 border-b pb-2">
            <CheckCircle2 size={16} className="text-emerald-600" /> 
            Item Checklist Review Line-Items
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-xs border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b">
                  <th className="p-2 text-center w-12">ลำดับ</th>
                  <th className="p-2">รายละเอียดสินค้า / บริการ</th>
                  <th className="p-2">ร้านค้าผู้จำหน่าย</th>
                  <th className="p-2">Tax ID</th>
                  <th className="p-2">เลขที่เอกสาร</th>
                  <th className="p-2 font-mono">ราคาพอร์ท</th>
                  <th className="p-2 font-mono text-center">VAT (%)</th>
                  <th className="p-2 font-mono text-center">WHT (%)</th>
                  <th className="p-2 font-mono text-right">ยอดสุทธิรวม</th>
                  <th className="p-2 text-center">สถานะตรวจเอกสาร</th>
                  <th className="p-2 text-center w-[200px]">คำปรึกษาส่งกองคลัง / การตีกลับ</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-700">
                {allItems.map((it, idx) => {
                  const itemLineNet = (it.qty * it.price) * (1 + (it.vat || 7) / 100 - (it.wht || 0) / 100);
                  
                  return (
                    <tr key={it.id || idx} className="hover:bg-slate-50/50">
                      <td className="p-2 text-center text-slate-400">{idx + 1}</td>
                      <td className="p-2 font-medium">
                        <div>{it.desc}</div>
                        <div className="text-[10px] text-slate-400 font-mono">หมวดสินค้า: {activeAdv.catName}</div>
                      </td>
                      <td className="p-2">{it.vendor}</td>
                      <td className="p-2 font-mono">{it.taxId}</td>
                      <td className="p-2 font-mono">{it.invoiceNo}</td>
                      <td className="p-2 font-mono">฿{fmt(it.price)} x {it.qty}</td>
                      <td className="p-2 text-center font-mono">{it.vat}%</td>
                      <td className="p-2 text-center font-mono">{it.wht}%</td>
                      <td className="p-2 font-mono text-right text-slate-900 font-bold">
                        ฿{fmt(Math.round(itemLineNet))}
                      </td>
                      <td className="p-2 text-center text-[11px]">
                        <span className={`px-2 py-0.5 rounded-full font-semibold border ${
                          it.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          it.status === 'REJECTED' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                          it.status === 'MORE_EVIDENCE' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                          'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {it.status === 'APPROVED' ? 'อนุมัติผ่าน' :
                           it.status === 'REJECTED' ? 'ตีกลับ' :
                           it.status === 'MORE_EVIDENCE' ? 'ขอหลักฐานเพิ่ม' : 'รอตรวจสอบ'}
                        </span>
                      </td>
                      <td className="p-2 w-[220px]">
                        <div className="flex flex-col gap-1.5">
                          {/* QUICK ACTIONS FOR INDIVIDUAL ITEM */}
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => approveLineItem(it.receiptId, it.id)}
                              className="px-1.5 py-0.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded text-[10px] shadow"
                            >
                              อนุมัติ
                            </button>
                            <button
                              onClick={() => {
                                const reason = rejectItemReason[it.id] || prompt('เหตุผลปฏิเสธรายการสินค้า:');
                                if (reason) rejectLineItem(it.receiptId, it.id, reason);
                              }}
                              className="px-1.5 py-0.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded text-[10px] shadow"
                            >
                              ปฏิเสธ
                            </button>
                            <button
                              onClick={() => {
                                const q = prompt('กรุณากรอกข้อความขอหลักฐานเพิ่มจากพนักงาน:');
                                if (q) requestMoreEvidence(it.receiptId, it.id, q);
                              }}
                              className="px-1.5 py-0.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded text-[10px] shadow"
                            >
                              ขอเพิ่ม
                            </button>
                          </div>

                          {it.reason && (
                            <div className="text-[10px] bg-rose-50 border border-rose-100 text-rose-800 p-1 rounded">
                              <strong>เหตุผล:</strong> {it.reason}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* OVERRIDE MODAL DIALOG DISPLAY */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border-t-8 border-teal-800">
            <h3 className="text-base font-bold text-teal-900 flex items-center gap-2 mb-3">
              <ShieldCheck className="text-teal-800" />
              Manual Override Confirmation
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              คุณกำลังใช้งานสิทธิผู้ตรวจสอบอาวุโสเพื่อข้ามกระบวนการตรวจสอบเอกสาร (เช่น แนบเอกสารซ้ำ, ตัวอักษรเลือนลางแต่สลีปเปย์เมนต์เป็นจริง) 
              มติ override นี้จะเปลี่ยนสถานะเอกสารแนบทุกชิ้นเป็น APPROVED โดยอัตโนมัติ และจะเข้าบันทึก Audit Logs 
              เพื่อใช้อ้างอิงทางกฎหมายผู้ตรวจสอบทางวิชาชีพบัญชี
            </p>

            <textarea
              className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:outline-teal-800 mb-4 h-24"
              placeholder="ระบุมติที่ประชุมหรือข้อจำกัดความรับผิดชอบ... (เช่น ได้รับใบอนุญาตพิเศษจากผู้อำนวยการฝ่ายการคลัง)"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
            ></textarea>

            <div className="flex gap-2">
              <button
                onClick={() => setShowOverrideModal(false)}
                className="flex-1 text-xs font-semibold py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleManualOverride}
                className="flex-1 text-xs font-bold py-2 rounded-lg bg-teal-800 hover:bg-teal-900 text-white transition shadow-md"
              >
                อนุมัติ Override แผ่นดิน
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Generates beautiful pre-seeded mock templates corresponding cleanly to requested advance schema
function generateMockReceiptsForAdvance(a: Advance): Receipt[] {
  if (a.id === 'ADV-2026-001') {
    return [
      {
        id: `REC-${a.id}-1`,
        vendor: 'บริษัท เอสซีจี แมททีเรียลส์ จำกัด',
        taxId: '0105554001234',
        invoiceNo: 'SCG-52890',
        receiptNo: 'REC-90321',
        date: '2026-05-18',
        subtotal: 35000,
        vatAmount: 2450,
        whtAmount: 0,
        netTotal: 37450,
        matchScore: 98,
        status: 'PENDING',
        fileName: 'SCG_Cement_Steel.pdf',
        aiFeedback: 'สลีปการโอนและชื่อผู้ขาย บจก. เอสซีจี สอดคล้องกัน 100% บิลหลักฐานแสดงสรรพากรสมบูรณ์',
        items: [
          { id: `IT-${a.id}-s1`, desc: 'เหล็กเส้น SD40 ขนาด 12 มม.', qty: 50, unit: 'เส้น', price: 350, vat: 7, wht: 0, category: 'C02', status: 'PENDING' },
          { id: `IT-${a.id}-s2`, desc: 'ปูนซีเมนต์ปอร์ตแลนด์ ตราช้าง', qty: 100, unit: 'ถุง', price: 150, vat: 7, wht: 0, category: 'C02', status: 'PENDING' }
        ]
      }
    ];
  } else if (a.id === 'ADV-2026-003') {
    return [
      {
        id: `REC-${a.id}-1`,
        vendor: 'บริษัท สยาม ไดกิ้น เซลส์ จำกัด',
        taxId: '0105531002345',
        invoiceNo: 'DK-2026-891',
        receiptNo: 'DK-REC-00213',
        date: '2026-05-10',
        subtotal: 60000,
        vatAmount: 4200,
        whtAmount: 1800,
        netTotal: 62400,
        matchScore: 94,
        status: 'PENDING',
        fileName: 'Daikin_Compressors.pdf',
        aiFeedback: 'ตรวจพบการหัก ณ ที่จ่าย 3% (WHT) สอดคล้องกับค่าติดตั้งประเภทงานเครื่องปรับอากาศและแวดล้อม',
        items: [
          { id: `IT-${a.id}-s1`, desc: 'เครื่องแอร์ Daikin 36000 BTU', qty: 4, unit: 'เครื่อง', price: 15000, vat: 7, wht: 3, category: 'C04', status: 'PENDING' }
        ]
      }
    ];
  }

  // Fallback default mock receipt constructor
  return [
    {
      id: `REC-${a.id}-default`,
      vendor: 'บจก. ไทวัสดุ ค้าปลีกก่อสร้างอาคาร',
      taxId: '1234567890123',
      invoiceNo: `INV-${a.id.split('-')[2]}`,
      receiptNo: `RC-${a.id.split('-')[2]}`,
      date: '2026-06-12',
      subtotal: Math.round(a.appAmount * 0.93),
      vatAmount: Math.round(a.appAmount * 0.93 * 0.07),
      whtAmount: 0,
      netTotal: a.appAmount,
      matchScore: 89,
      status: 'PENDING',
      fileName: 'ThaiWatsadu_Receipt.jpg',
      aiFeedback: 'บิลเงินสดมีรายละเอียดรายการสินค้า และจำนวนยอดสุทธิรวมตรงตามสเกลที่โอนจากเบิกเงินทดรอง',
      items: [
        { id: `IT-${a.id}-it1`, desc: a.desc || 'รายการอะไหล่และอุปกรณ์เสริมงานวิศวกรรมอาคาร', qty: 1, unit: 'ชุด', price: Math.round(a.appAmount * 0.93), vat: 7, wht: 0, category: a.catId || 'C02', status: 'PENDING' }
      ]
    }
  ];
}
