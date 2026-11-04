// Bước 10: Kiểm tra MQ-2 – VCC 5V (chân VIN), GND, AO → 330Ω → D34 → 330Ω → 330Ω → GND, DO để trống
// KHÔNG cắm AO thẳng vào D34 (AO lên tới 5V). D34 nhận 2/3 điện áp AO
// Sau khi cấp điện chờ ~1–3 phút cho sợi đốt nóng; thử bằng cách xả ga bật lửa (không bật lửa) gần cảm biến
#include <Arduino.h>

const int MQ2_PIN = 34;        // ADC1 – đọc được cả khi bật WiFi
const float DIVIDER = 1.5;     // AO = điện áp chân D34 × (330 + 660) / 660
const unsigned long WARMUP_MS = 60000;

int minRaw = 4095, maxRaw = 0;

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println("=== Test MQ-2 (D34) ===");
  analogReadResolution(12);            // 0–4095
  analogSetPinAttenuation(MQ2_PIN, ADC_11db); // đo được tới ~3,1V
  Serial.println("Cho soi dot nong ~60 giay, so do luc nay con tut dan la binh thuong...");
}

void loop() {
  // lấy trung bình 16 lần cho đỡ nhiễu
  long sum = 0, mv = 0;
  for (int i = 0; i < 16; i++) {
    sum += analogRead(MQ2_PIN);
    mv += analogReadMilliVolts(MQ2_PIN);
  }
  int raw = sum / 16;
  float vPin = mv / 16 / 1000.0;

  bool warm = millis() >= WARMUP_MS;
  if (warm) {
    minRaw = min(minRaw, raw);
    maxRaw = max(maxRaw, raw);
  }

  Serial.printf("[%4lus] raw: %4d | D34: %.2f V | AO: %.2f V", millis() / 1000, raw, vPin, vPin * DIVIDER);
  if (warm) Serial.printf(" | thap nhat: %d, cao nhat: %d", minRaw, maxRaw);
  else Serial.print(" | dang lam nong");
  if (raw >= 4000) Serial.print("  << cham muc toi da 4095");
  Serial.println();
  delay(500);
}
