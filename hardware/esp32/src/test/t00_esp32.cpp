// Bước 0: Kiểm tra ESP32 (chưa cắm linh kiện nào)
// - Đèn LED xanh trên board (GPIO2) nhấp nháy
// - Serial Monitor (115200) in thông tin chip + danh sách WiFi xung quanh
#include <Arduino.h>
#include <WiFi.h>

const int LED_BUILTIN_PIN = 2;

void setup() {
  Serial.begin(115200);
  delay(500);
  pinMode(LED_BUILTIN_PIN, OUTPUT);

  Serial.println();
  Serial.println("=== ESP32 OK ===");
  Serial.printf("Chip: %s, rev %d, %d nhan, %d MHz\n", ESP.getChipModel(), ESP.getChipRevision(),
                ESP.getChipCores(), ESP.getCpuFreqMHz());
  Serial.printf("Flash: %d MB\n", ESP.getFlashChipSize() / (1024 * 1024));
  Serial.printf("MAC: %s\n", WiFi.macAddress().c_str());

  // Quét WiFi để chắc ăng-ten hoạt động (sau này cần kết nối MQTT)
  WiFi.mode(WIFI_STA);
  Serial.println("Dang quet WiFi...");
  int n = WiFi.scanNetworks();
  Serial.printf("Tim thay %d mang:\n", n);
  for (int i = 0; i < n; i++) {
    Serial.printf("  %2d. %-24s %4d dBm\n", i + 1, WiFi.SSID(i).c_str(), WiFi.RSSI(i));
  }
}

void loop() {
  digitalWrite(LED_BUILTIN_PIN, HIGH);
  delay(500);
  digitalWrite(LED_BUILTIN_PIN, LOW);
  delay(500);
}
