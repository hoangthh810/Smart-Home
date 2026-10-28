# Đồ án 2 – Hệ thống giám sát và quản lý nhà thông minh

Sinh viên: Tống Hữu Huy Hoàng. Giao tiếp với người dùng bằng **tiếng Việt**.

## Tổng quan

Hệ thống nhà thông minh giám sát môi trường, trạng thái các phòng và điện năng theo thời gian thực; người dùng điều khiển thiết bị qua Web (responsive, không làm app riêng).

```
2 x ESP32 --MQTT (LAN)--> Raspberry Pi 5 (Gateway)            <--> Firebase <--> Web
                          ├─ Mosquitto (MQTT Broker)               ├─ Realtime Database
                          └─ Chương trình Python (cầu nối):        ├─ Firestore
                             MQTT <-> Firebase, logic Auto,        └─ Authentication
                             cảnh báo gas, gửi Gmail (SMTP)
```

- MQTT chỉ dùng giữa ESP32 và Pi. Web chỉ đọc/ghi Firebase → xem được từ ngoài LAN; Pi cần Internet.
- **Realtime Database**: dữ liệu trực tiếp (số đo mới nhất, trạng thái thiết bị, lệnh điều khiển) – vì cảm biến gửi ~2 giây/lần, không ghi vào Firestore.
- **Firestore**: nhà, tài khoản, cài đặt, cảnh báo, nhật ký, lịch sử điện năng (Pi gộp theo phút/giờ trước khi ghi).
- **Firebase Authentication**: đăng nhập. Admin tạo tài khoản người khác cần Admin SDK → chạy trên Pi.
- **Gmail**: Pi gửi qua SMTP + App Password (không dùng Cloud Functions để khỏi cần gói Blaze).
- Không làm backend FastAPI/SQLite nữa.

| Phòng | Cảm biến | Thiết bị |
|---|---|---|
| Phòng khách (`living`) | DHT22, BH1750, PIR, INA219, LCD | Đèn LED, quạt mini |
| Phòng bếp (`kitchen`) | DHT22, MQ-2, PIR, INA219, LCD | Đèn LED, quạt mát (KHÔNG phải quạt hút), buzzer |

- Mỗi phòng 1 INA219 đo **tổng** điện của đèn + quạt → điện năng thống kê theo phòng.
- Raspberry Pi 5 chạy Raspberry Pi OS.

## Quy tắc nghiệp vụ (đã chốt với người dùng – không tự ý thay đổi)

- **Manual/Auto áp dụng theo PHÒNG**, không theo từng thiết bị.
- **Auto**: PIR có người → bật đèn + quạt; không còn người sau X phút (người dùng cài) → tắt.
- **Manual**: người dùng bật/tắt đèn, quạt bằng nút trên web. Buzzer do hệ thống điều khiển.
- Ngưỡng nhiệt độ, độ ẩm, ánh sáng **chỉ để hiển thị**, không ảnh hưởng Auto.
- **Gas vượt ngưỡng**: buzzer kêu + popup cảnh báo trên web + gửi Gmail. Đèn/quạt **giữ nguyên trạng thái** và tạm khoá điều khiển (tránh tia lửa điện).
- Popup gas không tự tắt: user bấm "Tôi đã biết" (xác nhận) hoặc "Ẩn tạm" (hiện lại khi admin nhắc).
- Tiền điện tính theo **bậc thang EVN** + VAT.

## Phân quyền

- **Nhiều nhà** (multi-home); **1 nhà có nhiều tài khoản thành viên**, dùng chung thiết bị, cài đặt. Nhật ký ghi ai làm gì.
- **User**: xem/điều khiển nhà mình, tự đặt ngưỡng gas, thời gian tự tắt, ngưỡng hiển thị, danh sách email nhận cảnh báo.
- **Admin**: quản lý nhà & tài khoản (thêm/sửa/khoá/xoá), thống kê (số user, user mới theo tháng, cảnh báo), cài bảng giá EVN, xem cảnh báo mọi nhà và bấm **"Nhắc nhở"** (gửi lại email + hiện lại popup bên user).
- Admin KHÔNG chỉnh ngưỡng/cài đặt của từng nhà.

## Công nghệ

- **Web** (`web/`): React 19 + Vite + TailwindCSS v4 + Recharts + zustand + react-router-dom + lucide-react. JavaScript (không TypeScript).
- **Gateway (chưa làm)**: Python trên Pi 5 (paho-mqtt + firebase-admin + smtplib), Mosquitto.
- **Dữ liệu (chưa tích hợp)**: Firebase JS SDK trên web, thay cho `store/db.js` (Firestore + Auth) và `services/realtime.js` (Realtime Database).

## Lệnh

```bash
cd web
npm run dev     # http://localhost:5173 (host: true → truy cập được từ LAN)
npm run build   # luôn chạy để kiểm tra sau khi sửa code
```

Tài khoản demo: `hoang/123456`, `lan/123456` (cùng nhà), `admin/admin123`.

## Cấu trúc `web/src`

```
data/constants.js      Phòng, thiết bị, giá EVN mặc định, cài đặt mặc định
data/seed.js           Dữ liệu mẫu
store/db.js            DB giả lập (localStorage, đồng bộ giữa các tab) – sau thay bằng API
store/auth.js          Đăng nhập (sessionStorage – mỗi tab 1 phiên)
store/live.js          Trạng thái realtime + toast
services/realtime.js   Lớp kết nối MQTT (hiện là MockClient)
services/simulator.js  Giả lập 2 ESP32 + logic Auto của Pi
hooks/                 useRealtime, useRoomControl, useEnergy
utils/                 format, evn (tính tiền bậc thang), energy (lịch sử giả lập)
components/            Layout, ui (StatCard, Modal, Toggle, Tabs...), RoomWidgets, SensorChart, GasAlertModal, Toasts
pages/user/            Dashboard, Room, Energy, History, HomeSettings
pages/admin/           AdminDashboard, AdminUsers, AdminAlerts, EvnPricing
pages/                 Landing (giới thiệu sản phẩm), Login, Account (dùng chung)
components/landing/    BrandMark (logo), HeroEmblem, effects (hiệu ứng cuộn/chữ)
```

