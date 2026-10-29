// Bước 4: Kiểm tra PIR HC-SR501 – OUT nối D27, nguồn 5V (ngõ ra 3.3V nên nối thẳng ESP32 được)
// Sau khi cấp nguồn PIR cần ~60 giây để ổn định, lúc này có thể báo sai
#include <Arduino.h>

const int PIR_PIN = 27;
const int LED_PIN = 2;  // đèn trên board sáng khi có người
bool last = false;
unsigned long since = 0;

void setup() {
  Serial.begin(115200);
  delay(500);
  pinMode(PIR_PIN, INPUT_PULLDOWN);
  pinMode(LED_PIN, OUTPUT);
  Serial.println();
  Serial.println("=== Test PIR HC-SR501 (D27) ===");
  Serial.println("Doi ~60 giay cho PIR on dinh, dung yen ngoai tam nhin cua no...");
}

void loop() {
  bool now = digitalRead(PIR_PIN);
  digitalWrite(LED_PIN, now);
  if (now != last) {
    unsigned long t = millis();
    if (now) {
      Serial.printf("[%5lus] CO NGUOI  (truoc do yen %lus)\n", t / 1000, (t - since) / 1000);
    } else {
      Serial.printf("[%5lus] khong co nguoi  (OUT giu HIGH %lus)\n", t / 1000, (t - since) / 1000);
    }
    last = now;
    since = t;
  }
  delay(50);
}
