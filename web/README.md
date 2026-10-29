# Web – Hệ thống giám sát và quản lý nhà thông minh

Giao diện web (React + Vite + TailwindCSS + Recharts). Giai đoạn hiện tại là **web tĩnh với dữ liệu giả lập**, chưa kết nối phần cứng.

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
  data/constants.js      Phòng, thiết bị, bảng giá EVN mặc định, cài đặt mặc định
  data/seed.js           Dữ liệu mẫu (nhà, tài khoản, cảnh báo, nhật ký)
  store/db.js            "Cơ sở dữ liệu" giả lập (sẽ thay bằng API FastAPI)
  store/auth.js          Đăng nhập
  store/live.js          Trạng thái thời gian thực (cảm biến, thiết bị)
  services/realtime.js   Lớp kết nối MQTT – hiện dùng MockClient, sau thay bằng mqtt.js
  services/simulator.js  Giả lập 2 ESP32 + logic Auto trên Raspberry Pi
  hooks/                 useRealtime, useRoomControl, useEnergy
  utils/evn.js           Tính tiền điện bậc thang
  pages/user/            Tổng quan, Phòng, Điện năng, Lịch sử, Cài đặt nhà
  pages/admin/           Tổng quan, Nhà & tài khoản, Cảnh báo, Bảng giá EVN
```

## MQTT topic dự kiến

| Topic | Hướng | Payload |
|---|---|---|
| `smarthome/{homeId}/{room}/sensors` | ESP32 → Web | `{temperature, humidity, lux \| gas, presence, power}` |
| `smarthome/{homeId}/{room}/state` | ESP32 → Web | `{nodeId, mode, devices: {light, fan, buzzer}, alarm}` |
| `smarthome/{homeId}/{room}/cmd` | Web → Pi/ESP32 | `{mode: "auto" \| "manual"}` hoặc `{device, value}` |
| `smarthome/{homeId}/{room}/event` | Pi → Web | `{actor, action}` |
| `smarthome/{homeId}/{room}/alert` | Pi → Web | `{event: "start" \| "end", type: "gas", ...}` |

`room` là `living` (phòng khách) hoặc `kitchen` (phòng bếp).

## Quy tắc tự động

- **Tự động**: PIR phát hiện có người → bật đèn + quạt; không có người sau X phút (cài trong "Cài đặt nhà") → tắt.
- **Thủ công**: người dùng bật/tắt đèn, quạt bằng nút trên web (không có nút bấm vật lý điều khiển thiết bị).
- **Nút nhấn trên node** (SET = D32, OK = D33): chỉ để cài ID node (1–99, lưu flash). ID hiện trên LCD và gửi lên web trong `state.nodeId`.
- **Khí gas vượt ngưỡng**: còi kêu, gửi email, hiện cảnh báo trên web; đèn và quạt giữ nguyên, tạm khoá điều khiển (tránh phát tia lửa điện).
- Ngưỡng nhiệt độ, độ ẩm, ánh sáng chỉ để hiển thị, không ảnh hưởng chế độ Tự động.
