// Bước 7: Kiểm tra INA219 – SDA D21, SCL D22, VCC 3.3V, địa chỉ 0x40
// Nối nhánh đo: ray 5V → VIN+ → VIN− → ray 5V tải (RÚT dây cầu 5V ↔ 5V tải ra, không thì đo ra 0)
// Cứ 5 giây bật/tắt đèn (D25) + quạt (D26) để thấy dòng thay đổi: tắt ~0 mA, bật ~150–300 mA
#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_INA219.h>

const int LIGHT_PIN = 25; // relay 2
const int FAN_PIN = 26;   // relay 1
const unsigned long TOGGLE_MS = 5000;

Adafruit_INA219 ina(0x40);
bool ok = false;
bool loadOn = false;
unsigned long lastToggle = 0;

void scanI2C() {
  Serial.println("Quet bus I2C...");
  int n = 0;
  for (uint8_t a = 1; a < 127; a++) {
    Wire.beginTransmission(a);
    if (Wire.endTransmission() == 0) {
      Serial.printf("  Tim thay 0x%02X%s\n", a, a >= 0x40 && a <= 0x45 ? "  (INA219)" : "");
      n++;
    }
  }
  if (n == 0) Serial.println("  KHONG tim thay thiet bi nao -> kiem tra moi han, SDA/SCL (D21/D22), VCC, GND");
}

void setLoad(bool on) {
  loadOn = on;
  digitalWrite(LIGHT_PIN, on ? HIGH : LOW);
  digitalWrite(FAN_PIN, on ? HIGH : LOW);
  Serial.printf("--- %s den + quat ---\n", on ? "BAT" : "TAT");
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println("=== Test INA219 ===");
  pinMode(LIGHT_PIN, OUTPUT);
  pinMode(FAN_PIN, OUTPUT);
  setLoad(false);

  Wire.begin(21, 22);
  scanI2C();
  ok = ina.begin(&Wire);
  Serial.println(ok ? "INA219 khoi dong OK" : "LOI: khong thay INA219 o 0x40 (A0, A1 phai de trong)");
}

void loop() {
  if (millis() - lastToggle >= TOGGLE_MS) {
    lastToggle = millis();
    setLoad(!loadOn);
  }
  if (ok) {
    float bus = ina.getBusVoltage_V();     // điện áp ở VIN− (cấp cho tải)
    float shunt = ina.getShuntVoltage_mV(); // sụt áp trên điện trở shunt 0,1Ω
    float current = ina.getCurrent_mA();
    float power = ina.getPower_mW();
    Serial.printf("Tai: %.2f V | Shunt: %.2f mV | Dong: %.1f mA | Cong suat: %.0f mW\n",
                  bus + shunt / 1000, shunt, current, power);
  }
  delay(1000);
}
