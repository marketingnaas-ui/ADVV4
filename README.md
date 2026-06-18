# ClearAdvance PRO V2

ระบบนี้เป็น React/Vite + Express Server ไม่สามารถเปิดด้วยการดับเบิลคลิก `index.html` ได้ ต้องรันผ่าน Node server ก่อน

## วิธีรันในเครื่อง

```bash
npm install
npm run dev
```

จากนั้นเปิด:

```text
http://localhost:3000
```

## Environment

สร้างไฟล์ `.env` ที่ root ของโปรเจกต์ ถ้าต้องการใช้ OCR จริง:

```env
GEMINI_API_KEY=your_key_here
APP_URL=http://localhost:3000
```

ถ้าไม่ใส่ `GEMINI_API_KEY` ระบบยังเปิดหน้าได้ แต่ OCR จะใช้โหมดจำลอง

## Build Production

```bash
npm run build
npm run start
```

หมายเหตุ: `server.ts` รองรับ `process.env.PORT` แล้ว จึงใช้กับระบบ preview/deploy ที่กำหนด port เองได้
