// Bước 5: Kiểm tra I2C + BH1750 – SDA D21, SCL D22, nguồn 3.3V, ADDR xuống GND (0x23)
// Quét bus I2C trước (dùng lại khi cắm LCD, INA219), sau đó đọc ánh sáng mỗi giây
#include <Arduino.h>
#include <Wire.h>
#include <BH1750.h>

BH1750 lightMeter;
bool ok = false;

const char *nameOf(uint8_t addr) {
  switch (addr) {
    case 0x23: case 0x5C: return "BH1750";
    case 0x27: case 0x3F: return "LCD1602 I2C";
    case 0x40: case 0x41: case 0x44: case 0x45: return "INA219";
    default: return "?";
  }
}

void scanI2C() {
  Serial.println("Quet bus I2C...");
  int n = 0;
  for (uint8_t a = 1; a < 127; a++) {
    Wire.beginTransmission(a);
    if (Wire.endTransmission() == 0) {
      Serial.printf("  Tim thay 0x%02X  (%s)\n", a, nameOf(a));
      n++;
    }
  }
  if (n == 0) Serial.println("  KHONG tim thay thiet bi nao -> kiem tra SDA/SCL (D21/D22), VCC, GND");
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println("=== Test I2C + BH1750 ===");
  Wire.begin(21, 22);
  scanI2C();
  ok = lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, 0x23, &Wire) ||
       lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, 0x5C, &Wire);
  Serial.println(ok ? "BH1750 khoi dong OK" : "LOI: khong khoi dong duoc BH1750");
}

void loop() {
  if (ok) {
    float lux = lightMeter.readLightLevel();
    if (lux < 0) Serial.println("LOI doc BH1750");
    else Serial.printf("Anh sang: %.1f lux\n", lux);
  }
  delay(1000);
}
