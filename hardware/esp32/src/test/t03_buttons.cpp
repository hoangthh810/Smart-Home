// Bước 3: Kiểm tra 2 nút nhấn – D32 (SET: đổi ID node), D33 (OK: lưu ID / xem thông tin)
// Mỗi nút: 1 chân vào GPIO, chân còn lại xuống GND (dùng điện trở kéo lên trong ESP32)
#include <Arduino.h>

struct Button {
  const char *name;
  int pin;
  bool last;          // trạng thái đã lọc nhiễu (true = đang nhả)
  bool raw;
  unsigned long changedAt;
  int count;
};

Button buttons[] = {
  {"Nut SET (D32)", 32, true, true, 0, 0},
  {"Nut OK  (D33)", 33, true, true, 0, 0},
};
const unsigned long DEBOUNCE_MS = 30;

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println("=== Test nut nhan (D32, D33) ===");
  for (auto &b : buttons) {
    pinMode(b.pin, INPUT_PULLUP);
    b.last = b.raw = digitalRead(b.pin);
    Serial.printf("%s luc dau: %s\n", b.name, b.last ? "NHA (dung)" : "DANG NHAN -> kiem tra day, co the nut cam sai chieu");
  }
  Serial.println("Hay bam thu tung nut...");
}

void loop() {
  for (auto &b : buttons) {
    bool r = digitalRead(b.pin);
    if (r != b.raw) {
      b.raw = r;
      b.changedAt = millis();
    }
    if (millis() - b.changedAt > DEBOUNCE_MS && b.raw != b.last) {
      b.last = b.raw;
      if (!b.last) {
        b.count++;
        Serial.printf("%s: NHAN  (lan %d)\n", b.name, b.count);
      } else {
        Serial.printf("%s: nha\n", b.name);
      }
    }
  }
}
