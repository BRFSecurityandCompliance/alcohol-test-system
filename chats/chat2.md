# เพิ่มตัวเลือกแผนก

_Started 2026-05-07 04:01 UTC_

---

## User

เพิ่มตัวเลือกในแผนก
ผู้เยี่ยมชมสถานที่ Visitor
ฝึกงาน Intern

## Assistant

_[tool: list_files]_

_[tool: grep]_

Let me look at the DEPARTMENTS array in data.js:

_[tool: read_file]_

I'll add "Visitor" and "Intern" to the DEPARTMENTS list.

_[tool: str_replace_edit]_

เพิ่มแล้วครับ — ตอนนี้ในแผนกมี 6 ตัวเลือก:
- พนักงานขนส่ง (Transport)
- พนักงานคลังสินค้า (Warehouse)
- พนักงานสำนักงาน (Office)
- พนักงานรักษาความปลอดภัย (Security)
- **ผู้เยี่ยมชมสถานที่ (Visitor)** ← ใหม่
- **ฝึกงาน (Intern)** ← ใหม่

ตัวเลือกใหม่จะปรากฏอัตโนมัติทั้งในฟอร์มผู้ใช้ (`user-form.html`) และตัวกรองในรายงาน (`admin-reports.html`) เนื่องจากทั้งสองไฟล์อ่านจาก `DEPARTMENTS` ตัวเดียวกัน และไม่ต้องใช้ทะเบียนรถ (ไม่อยู่ใน `PLATE_REQUIRED_DEPTS`)

## User

แนะนำฟีเจอร์ และฟังชั่นเพิ่มเติมให้หน่อย

## Assistant

ผมขอวิเคราะห์ระบบปัจจุบันก่อน แล้วเสนอฟีเจอร์ที่น่าจะเป็นประโยชน์จริงๆ

_[tool: read_file]_

จากที่ดูระบบทั้งหมด — เป็นระบบตรวจแอลกอฮอล์พนักงานก่อนเข้างาน มี QR ตามสถานที่ ฟอร์มผู้ใช้ และ admin panel — ผมขอเสนอฟีเจอร์เพิ่มเติมแบ่งตามลำดับความสำคัญและความเกี่ยวข้องกับธุรกิจ

## 🔥 ระดับสำคัญ (เพิ่มคุณค่าทางธุรกิจชัดเจน)

**1. ระบบแจ้งเตือนเมื่อตรวจไม่ผ่าน (Alert)**
- ส่งแจ้งเตือนทันทีไปยัง LINE Notify / Email ของหัวหน้างาน เมื่อพบแอลกอฮอล์ > 0
- หน้า admin มี "🔴 Alert Center" แสดงรายการที่ยังไม่ได้ตรวจสอบ
- บันทึก action: "พักงาน / ส่งกลับ / อนุญาตให้ทำงาน + เหตุผล"

**2. กฎเกณฑ์ตามกฎหมาย (Threshold Rules)**
- ปัจจุบันแค่ "0 หรือ ไม่ 0" → เพิ่ม threshold ตามกฎหมายไทย: 
  - 0 mg% = ผ่าน (ใหม่/ฝึกหัด/ขนส่ง)
  - 0–20 mg% = เตือน
  - 20–50 mg% = ห้ามขับ
  - >50 mg% = ผิดกฎหมาย
- แสดงสีระดับ (เขียว/เหลือง/ส้ม/แดง) อัตโนมัติ
- Threshold ต่างกันได้ตามแผนก (Transport เข้มกว่า Office)

**3. ประวัติรายบุคคล (Person Profile)**
- คลิกชื่อ → ดูประวัติการตรวจทั้งหมดของคนนั้น
- แสดงสถิติ: ตรวจกี่ครั้ง / ผ่านกี่ครั้ง / อัตราส่วน / ครั้งล่าสุด
- ตั้งสถานะ "Watchlist" สำหรับคนที่เคยตรวจไม่ผ่าน

**4. Re-test Flow**
- ถ้าตรวจไม่ผ่าน → บังคับตรวจซ้ำใน 15-30 นาที
- ระบบ track ว่าครั้งไหนเป็น "ตรวจซ้ำ" และเชื่อมกับครั้งแรก

## 📊 Analytics & Reporting

**5. Dashboard ที่ลึกขึ้น**
- กราฟแนวโน้มรายวัน/สัปดาห์/เดือน
- Heatmap: เวลา×วัน → ช่วงไหนพบไม่ผ่านบ่อย
- Top 5 สถานที่ / แผนกที่มีอัตราไม่ผ่านสูง
- เปรียบเทียบ %ผ่าน เดือนนี้ vs เดือนที่แล้ว

**6. Export ที่ดีขึ้น**
- Export PDF รายงานสรุป (พร้อม logo บริษัท) — สำหรับส่งราชการ/ลูกค้า
- Export Excel หลายชีท (สรุป + รายละเอียด)
- กำหนดเวลา auto-email รายงานทุกสัปดาห์

## 🔒 ความปลอดภัย & Compliance

**7. Audit Log**
- บันทึกทุกการแก้ไข/ลบ ผลตรวจ — ใครทำ, เมื่อไหร่, ก่อน/หลังเป็นอะไร
- จำเป็นมากเพื่อ compliance ตรวจสอบย้อนหลัง

