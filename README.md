# Nhà Thông Minh

Đồ án 2 – Hệ thống giám sát và quản lý nhà thông minh · Tống Hữu Huy Hoàng

Theo dõi nhiệt độ, độ ẩm, chuyển động, khí gas từng phòng theo thời gian thực; bật/tắt đèn, quạt qua web (dùng được trên điện thoại).

```
ESP32 (2 phòng) ──MQTT──> Raspberry Pi 5 ──> Firebase ──> Web
```

| Phòng | Cảm biến | Thiết bị |
|---|---|---|
| Phòng khách | DHT22, PIR, LCD | Đèn, quạt |
| Phòng bếp | DHT22, MQ-2, PIR, LCD | Đèn, quạt, còi |

## Chức năng

- **Tự động**: có người → bật đèn + quạt, vắng người sau X phút → tắt. **Thủ công**: bật/tắt trên web.
- **Rò rỉ gas**: còi kêu, cảnh báo trên web, gửi Gmail; đèn và quạt giữ nguyên để tránh tia lửa điện.
- **Nhiều thành viên** dùng chung một nhà; nhật ký ghi ai làm gì.
- **Admin**: quản lý nhà, cấp tài khoản qua Gmail, xem và nhắc nhở cảnh báo.

## Thư mục

| Thư mục | Nội dung |
|---|---|
| [`web/`](web/README.md) | Web React + Firebase |
| [`gateway/`](gateway/README.md) | Chương trình Python trên Pi + Mosquitto, kèm hướng dẫn nạp ESP32 |
| `hardware/esp32/` | Firmware PlatformIO (env `node_phong_khach`, `node_phong_bep`) và bài test linh kiện |
| `hardware/*.html` | Sơ đồ nối chân (mở bằng trình duyệt) |
| `firebase/` | Luật bảo mật Firebase |

## Chạy web

```bash
cd web
cp .env.example .env.local   # điền khoá Firebase, EmailJS
npm install
npm run dev                  # http://localhost:5173
```

Chưa có phần cứng thì để trống `VITE_FIREBASE_DATABASE_URL`, web tự dùng dữ liệu giả lập.

> Không commit: `web/.env.local`, `gateway/service-account.json`, `hardware/esp32/include/secrets.h`.
