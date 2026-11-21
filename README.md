# Nhà Thông Minh – Hệ thống giám sát và quản lý nhà thông minh

Đồ án 2 – Tống Hữu Huy Hoàng.

Giám sát nhiệt độ, độ ẩm, chuyển động, khí gas của từng phòng theo thời gian thực và điều khiển đèn, quạt qua web (responsive, dùng được trên điện thoại).

```
2 x ESP32 ──MQTT (LAN)──> Raspberry Pi 5 (Gateway) <──> Firebase <──> Web
                          ├─ Mosquitto (MQTT broker)     ├─ Realtime Database
                          └─ main.py: MQTT <-> Firebase, ├─ Firestore
                             cảnh báo gas, gửi Gmail     └─ Authentication
```

| Phòng | Cảm biến | Thiết bị |
|---|---|---|
| Phòng khách | DHT22, PIR, LCD1602 | Đèn LED, quạt mini |
| Phòng bếp | DHT22, MQ-2, PIR, LCD1602 | Đèn LED, quạt, còi báo |

## Chức năng chính

- **Tự động / Thủ công** theo từng phòng: Tự động thì PIR có người → bật đèn + quạt, vắng người sau X phút → tắt; Thủ công thì bật/tắt bằng nút trên web.
- **Cảnh báo khí gas** (phòng bếp): còi kêu, popup trên web, gửi Gmail; đèn và quạt giữ nguyên trạng thái để tránh tia lửa điện.
- **Nhiều nhà, nhiều thành viên**: mỗi nhà nhiều tài khoản dùng chung thiết bị, nhật ký ghi ai làm gì.
- **Admin**: quản lý nhà và tài khoản, cấp tài khoản (gửi mật khẩu qua Gmail), thống kê, xem và nhắc nhở cảnh báo của mọi nhà.
- **Node ESP32**: nút SET đổi ID node (1–10), giữ 5 giây để cài WiFi + ID nhà qua trình duyệt (`192.168.4.1`), LCD hiện nhiệt độ, độ ẩm, trạng thái.

## Thư mục

| Thư mục | Nội dung | Hướng dẫn |
|---|---|---|
| `web/` | Web React 19 + Vite + Tailwind v4 + Firebase | [web/README.md](web/README.md) |
| `gateway/` | Chương trình Python trên Raspberry Pi 5 + cấu hình Mosquitto | [gateway/README.md](gateway/README.md) |
| `hardware/esp32/` | Firmware PlatformIO: `src/node/node.cpp` (env `node_phong_khach`, `node_phong_bep`), bài test từng linh kiện `src/test/` | Bước 5 trong [gateway/README.md](gateway/README.md) |
| `hardware/*.html` | Sơ đồ nối chân node phòng khách, phòng bếp (mở bằng trình duyệt) | |
| `firebase/` | Luật bảo mật Firestore, Realtime Database | |

## Chạy nhanh

```bash
cd web
cp .env.example .env.local   # điền khoá Firebase, EmailJS
npm install
npm run dev                  # http://localhost:5173
```

Không điền `VITE_FIREBASE_DATABASE_URL` thì web dùng dữ liệu giả lập, không cần phần cứng.

Các file bí mật **không commit**: `web/.env.local`, `gateway/service-account.json`, `hardware/esp32/include/secrets.h`.
