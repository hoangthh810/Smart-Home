// Bước 9: Kiểm tra Relay 2 + đèn LED – IN nối D25, relay kích mức cao (jumper ở H)
// LED: NO -> điện trở 330Ω -> chân dài (anode), chân ngắn (cathode) -> GND
// Tự bật 3 giây / tắt 3 giây. Gõ 1 (bật), 0 (tắt), a (tự động) trong Serial Monitor rồi Enter.
#include <Arduino.h>

const int RELAY_PIN = 25;
bool on = false;
bool autoCycle = true;
unsigned long lastToggle = 0;

void setRelay(bool value) {
  on = value;
  digitalWrite(RELAY_PIN, on ? HIGH : LOW);
  Serial.printf("[%5lus] Relay %s -> den %s\n", millis() / 1000, on ? "DONG" : "MO", on ? "SANG" : "TAT");
}

void setup() {
  Serial.begin(115200);
  delay(500);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  Serial.println();
  Serial.println("=== Test Relay 2 + den LED (D25) ===");
  Serial.println("Tu dong bat/tat moi 3 giay. Go 1 = bat, 0 = tat, a = tu dong.");
}

void loop() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '1') { autoCycle = false; setRelay(true); }
    else if (c == '0') { autoCycle = false; setRelay(false); }
    else if (c == 'a') { autoCycle = true; Serial.println("Che do tu dong bat/tat"); }
  }
  if (autoCycle && millis() - lastToggle >= 3000) {
    lastToggle = millis();
    setRelay(!on);
  }
}
