// Bước 13: Kiểm tra mối hàn hàng rào bên TRÁI của ESP32 trên mạch xanh
// Lần lượt bật HIGH từng chân output (2 giây/chân), đo ở mối hàn mặt dưới so với GND (trái):
// chân đang HIGH ≈ 3,3 V, các chân khác ≈ 0 V. Chân chỉ vào (VP, VN, D34, D35) in giá trị ADC.
#include <Arduino.h>

const int OUT_PINS[] = {32, 33, 25, 26, 27, 14, 12, 13};
const int IN_PINS[] = {36, 39, 34, 35}; // VP, VN, D34, D35

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== Test hang rao ben trai ===");
  Serial.println("Do VIN - GND (trai) ~ 5V truoc, roi do tung chan khi no HIGH");
  for (int p : OUT_PINS) {
    pinMode(p, OUTPUT);
    digitalWrite(p, LOW);
  }
}

void loop() {
  for (int p : OUT_PINS) {
    digitalWrite(p, HIGH);
    Serial.printf("D%-2d = HIGH (3,3V)  | ADC:", p);
    for (int a : IN_PINS) Serial.printf(" %d=%4d", a, analogRead(a));
    Serial.println();
    delay(2000);
    digitalWrite(p, LOW);
  }
}
