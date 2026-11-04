# Gateway trên Raspberry Pi 5

Cầu nối giữa các ESP32 (MQTT trong LAN) và web (Firebase):

```
ESP32 ──MQTT──> Mosquitto (Pi) ──> main.py ──> Realtime Database live/...      ──> Web
ESP32 <──MQTT── Mosquitto (Pi) <── main.py <── Realtime Database cmd/, settings/ <── Web
                                    └─ gas: ghi cảnh báo + gửi Gmail
```

- `main.py`: chương trình chính. `logic.py`: logic thuần (cảnh báo gas, nhật ký Auto, kiểm tra lệnh). Test: `python test_logic.py`.
- Auto (PIR) và báo gas chạy **trên ESP32**. Pi chỉ chuyển dữ liệu, sinh cảnh báo/nhật ký và gửi email.
- Topic MQTT: xem bảng trong `CLAUDE.md`.

## Bước 1 – Firebase (làm trên máy tính)

1. **Tạo Realtime Database**: Firebase Console → Build → Realtime Database → Create Database → vị trí **Singapore (asia-southeast1)** → *Start in locked mode*.
2. **Dán luật bảo mật**: tab Rules → dán nội dung `firebase/database.rules.json` → Publish.
3. **Lấy URL database** (đầu trang Data, dạng `https://smart-home-9efb8-default-rtdb.asia-southeast1.firebasedatabase.app`):
   - thêm vào `web/.env.local`: `VITE_FIREBASE_DATABASE_URL=<URL>` rồi chạy lại `npm run dev`;
   - dùng cho `FIREBASE_DB_URL` ở bước 3.
4. **Tải khoá service account**: Project settings → Service accounts → *Generate new private key* → lưu thành `gateway/service-account.json`. File này có toàn quyền project: **không commit, không gửi ai**.
5. **Lấy ID nhà**: Firestore → collection `homes` → ID của document nhà (chuỗi ~20 ký tự) → dùng cho `HOME_ID` trong firmware.

## Bước 2 – Cài Mosquitto trên Pi

```bash
sudo apt update && sudo apt install -y mosquitto mosquitto-clients python3-venv
sudo mosquitto_passwd -c /etc/mosquitto/passwd smarthome     # nhập mật khẩu MQTT 2 lần
sudo chown root:mosquitto /etc/mosquitto/passwd && sudo chmod 640 /etc/mosquitto/passwd
sudo cp ~/smarthome/gateway/mosquitto.conf /etc/mosquitto/conf.d/smarthome.conf   # sau khi chép code ở bước 3
sudo systemctl restart mosquitto && sudo systemctl enable mosquitto
hostname -I        # IP của Pi → MQTT_HOST trong firmware
```

Nên đặt IP cố định cho Pi (router → DHCP reservation) để ESP32 không mất kết nối khi Pi đổi IP.

## Bước 3 – Chép code và chạy thử

Trên máy tính (PowerShell, trong thư mục `E:\DA2`), thay `pi@<ip-pi>` bằng user và IP của Pi:

```powershell
ssh pi@<ip-pi> "mkdir -p ~/smarthome"
scp -r gateway pi@<ip-pi>:~/smarthome/
```

Trên Pi:

```bash
cd ~/smarthome/gateway
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env && nano .env      # điền FIREBASE_DB_URL, MQTT_PASS, (tuỳ chọn) GMAIL_USER, GMAIL_APP_PASSWORD
chmod 600 .env service-account.json
.venv/bin/python test_logic.py
set -a && . ./.env && set +a && .venv/bin/python main.py
```

Thấy `Đã kết nối MQTT broker`, `Đồng bộ thành viên: N nhà`, `Gateway đang chạy` là được. Ctrl+C để dừng.

Xem bản tin từ ESP32 (cửa sổ SSH khác): `mosquitto_sub -h localhost -u smarthome -P <mat-khau> -t 'smarthome/#' -v`

## Bước 4 – Chạy tự động khi Pi khởi động

```bash
sed -i "s#/home/pi/#/home/$USER/#g; s#^User=pi#User=$USER#" smarthome-gateway.service   # nếu user không phải "pi"
sudo cp smarthome-gateway.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now smarthome-gateway
journalctl -u smarthome-gateway -f      # xem log
```

Sửa code xong: chép lại bằng `scp` rồi `sudo systemctl restart smarthome-gateway`.

## Bước 5 – ESP32

1. Sao chép `hardware/esp32/include/secrets.example.h` thành `secrets.h` (đã có sẵn bản mẫu), điền WiFi 2.4 GHz, IP Pi, mật khẩu MQTT, `HOME_ID`.
2. Nạp env `node_phong_bep`. Serial Monitor phải thấy `MQTT: ket noi ... OK`; nút OK trên node hiện IP / trạng thái kết nối.

## Gỡ lỗi nhanh

| Hiện tượng | Kiểm tra |
|---|---|
| ESP32 báo `loi 5` | sai user/mật khẩu MQTT |
| ESP32 báo `loi -2` | sai IP Pi, Pi chưa chạy Mosquitto, hoặc khác mạng WiFi |
| Pi báo `Permission denied` khi ghi Firebase | sai `FIREBASE_DB_URL` hoặc file service account |
| Web không có số đo | đã điền `VITE_FIREBASE_DATABASE_URL` chưa; tài khoản phải thuộc đúng nhà (`HOME_ID`) và đang hoạt động; xem Console (F12) |
| Không nhận email cảnh báo | Cài đặt nhà có email nhận chưa; `GMAIL_APP_PASSWORD` là mật khẩu ứng dụng (không phải mật khẩu Gmail) |