## MQTT topic

| Topic | Hướng | Payload |
|---|---|---|
| `smarthome/{homeId}/{room}/sensors` | ESP32 → Web | `{temperature, humidity, lux \| gas, presence, power}` |
| `smarthome/{homeId}/{room}/state` | ESP32 → Web | `{mode, devices: {light, fan, buzzer}, alarm}` |
| `smarthome/{homeId}/{room}/cmd` | Web → Pi/ESP32 | `{mode}` hoặc `{device, value}` |
| `smarthome/{homeId}/{room}/event` | Pi → Web | `{actor, action}` |
| `smarthome/{homeId}/{room}/alert` | Pi → Web | `{event: start\|end, type: 'gas', ...}` |

Khi đổi topic/payload phải cập nhật cả bảng này, `web/README.md` và `services/realtime.js`.

## Quy ước code

- Toàn bộ giao diện **thuần tiếng Việt**; comment trong code viết tiếng Việt, ngắn gọn.
- Route tiếng Việt không dấu: `/` landing, `/dang-nhap`, app user dưới `/nha` (`/nha/phong/:roomId`, `/nha/dien-nang`...), admin dưới `/admin`. Trang chính sau đăng nhập lấy từ `homePathOf()` trong `store/auth.js`.
- Phong cách landing/đăng nhập (tham khảo bima.framer.media): nền `bg-night` (#000319), font `font-display` (Plus Jakarta Sans), tiêu đề chữ gradient `text-grad` / `text-grad-warm`, nhãn `eyebrow` dạng `[ ... ]`, thẻ `glass-card`, `HeroEmblem` (ô kính logo + cảm biến bay quanh) ở hero, ở trang đăng nhập dùng `HeroEmblem center={false} inner={false}` cho cảm biến bay quanh form, tia sáng tĩnh góc trái. Hiệu ứng trong `components/landing/effects.jsx` (Reveal, BlurWords, Scramble, ScrollWords, useScrollFrame). Lưu ý: không đặt `text-grad` lên phần tử cha của chữ có animation – gán cho từng từ.
- Hiệu năng hiệu ứng: chỉ animate `transform`/`opacity`; không animate `filter: blur`, không xoay phần tử có blur/mix-blend; hiệu ứng theo cuộn cập nhật style qua ref trong `useScrollFrame`, không `setState` mỗi khung hình; phần tự nhảy số tách thành component nhỏ.
- Logo: `LogoIcon` (mái nhà + sóng tín hiệu, gradient tím→cam) trong `components/landing/BrandMark.jsx`; favicon `public/favicon.svg` cùng thiết kế.
- Số thập phân hiển thị dấu phẩy (29,5 °C).
- Giao diện sáng/tối trong app: `store/theme.js` + nút ở header (`Layout.jsx`) bật class `.dark` trên `<html>` (gỡ khi rời app). Chế độ tối KHÔNG dùng `dark:` từng chỗ mà đổi biến màu Tailwind trong khối `.dark` ở `index.css` (slate đảo ngược, nền nhạt `*-50/100` thành màu trong suốt, chữ `*-600/700/800` sáng lên). Nền thẻ/ô nhập dùng `var(--surface)`. Khi viết trang mới: dùng màu slate/ tint như các trang hiện có; overlay dùng `bg-black/50` (không dùng `bg-slate-900/..`); nút trắng cố định dùng `bg-[#fff]`.
- Style bằng Tailwind utility; class dùng chung (`card`, `btn-primary`, `input`, `label`...) khai báo bằng `@utility` trong `src/index.css`.
- Component UI nhỏ tái sử dụng đặt trong `components/ui.jsx` trước khi tạo file mới.
- Trang không gọi trực tiếp simulator; mọi lệnh đi qua `sendCommand()` trong `services/realtime.js` (để thay MQTT thật không phải sửa giao diện).
- Thao tác của người dùng lên thiết bị phải ghi nhật ký (`db.addLog`) – xem `hooks/useRoomControl.js`.
- Responsive: kiểm tra ở bề rộng điện thoại (~390px), không tràn ngang.

## Tiến độ

- [x] Giai đoạn 1: Web tĩnh với dữ liệu giả lập (xong 28/10/2026)
- [ ] Tạo project Firebase; web dùng Firebase Auth + Firestore (thay `store/db.js`), Realtime Database (thay MockClient trong `services/realtime.js`)
- [ ] Gateway Python trên Pi 5: Mosquitto, cầu nối MQTT <-> Firebase, logic Auto, cảnh báo gas, gửi Gmail, tạo tài khoản (Admin SDK)
- [ ] Firmware ESP32 theo topic ở trên, gỡ "Công cụ giả lập" ở trang Phòng
- [ ] (Sau này) AI dự đoán điện năng

## Quản lý file này

- Giữ CLAUDE.md **dưới 200 dòng**. Khi vượt quá, tách các mục chi tiết sang `.claude/rules/*.md` (mỗi file 1 chủ đề, ví dụ `business-rules.md`, `mqtt.md`, `web-conventions.md`, `backend.md`), có thể thêm frontmatter `paths:` để chỉ nạp khi làm việc với thư mục tương ứng; ở đây chỉ để lại tóm tắt + liên kết.
- Cập nhật mục **Tiến độ** và **Quy tắc nghiệp vụ** mỗi khi người dùng chốt thay đổi.