**8. หลายระดับ User**
- Super Admin / Site Manager / Viewer
- Site Manager เห็นเฉพาะสถานที่ตัวเอง
- Viewer (HR/ผู้บริหาร) ดูได้แต่แก้ไม่ได้

**9. Digital Signature / ลายเซ็น**
- พนักงานเซ็นบนหน้าจอเพื่อยืนยันผล
- ผู้ตรวจ (เจ้าหน้าที่ รปภ.) เซ็นรับรอง
- เก็บลายเซ็นเป็น base64 พร้อมผลตรวจ

## 📱 ปรับปรุง UX ผู้ใช้

**10. หน้า Public Dashboard ที่ QR**
- Tablet/หน้าจอที่จุดตรวจแสดง: คิวล่าสุด, จำนวนคนผ่านวันนี้, %ผ่าน
- สร้างความโปร่งใส สร้าง awareness

**11. Quick Re-entry**
- พนักงานประจำกรอก ID → ดึงข้อมูลเดิมอัตโนมัติ (ชื่อ/แผนก/บริษัท/ทะเบียน)
- ลดเวลาจาก 60 วินาที → 10 วินาที

**12. รองรับหลายภาษา**
- ไทย / อังกฤษ / เมียนมา / กัมพูชา (สำหรับแรงงานข้ามชาติ)
- โดยเฉพาะแผนก Warehouse และ Visitor

## 🛠️ Operational

**13. การจัดการเครื่องตรวจ (Device Management)**
- ลงทะเบียนเครื่องเป่าแต่ละเครื่อง (serial, calibration date)
- เตือนเมื่อใกล้ถึงวัน calibrate
- ผูกผลตรวจกับเครื่องที่ใช้

**14. Shift / กะ**
- ผูกผลตรวจกับกะ (เช้า/บ่าย/ดึก)
- รายงาน %ผ่าน ตามกะได้

**15. Offline Mode**
- ถ้าเน็ตหลุด → เก็บใน localStorage แล้ว sync ทีหลัง
- สำคัญสำหรับสถานที่ห่างไกล

---

**คำแนะนำของผม** — ถ้าต้องเลือก 3 อย่างก่อน ผมจะแนะนำ:
1. **Threshold Rules + สีระดับ** (เพิ่มความถูกต้องทันที)
2. **Person Profile + ประวัติ** (เป็น foundation ของ feature อื่นๆ)
3. **Alert Center + Action tracking** (มูลค่าทางธุรกิจชัดที่สุด)

อยากให้ผมเริ่ม mock-up ตัวไหนก่อนครับ? หรือถ้ามีโจทย์เฉพาะของลูกค้า/ธุรกิจ บอกได้เลยจะออกแบบให้ตรงประเด็น

## User

1-15 เอาหมดเลย ตามลำดับ

** ถ้าตรวจไม่ผ่าน → บังคับตรวจซ้ำใน 5 นาที

## Assistant

รับทราบครับ! เป็นงานใหญ่มาก ผมจะเริ่มทำตามลำดับ 1-15 และจะปรับ re-test เป็น 5 นาที

ก่อนเริ่ม ผมขอถามคำถามที่สำคัญเพื่อทำให้ออกมาตรงใจครับ:

_[tool: questions_v2]_

## User

Questions timed out; go with defaults

## Assistant

_[tool: snip]_

รับทราบครับ ผมจะใช้ค่า default ที่สมเหตุสมผลและเริ่มทำทั้ง 15 ฟีเจอร์ตามลำดับ

**Default ที่ผมใช้:**
- Threshold: กฎหมายไทย (0/0-20/20-50/>50 mg%) + Transport zero tolerance
- Alert: LINE Notify + Email + In-app
- Re-test: ตรวจครั้งที่ 3 ใน 5 นาที, ห้ามทำงานถ้ายังไม่ผ่าน
- Roles: Super Admin / Site Manager / HR Viewer / Auditor
- Languages: ไทย / อังกฤษ / เมียนมา / กัมพูชา
- Shifts: 3 กะ (เช้า/บ่าย/ดึก)
- Watchlist: ไม่ผ่าน 2 ครั้งใน 30 วัน
- Signature: พนักงาน + เจ้าหน้าที่
- Kiosk: คิวล่าสุด + จำนวนผ่านวันนี้
- Style: minimal ไทย-อังกฤษ

_[tool: update_todos]_

_[tool: read_file]_

_[tool: read_file]_

Now let me read the remaining files to understand the full system, then start building.

_[tool: read_file]_

[Continuing implementation. Given the massive scope (15 features), let me execute a focused build by extending data.js first with all the new data structures, then build new pages and update existing ones efficiently.]

_[tool: read_file]_

_[tool: snip]_

Now let me build everything. I'll start with the heart of the system — `data.js` extended — then build features sequentially.

_[tool: write_file]_

Now let me extend shared.css with new styles, then build all feature pages.

_[tool: str_replace_edit]_

I'll continue building features. Now let me update the user-form for thresholds, then build all the new pages.

_[tool: snip]_

Now let me rebuild user-form.html with thresholds, retest, employee quick-lookup, signature, i18n, and offline support.

_[tool: write_file]_

## User

GitHub connected

## Assistant

