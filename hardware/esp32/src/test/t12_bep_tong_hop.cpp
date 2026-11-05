// Bước 12: Kiểm tra tổng hợp node phòng bếp (trừ INA219) – chân giống node_phong_bep.cpp
// Khởi động: quét I2C, kêu buzzer 1 tiếng, bật lần lượt đèn rồi quạt 1 giây
// Sau đó mỗi giây in DHT22 / MQ-2 / PIR / nút lên Serial và LCD
// Bấm SET (D32) = tăng ID node 1 → 10 rồi quay về 1 (hiện trên LCD), mỗi lần bấm buzzer kêu "bíp"
// Nút chỉ để đổi ID, KHÔNG bật/tắt đèn quạt (bài test này không lưu ID vào flash)
#include <Arduino.h>
#include <Wire.h>
#include <DHT.h>
#include <LiquidCrystal_I2C.h>

const int DHT_PIN = 4;
const int PIR_PIN = 27;
const int MQ2_PIN = 34;
const int FAN_PIN = 26;    // relay 1
const int LIGHT_PIN = 25;  // relay 2
const int BUZZER_PIN = 23;
const int SET_PIN = 32;
const int MAX_ID = 10;

DHT dht(DHT_PIN, DHT22);
LiquidCrystal_I2C *lcd = nullptr;
bool light = false, fan = false;
bool lastSet = HIGH;
int nodeId = 1;
unsigned long lastPrint = 0;

void beep(int ms) {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(ms);
  digitalWrite(BUZZER_PIN, LOW);
}

void setRelays() {
  digitalWrite(LIGHT_PIN, light ? HIGH : LOW);
  digitalWrite(FAN_PIN, fan ? HIGH : LOW);
}

void scanI2C() {
  int found = 0;
  for (byte a = 1; a < 127; a++) {
    Wire.beginTransmission(a);
    if (Wire.endTransmission() != 0) continue;
    found++;
    Serial.printf("  I2C 0x%02X", a);
    if (a == 0x27 || a == 0x3F) {
      Serial.print(" -> LCD");
      if (!lcd) lcd = new LiquidCrystal_I2C(a, 16, 2);
    } else if (a >= 0x40 && a <= 0x4F) {
      Serial.print(" -> INA219 (bo qua)");
    }
    Serial.println();
  }
  if (!found) Serial.println("  KHONG thay thiet bi I2C nao -> kiem tra SDA D21, SCL D22, VCC, GND");
  if (!lcd) Serial.println("  [LOI] Khong thay LCD (0x27/0x3F)");
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== Test tong hop node phong bep ===");

  pinMode(LIGHT_PIN, OUTPUT);
  pinMode(FAN_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(PIR_PIN, INPUT_PULLDOWN);
  pinMode(SET_PIN, INPUT_PULLUP);
  setRelays();
  digitalWrite(BUZZER_PIN, LOW);

  Wire.begin(21, 22);
  Serial.println("Quet I2C:");
  scanI2C();
  if (lcd) {
    lcd->init();
    lcd->backlight();
    lcd->print("Test phong bep");
  }
  dht.begin();

  Serial.println("Buzzer keu 0,3 giay");
  beep(300);
  Serial.println("Bat DEN 1 giay (nghe relay 2 tach)");
  light = true; setRelays(); delay(1000);
  light = false; setRelays();
  Serial.println("Bat QUAT 1 giay (nghe relay 1 tach)");
  fan = true; setRelays(); delay(1000);
  fan = false; setRelays();
  Serial.println("Luu y: PIR can ~30-60 giay on dinh, MQ-2 can ~1 phut nong len");
  Serial.println("Bam SET = tang ID node (1 -> 10 -> 1)\n");
}

void loop() {
  bool set = digitalRead(SET_PIN);
  if (set == LOW && lastSet == HIGH) {
    nodeId = nodeId % MAX_ID + 1;
    Serial.printf(">> SET: ID node = %02d\n", nodeId);
    beep(80);
    delay(30);  // chống dội phím
  }
  lastSet = set;

  if (millis() - lastPrint < 1000) { delay(20); return; }
  lastPrint = millis();

  float t = dht.readTemperature(), h = dht.readHumidity();
  int gas = analogRead(MQ2_PIN);
  bool pir = digitalRead(PIR_PIN) == HIGH;

  if (isnan(t) || isnan(h)) Serial.print("DHT22: LOI (kiem tra D4)");
  else Serial.printf("DHT22: %.1f C %.0f%%", t, h);
  Serial.printf(" | MQ-2: %d | PIR: %s | SET:%s | ID:%02d\n", gas, pir ? "CO NGUOI" : "khong", set == LOW ? "nhan" : "-", nodeId);

  if (lcd) {
    char l1[17], l2[17];
    if (isnan(t)) snprintf(l1, sizeof l1, "#%02d DHT LOI P:%d", nodeId, pir);
    else snprintf(l1, sizeof l1, "#%02d %.1fC P:%d", nodeId, t, pir);
    snprintf(l2, sizeof l2, "Gas:%-4d H:%2.0f%%", gas, isnan(h) ? 0 : h);
    lcd->clear();
    lcd->print(l1);
    lcd->setCursor(0, 1); lcd->print(l2);
  }
}
