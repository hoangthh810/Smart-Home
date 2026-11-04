// Bước 11: Kiểm tra buzzer active TMB12A05 – chân dài (+) vào D23, chân ngắn (−) xuống GND (nối thẳng, không transistor)
// Buzzer định mức 5V nên ở 3,3V kêu nhỏ hơn – bình thường. Cắm ngược chân sẽ không kêu
// Lặp: kêu liền 1 giây → nghỉ 1 giây → kêu kiểu báo gas (5 tiếng ngắn) → nghỉ 2 giây
#include <Arduino.h>
#include <driver/gpio.h>

const int BUZZER_PIN = 23;

void beep(int ms) {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(ms);
  digitalWrite(BUZZER_PIN, LOW);
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println("=== Test buzzer (D23) ===");
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  gpio_set_drive_capability((gpio_num_t)BUZZER_PIN, GPIO_DRIVE_CAP_3); // dòng ra lớn nhất (~40 mA) cho to hơn
}

void loop() {
  Serial.println("Keu lien 1 giay");
  beep(1000);
  delay(1000);

  Serial.println("Keu kieu bao gas (5 tieng ngan)");
  for (int i = 0; i < 5; i++) {
    beep(150);
    delay(150);
  }
  delay(2000);
}
