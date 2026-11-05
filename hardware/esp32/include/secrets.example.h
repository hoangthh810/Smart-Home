// Sao chép thành secrets.h rồi điền (secrets.h không commit)
#pragma once

// 2 mạng WiFi 2.4 GHz (ESP32 không bắt được 5 GHz), mạng nào có sóng thì vào mạng đó
#define WIFI_SSID "ten-wifi-nha"
#define WIFI_PASS "mat-khau-wifi-nha"
#define WIFI2_SSID ""                  // hotspot 4G điện thoại (để "" nếu không dùng)
#define WIFI2_PASS ""

#define MQTT_HOSTNAME "pi"             // hostname của Raspberry Pi → tìm theo tên pi.local, đổi mạng không phải sửa IP
#define MQTT_HOST "192.168.1.25"       // IP dự phòng (WiFi nhà) khi không tìm được theo tên
#define MQTT_HOST2 ""                  // IP dự phòng thứ 2 (hotspot), để "" nếu không dùng
#define MQTT_PORT 1883
#define MQTT_USER "smarthome"          // user tạo bằng mosquitto_passwd trên Pi
#define MQTT_PASS "mat-khau-mqtt"
#define HOME_ID "dien-id-nha"          // ID nhà trên Firestore (Firebase Console → Firestore → homes)
