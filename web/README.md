# Web – Hệ thống giám sát và quản lý nhà thông minh

Giao diện web (React + Vite + TailwindCSS + Recharts). Đăng nhập, nhà, tài khoản chạy trên Firebase; dữ liệu cảm biến thật đi từ ESP32 → Pi → Realtime Database (chưa cấu hình thì dùng giả lập).

## Chạy

```bash
npm install
npm run dev        # http://localhost:5173 (máy khác trong LAN: http://<ip-máy>:5173)
npm run build      # build ra thư mục dist/
```

Cấu hình: sao chép `.env.example` thành `.env.local` rồi điền thông số Firebase + EmailJS. Luật bảo mật Firestore ở `../firebase/firestore.rules`.

Đăng nhập bằng email (Firebase Auth). Admin gốc tạo tay trong Firebase Console (UID ghi vào `VITE_BOOTSTRAP_ADMIN_UID`); tài khoản người dùng do admin cấp ở trang **Nhà & tài khoản** (gửi email đăng nhập + mật khẩu qua EmailJS).

Nhà và tài khoản lưu trên Firestore. Cài đặt, cảnh báo, nhật ký vẫn lưu `localStorage` (key `smarthome-db`) – sẽ chuyển dần lên Firebase.

Mẹo demo: mở 1 tab đăng nhập tài khoản user, 1 tab đăng nhập admin (mỗi tab giữ phiên riêng). Vào Phòng bếp → bật "Giả lập rò rỉ khí gas" → tab admin thấy cảnh báo và bấm "Nhắc nhở" → tab user hiện lại popup.

## Cấu trúc

```
src/
  data/constants.js      Phòng, thiết bị, cài đặt mặc định
  data/seed.js           Dữ liệu khởi tạo phần còn giả lập (cài đặt, cảnh báo, nhật ký)
  store/db.js            Phần còn lưu localStorage: cài đặt nhà, cảnh báo, nhật ký
  store/auth.js          Firebase Auth + hồ sơ, danh sách nhà/tài khoản (Firestore)
  store/live.js          Trạng thái thời gian thực (cảm biến, thiết bị) + thông báo
  services/firebase.js   Khởi tạo Firebase, dịch mã lỗi sang tiếng Việt
  services/accounts.js   Admin: tạo/sửa/xoá nhà và tài khoản
  services/mail.js       Gửi email cấp tài khoản qua EmailJS
  services/realtime.js   Lớp kết nối realtime – Realtime Database (dữ liệu thật qua Pi) hoặc MockClient (giả lập)
  services/simulator.js  Giả lập 2 ESP32 + logic Auto
  hooks/                 useRealtime, useRoomControl
  pages/user/            Tổng quan, Phòng, Lịch sử, Cài đặt nhà
  pages/admin/           Tổng quan, Nhà & tài khoản, Cảnh báo
```

## MQTT topic

| Topic | Hướng | Payload |
|---|---|---|
| `smarthome/{homeId}/{room}/sensors` | ESP32 → Web | `{temperature, humidity, gas (chỉ bếp), presence}` |
| `smarthome/{homeId}/{room}/state` | ESP32 → Web | `{nodeId, mode, devices: {light, fan, buzzer}, alarm}` |
| `smarthome/{homeId}/{room}/cmd` | Web → Pi/ESP32 | `{mode: "auto" \| "manual"}` hoặc `{device, value}` |
| `smarthome/{homeId}/{room}/event` | Pi → Web | `{actor, action}` |
| `smarthome/{homeId}/{room}/alert` | Pi → Web | `{event: "start" \| "end", type: "gas", ...}` |
| `smarthome/{homeId}/{room}/config` | Pi → ESP32 | `{gasThreshold, offDelaySec}` (retained, từ cài đặt nhà) |

Web không nói MQTT trực tiếp: gateway trên Pi (`gateway/`) chép sang Realtime Database – `live/{homeId}/{room}/{sensors\|state\|event\|alert}` (Pi ghi), `cmd/{homeId}/{room}` (web ghi lệnh), `settings/{homeId}` (web ghi cài đặt), `members/{homeId}/{uid}` (Pi đồng bộ từ Firestore, dùng cho luật bảo mật `firebase/database.rules.json`). Chưa điền `VITE_FIREBASE_DATABASE_URL` thì web dùng giả lập.

`room` là `living` (phòng khách) hoặc `kitchen` (phòng bếp).

## Quy tắc tự động

- **Tự động**: PIR phát hiện có người → bật đèn + quạt; không có người sau X phút (cài trong "Cài đặt nhà") → tắt.
- **"Có người"**: có chuyển động trong khoảng 5 giây gần nhất (PIR tự giữ ~3 giây + node giữ thêm 2 giây).
- **Thủ công**: người dùng bật/tắt đèn, quạt bằng nút trên web (không có nút bấm vật lý điều khiển thiết bị).
- **Nút nhấn trên node** (chỉ 1 nút SET = D32): bấm để tăng ID node 1 → 10 rồi quay về 1 (tự lưu flash), giữ 5 giây để cài WiFi; không bật/tắt đèn quạt. ID hiện trên LCD và gửi lên web trong `state.nodeId`.
- **Khí gas vượt ngưỡng**: còi kêu, gửi email, hiện cảnh báo trên web; đèn và quạt giữ nguyên, tạm khoá điều khiển (tránh phát tia lửa điện).
- Ngưỡng nhiệt độ, độ ẩm chỉ để hiển thị, không ảnh hưởng chế độ Tự động.
