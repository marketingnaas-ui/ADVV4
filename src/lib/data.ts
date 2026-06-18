import { Advance, Category, Project, User } from '../types';

export const USERS: User[] = [
  {id:'U001',name:'สมชาย วงศ์ดี',dept:'ฝ่ายปฏิบัติการ',role:'employee',bank:'กสิกรไทย',bankNo:'0123456789',ini:'สว'},
  {id:'U002',name:'สุดา พงษ์เจริญ',dept:'ฝ่ายการตลาด',role:'employee',bank:'ไทยพาณิชย์',bankNo:'1234567890',ini:'สพ'},
  {id:'U003',name:'ประเสริฐ มั่นคง',dept:'ฝ่ายวิศวกรรม',role:'employee',bank:'กรุงเทพ',bankNo:'2345678901',ini:'ปม'},
  {id:'U004',name:'วิภา ทองสุข',dept:'ฝ่ายบัญชี',role:'finance',bank:'กรุงไทย',bankNo:'3456789012',ini:'วท'},
  {id:'U005',name:'อนุชา ศรีสว่าง',dept:'ฝ่ายขาย',role:'employee',bank:'ออมสิน',bankNo:'4567890123',ini:'อศ'},
  {id:'U006',name:'นฤมล ดวงแก้ว',dept:'ผู้บริหาร',role:'approver',bank:'กรุงเทพ',bankNo:'5678901234',ini:'นด'},
];

export const PROJECTS: Project[] = [
  {id:'P001',name:'งานก่อสร้างอาคาร A',budget:5000000},
  {id:'P002',name:'โครงการปรับปรุงระบบไฟฟ้า',budget:2000000},
  {id:'P003',name:'งานติดตั้งระบบ HVAC',budget:3500000},
  {id:'P004',name:'โครงการซ่อมบำรุงท่อ',budget:1200000},
  {id:'P005',name:'งานเดินสายเคเบิล',budget:800000},
];

export const CATS: Category[] = [
  {id:'C01',name:'ค่าแรง',color:'#4E958D'},{id:'C02',name:'ค่าวัสดุ',color:'#3b82f6'},
  {id:'C03',name:'ค่าเดินทาง',color:'#f59e0b'},{id:'C04',name:'ค่าอุปกรณ์',color:'#8b5cf6'},
  {id:'C05',name:'ค่าเช่า',color:'#ef4444'},{id:'C06',name:'อื่นๆ',color:'#6b7280'},
];

export const SETTINGS_DEFAULT: Record<string, boolean> = {
  lineNotif: true, emailNotif: false, autoOCR: true, overdueAlert: true, auditLog: true
};

