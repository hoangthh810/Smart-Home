// Demo node phòng khách (chưa có BH1750, INA219)
//   - PIR (D27) thấy chuyển động → bật đèn (relay 2, D25) + quạt (relay 1, D26)
//     30 giây không còn chuyển động → tắt cả 2
//   - LCD hàng 1: nhiệt độ, độ ẩm (DHT22, D4) · hàng 2: ID node + trạng thái
//   - Nút SET (D32): mỗi lần bấm ID tăng 1, quá 10 quay về 1 (tự lưu, mất điện không mất)
#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <Preferences.h>

// ---------- Chân ----------
const int DHT_PIN = 4;
const int PIR_PIN = 27;
const int FAN_PIN = 26;   // relay 1
const int LIGHT_PIN = 25; // relay 2
const int SET_PIN = 32;

const int MAX_ID = 10;
const unsigned long OFF_DELAY_MS = 30000; // không có người 30 giây → tắt
const unsigned long DHT_EVERY_MS = 2000;

DHT dht(DHT_PIN, DHT22);
LiquidCrystal_I2C *lcd = nullptr;
Preferences prefs;

int nodeId = 1;
bool devicesOn = false;
unsigned long lastMotion = 0;
float temperature = NAN, humidity = NAN;
unsigned long lastDht = 0;

// ---------- Nút nhấn (lọc nhiễu) ----------
bool btnStable = true, btnRaw = true;
unsigned long btnChangedAt = 0;

// true đúng 1 lần khi vừa nhấn
bool setPressed() {
  bool r = digitalRead(SET_PIN);
  if (r != btnRaw) { btnRaw = r; btnChangedAt = millis(); }
  if (millis() - btnChangedAt > 30 && btnRaw != btnStable) {
    btnStable = btnRaw;
    return !btnStable;
  }
  return false;
}

// ---------- Thiết bị ----------
void setDevices(bool on) {
  devicesOn = on;
  digitalWrite(LIGHT_PIN, on ? HIGH : LOW);
  digitalWrite(FAN_PIN, on ? HIGH : LOW);
  Serial.printf("[%5lus] %s den + quat\n", millis() / 1000, on ? "BAT" : "TAT");
}

// ---------- LCD ----------
void lcdLine(int row, const char *text) {
  char buf[17];
  snprintf(buf, sizeof buf, "%-16s", text); // đệm khoảng trắng để xoá chữ cũ
  lcd->setCursor(0, row);
  lcd->print(buf);
}

void updateLcd() {
  if (!lcd) return;
  char line[24];

  // Hàng 1: T:28.2°C H:70%  (0xDF là ký tự độ trong LCD)
  if (isnan(temperature)) snprintf(line, sizeof line, "DHT22 loi!");
  else snprintf(line, sizeof line, "T:%.1f%cC H:%.0f%%", temperature, 0xDF, humidity);
  lcdLine(0, line);

  // Hàng 2: Node #01   ON 25s
  char status[9];
  if (devicesOn) {
    unsigned long left = (OFF_DELAY_MS - min(OFF_DELAY_MS, millis() - lastMotion)) / 1000;
    snprintf(status, sizeof status, "ON %2lus", left);
  } else {
    snprintf(status, sizeof status, "OFF");
  }
  snprintf(line, sizeof line, "Node #%02d %7s", nodeId, status);
  lcdLine(1, line);
}

void setupLcd() {
  Wire.begin(21, 22);
  for (uint8_t a : {0x27, 0x3F, 0x20, 0x38}) {
    Wire.beginTransmission(a);
    if (Wire.endTransmission() == 0) {
      lcd = new LiquidCrystal_I2C(a, 16, 2);
      lcd->init();
      lcd->backlight();
      Serial.printf("LCD o dia chi 0x%02X\n", a);
      return;
    }
  }
  Serial.println("LOI: khong tim thay LCD (SDA D21, SCL D22)");
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n=== Demo node phong khach ===");

  pinMode(LIGHT_PIN, OUTPUT);
  pinMode(FAN_PIN, OUTPUT);
  setDevices(false);
  pinMode(PIR_PIN, INPUT_PULLDOWN);
  pinMode(SET_PIN, INPUT_PULLUP);

  prefs.begin("node", false);
  nodeId = constrain(prefs.getInt("id", 1), 1, MAX_ID);
  Serial.printf("ID node: %02d\n", nodeId);

  dht.begin();
  setupLcd();
  if (lcd) {
    lcdLine(0, "Smart Home");
    lcdLine(1, "Phong khach...");
  }
  Serial.println("PIR can ~30-60 giay de on dinh sau khi cap dien");
  delay(1500);
}

void loop() {
  unsigned long now = millis();

  // Nút SET: tăng ID (10 → 1) và lưu luôn
  if (setPressed()) {
    nodeId = nodeId % MAX_ID + 1;
    prefs.putInt("id", nodeId);
    Serial.printf("SET -> ID %02d\n", nodeId);
    updateLcd();
  }

  // PIR: có chuyển động → bật và tính lại 30 giây
  if (digitalRead(PIR_PIN) == HIGH) {
    if (!devicesOn) {
      Serial.printf("[%5lus] PIR: co nguoi\n", now / 1000);
      setDevices(true);
    }
    lastMotion = now;
  } else if (devicesOn && now - lastMotion >= OFF_DELAY_MS) {
    Serial.printf("[%5lus] PIR: 30s khong co nguoi\n", now / 1000);
    setDevices(false);
  }

  // DHT22 mỗi 2 giây
  if (now - lastDht >= DHT_EVERY_MS) {
    lastDht = now;
    temperature = dht.readTemperature();
    humidity = dht.readHumidity();
    if (isnan(temperature) || isnan(humidity)) Serial.println("DHT22: doc loi");
    else Serial.printf("DHT22: %.1f C, %.1f %%\n", temperature, humidity);
  }

  // Làm mới LCD mỗi 0,5 giây
  static unsigned long lastLcd = 0;
  if (now - lastLcd >= 500) {
    lastLcd = now;
    updateLcd();
  }
}
