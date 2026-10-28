# Web – Hệ thống giám sát và quản lý nhà thông minh

Giao diện web (React + Vite + TailwindCSS + Recharts). Giai đoạn hiện tại là **web tĩnh với dữ liệu giả lập**, chưa kết nối phần cứng.

## Chạy

```bash
npm install
npm run dev        # http://localhost:5173 (máy khác trong LAN: http://<ip-máy>:5173)
npm run build      # build ra thư mục dist/
```

Tài khoản demo:

| Vai trò | Tên đăng nhập | Mật khẩu |
|---|---|---|
| Chủ nhà (user) | `hoang` | `123456` |
| Thành viên cùng nhà | `lan` | `123456` |
| Quản trị viên | `admin` | `admin123` |

Dữ liệu lưu trong `localStorage` của trình duyệt. Muốn reset dữ liệu mẫu: xoá key `smarthome-db` trong DevTools → Application → Local Storage.

Mẹo demo: mở 1 tab đăng nhập `hoang`, 1 tab đăng nhập `admin` (mỗi tab giữ phiên riêng). Vào Phòng bếp → bật "Giả lập rò rỉ khí gas" → tab admin thấy cảnh báo và bấm "Nhắc nhở" → tab user hiện lại popup.

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
| `smarthome/{homeId}/{room}/state` | ESP32 → Web | `{mode, devices: {light, fan, buzzer}, alarm}` |
| `smarthome/{homeId}/{room}/cmd` | Web → Pi/ESP32 | `{mode: "auto" \| "manual"}` hoặc `{device, value}` |
| `smarthome/{homeId}/{room}/event` | Pi → Web | `{actor, action}` |
| `smarthome/{homeId}/{room}/alert` | Pi → Web | `{event: "start" \| "end", type: "gas", ...}` |

`room` là `living` (phòng khách) hoặc `kitchen` (phòng bếp).

## Quy tắc tự động

- **Tự động**: PIR phát hiện có người → bật đèn + quạt; không có người sau X phút (cài trong "Cài đặt nhà") → tắt.
- **Thủ công**: người dùng bật/tắt đèn, quạt bằng nút trên web.
- **Khí gas vượt ngưỡng**: còi kêu, gửi email, hiện cảnh báo trên web; đèn và quạt giữ nguyên, tạm khoá điều khiển (tránh phát tia lửa điện).
- Ngưỡng nhiệt độ, độ ẩm, ánh sáng chỉ để hiển thị, không ảnh hưởng chế độ Tự động.
