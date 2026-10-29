// Bước 6: Kiểm tra LCD1602 I2C – SDA D21, SCL D22, nguồn 5V
// Tự dò địa chỉ (0x27 hoặc 0x3F), hiện chữ + bộ đếm giây
#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C *lcd = nullptr;

bool found(uint8_t addr) {
  Wire.beginTransmission(addr);
  return Wire.endTransmission() == 0;
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println("=== Test LCD1602 I2C ===");
  Wire.begin(21, 22);

  uint8_t addr = 0;
  for (uint8_t a : {0x27, 0x3F, 0x20, 0x38}) {
    if (found(a)) { addr = a; break; }
  }
  if (!addr) {
    Serial.println("LOI: khong tim thay LCD -> kiem tra SDA (D21), SCL (D22), VCC 5V, GND");
    return;
  }
  Serial.printf("Tim thay LCD o dia chi 0x%02X\n", addr);

  lcd = new LiquidCrystal_I2C(addr, 16, 2);
  lcd->init();
  lcd->backlight();
  lcd->setCursor(0, 0);
  lcd->print("#01 Phong khach");
  lcd->setCursor(0, 1);
  lcd->print("LCD OK!");
  Serial.println("Da in chu len LCD. Neu man hinh sang ma khong thay chu -> van bien tro xanh phia sau");
}

void loop() {
  if (!lcd) return;
  lcd->setCursor(9, 1);
  lcd->printf("%5lus", millis() / 1000);
  delay(500);
}