export const INITIAL_ADV: Advance[] = [
  {id:'ADV-2026-001',empId:'U001',empName:'สมชาย วงศ์ดี',empDept:'ฝ่ายปฏิบัติการ',pIds:['P001'],pName:'งานก่อสร้างอาคาร A',reqDate:'2026-05-10',dueDate:'2026-06-09',appDate:'2026-05-11',appBy:'U006',status:'WAITING_CLEARANCE',amount:45000,appAmount:45000,clrAmount:0,catId:'C02',catName:'ค่าวัสดุ',desc:'ซื้อวัสดุก่อสร้าง เหล็ก ปูน ทราย สำหรับโครงการ A',items:[{d:'เหล็กเส้น',q:50,u:'เส้น',p:350,t:17500},{d:'ปูนซีเมนต์',q:100,u:'ถุง',p:150,t:15000},{d:'ทรายหยาบ',q:5,u:'คิว',p:2500,t:12500}],files:['ใบเสนอราคา_001.pdf'],clrs:[],pay:{bank:'กสิกรไทย',amount:45000,date:'2026-05-14',ref:'KTB26051400123',slip:'slip_001.jpg'}},
  {id:'ADV-2026-002',empId:'U002',empName:'สุดา พงษ์เจริญ',empDept:'ฝ่ายการตลาด',pIds:['P002'],pName:'โครงการปรับปรุงระบบไฟฟ้า',reqDate:'2026-05-15',dueDate:'2026-06-14',appDate:'2026-05-16',appBy:'U006',status:'CLOSED',amount:28500,appAmount:28500,clrAmount:28500,catId:'C04',catName:'ค่าอุปกรณ์',desc:'ซื้ออุปกรณ์ไฟฟ้า สายไฟ เบรกเกอร์',items:[{d:'สายไฟ NYY 4x16',q:200,u:'ม.',p:95,t:19000},{d:'เบรกเกอร์ 3P 100A',q:5,u:'ชิ้น',p:1900,t:9500}],files:['ใบเสนอราคา_002.pdf'],clrs:[{id:'CLR-2026-002',date:'2026-06-05',amount:28500,note:'เคลียร์เต็มจำนวน'}],pay:{bank:'ไทยพาณิชย์',amount:28500,date:'2026-05-18',ref:'SCB26051800456',slip:'slip_002.jpg'}},
  {id:'ADV-2026-003',empId:'U003',empName:'ประเสริฐ มั่นคง',empDept:'ฝ่ายวิศวกรรม',pIds:['P003'],pName:'งานติดตั้งระบบ HVAC',reqDate:'2026-04-20',dueDate:'2026-05-20',appDate:'2026-04-21',appBy:'U006',status:'WAITING_CLEARANCE',amount:72000,appAmount:72000,clrAmount:0,catId:'C04',catName:'ค่าอุปกรณ์',desc:'ค่าอุปกรณ์ HVAC แอร์ คอยล์ ท่อน้ำยา',items:[{d:'เครื่องแอร์ 36000 BTU',q:4,u:'เครื่อง',p:15000,t:60000},{d:'ท่อน้ำยา 1/4+1/2',q:60,u:'ม.',p:200,t:12000}],files:['ใบเสนอราคา_003.pdf'],clrs:[],pay:{bank:'กรุงเทพ',amount:72000,date:'2026-04-25',ref:'BBL26042500789',slip:'slip_003.jpg'}},
  {id:'ADV-2026-004',empId:'U001',empName:'สมชาย วงศ์ดี',empDept:'ฝ่ายปฏิบัติการ',pIds:['P001'],pName:'งานก่อสร้างอาคาร A',reqDate:'2026-04-01',dueDate:'2026-05-01',appDate:'2026-04-02',appBy:'U006',status:'WAITING_CLEARANCE',amount:33000,appAmount:33000,clrAmount:0,catId:'C01',catName:'ค่าแรง',desc:'ค่าแรงงานก่อสร้างฐานราก เดือนเมษายน',items:[{d:'ค่าแรงฝีมือ',q:15,u:'วัน',p:1500,t:22500},{d:'ค่าแรงไม่มีฝีมือ',q:15,u:'วัน',p:700,t:10500}],files:[],clrs:[],pay:{bank:'กสิกรไทย',amount:33000,date:'2026-04-05',ref:'KTB26040500321',slip:'slip_004.jpg'}},
  {id:'ADV-2026-005',empId:'U005',empName:'อนุชา ศรีสว่าง',empDept:'ฝ่ายขาย',pIds:['P005'],pName:'งานเดินสายเคเบิล',reqDate:'2026-06-15',dueDate:'2026-07-15',appDate:null,appBy:null,status:'PENDING_APPROVAL',amount:18500,appAmount:0,clrAmount:0,catId:'C03',catName:'ค่าเดินทาง',desc:'ค่าเดินทาง ค่าที่พัก สำรวจหน้างานเชียงใหม่',items:[{d:'ค่าตั๋วเครื่องบิน',q:2,u:'ใบ',p:4500,t:9000},{d:'ค่าที่พัก 3 คืน',q:3,u:'คืน',p:2000,t:6000},{d:'ค่าเดินทางในเมือง',q:1,u:'เที่ยว',p:3500,t:3500}],files:['ใบจองตั๋ว.pdf'],clrs:[],pay:null},
  {id:'ADV-2026-006',empId:'U004',empName:'วิภา ทองสุข',empDept:'ฝ่ายบัญชี',pIds:['P004'],pName:'โครงการซ่อมบำรุงท่อ',reqDate:'2026-03-10',dueDate:'2026-04-09',appDate:'2026-03-11',appBy:'U006',status:'CLOSED',amount:15000,appAmount:15000,clrAmount:12800,catId:'C04',catName:'ค่าอุปกรณ์',desc:'ซื้ออุปกรณ์ซ่อมแซมท่อน้ำ',items:[{d:'ท่อ PVC 4นิ้ว',q:20,u:'ท่อน',p:450,t:9000},{d:'ข้อต่อท่อ',q:40,u:'ชิ้น',p:75,t:3000},{d:'กาวต่อท่อ',q:4,u:'กระป๋อง',p:250,t:1000}],files:['ใบเสนอราคา_006.pdf'],clrs:[{id:'CLR-2026-006',date:'2026-04-05',amount:12800,note:'คืนส่วนต่าง 2,200 บาท'}],pay:{bank:'กรุงไทย',amount:15000,date:'2026-03-15',ref:'KTB26031500654',slip:'slip_006.jpg'}},
  {id:'ADV-2026-007',empId:'U002',empName:'สุดา พงษ์เจริญ',empDept:'ฝ่ายการตลาด',pIds:['P002'],pName:'โครงการปรับปรุงระบบไฟฟ้า',reqDate:'2026-06-14',dueDate:'2026-07-14',appDate:'2026-06-15',appBy:'U006',status:'WAITING_TRANSFER',amount:56000,appAmount:56000,clrAmount:0,catId:'C02',catName:'ค่าวัสดุ',desc:'วัสดุไฟฟ้าเพิ่มเติม คอนดิท ท่อร้อยสาย',items:[{d:'ท่อคอนดิท 1นิ้ว',q:200,u:'ท่อน',p:95,t:19000},{d:'ท่อร้อยสาย EMT',q:100,u:'ท่อน',p:220,t:22000},{d:'ข้อต่อ',q:100,u:'ชิ้น',p:150,t:15000}],files:['ใบเสนอราคา_007.pdf'],clrs:[],pay:null},
  {id:'ADV-2026-008',empId:'U003',empName:'ประเสริฐ มั่นคง',empDept:'ฝ่ายวิศวกรรม',pIds:['P003'],pName:'งานติดตั้งระบบ HVAC',reqDate:'2026-06-01',dueDate:'2026-07-01',appDate:null,appBy:null,status:'REJECTED',amount:95000,appAmount:0,clrAmount:0,catId:'C04',catName:'ค่าอุปกรณ์',desc:'ชุดคอมเพรสเซอร์ทดแทน (ไม่อนุมัติ – เกินงบ)',items:[{d:'คอมเพรสเซอร์ Daikin 5TR',q:3,u:'ชุด',p:28000,t:84000},{d:'น้ำยา R32',q:15,u:'กิโล',p:733,t:11000}],files:['ใบเสนอราคา_008.pdf'],clrs:[],pay:null,rejReason:'ยอดเกินงบประมาณโครงการ'},
  {id:'ADV-2026-009',empId:'U005',empName:'อนุชา ศรีสว่าง',empDept:'ฝ่ายขาย',pIds:['P005'],pName:'งานเดินสายเคเบิล',reqDate:'2026-05-05',dueDate:'2026-06-04',appDate:'2026-05-06',appBy:'U006',status:'WAITING_CLEARANCE',amount:22000,appAmount:22000,clrAmount:0,catId:'C02',catName:'ค่าวัสดุ',desc:'สายเคเบิล CAT6 และอุปกรณ์เครือข่าย',items:[{d:'สาย CAT6 UTP',q:500,u:'ม.',p:20,t:10000},{d:'ปลั๊ก RJ45',q:200,u:'ชิ้น',p:15,t:3000},{d:'ตู้ Rack 9U',q:2,u:'ตู้',p:4500,t:9000}],files:['ใบเสนอราคา_009.pdf'],clrs:[],pay:{bank:'ออมสิน',amount:22000,date:'2026-05-10',ref:'GSB26051000987',slip:'slip_009.jpg'}},
  {id:'ADV-2026-010',empId:'U001',empName:'สมชาย วงศ์ดี',empDept:'ฝ่ายปฏิบัติการ',pIds:['P001'],pName:'งานก่อสร้างอาคาร A',reqDate:'2026-06-17',dueDate:'2026-07-17',appDate:null,appBy:null,status:'PENDING_APPROVAL',amount:12000,appAmount:0,clrAmount:0,catId:'C03',catName:'ค่าเดินทาง',desc:'ค่าเดินทางตรวจงาน เดือนมิถุนายน',items:[{d:'ค่าน้ำมัน',q:1,u:'เดือน',p:8000,t:8000},{d:'ค่าทางด่วน',q:1,u:'เดือน',p:4000,t:4000}],files:[],clrs:[],pay:null},
];
