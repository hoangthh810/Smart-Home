// Firmware node phòng bếp – WiFi + MQTT tới Raspberry Pi (bảng topic trong CLAUDE.md)
//   Gửi sensors mỗi 2 giây, state khi thay đổi (retained) · nhận cmd (web) và config (cài đặt nhà)
//   Auto (PIR) và cảnh báo gas chạy ngay trên node → mất WiFi/Pi vẫn bật còi, giữ nguyên đèn/quạt
//   Chân: xem hardware/so-do-node-phong-bep.html · WiFi, IP Pi, ID nhà: include/secrets.h
#include <Arduino.h>
#include <WiFi.h>
#include <ESPmDNS.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <Adafruit_INA219.h>
#include <Preferences.h>
#include <driver/gpio.h>

#if __has_include("secrets.h")
#include "secrets.h"
#else
#error "Chua co include/secrets.h: sao chep include/secrets.example.h thanh secrets.h roi dien WiFi, IP Pi, ID nha"
#endif

const char *ROOM = "kitchen";

// ---------- Chân ----------
const int DHT_PIN = 4;
const int PIR_PIN = 27;
const int MQ2_PIN = 34;
const int FAN_PIN = 26;    // relay 1
const int LIGHT_PIN = 25;  // relay 2
const int BUZZER_PIN = 23;
const int SET_PIN = 32;
const int OK_PIN = 33;

const unsigned long SENSOR_EVERY_MS = 2000;
const unsigned long STATE_EVERY_MS = 30000;  // gửi lại state định kỳ phòng khi mất bản tin
const unsigned long PIR_WARMUP_MS = 30000;   // HC-SR501 cần 30–60 giây ổn định sau khi cấp điện
const unsigned long GAS_WARMUP_MS = 60000;   // sợi đốt MQ-2 chưa nóng thì số đo chưa đúng
const unsigned long RETRY_MS = 10000;
const unsigned long WIFI_SWITCH_MS = 15000;
const unsigned long EDIT_TIMEOUT_MS = 10000;
const int MAX_ID = 99;

DHT dht(DHT_PIN, DHT22);
Adafruit_INA219 ina(0x40);
LiquidCrystal_I2C *lcd = nullptr;
Preferences prefs;
WiFiClient net;
PubSubClient mqtt(net);
String base;  // smarthome/{homeId}/kitchen/

// Cài đặt (nhận từ Pi qua topic config, lưu flash)
int gasThreshold = 400;
unsigned long offDelayMs = 5 * 60000UL;

// Trạng thái
int nodeId = 2;
bool autoMode = true, light = false, fan = false, gasAlarm = false;
float temperature = NAN, humidity = NAN, powerW = 0;
int gas = 0;
bool presence = false, inaOk = false, stateDirty = true;
unsigned long lastMotion = 0, lastSensors = 0, lastState = 0, lastRetry = 0, lastLcd = 0;

// Nút: SET vào chế độ cài ID / tăng ID, OK lưu ID hoặc xem thông tin
bool editing = false;
int editId = 0;
unsigned long editUntil = 0, infoUntil = 0, msgUntil = 0;
char msg[17] = "";

struct Button {
  int pin;
  bool stable = true, raw = true;
  unsigned long changedAt = 0;
  Button(int p) : pin(p) {}
  // true đúng 1 lần khi vừa nhấn (lọc nhiễu 30 ms)
  bool pressed() {
    bool r = digitalRead(pin);
    if (r != raw) { raw = r; changedAt = millis(); }
    if (millis() - changedAt > 30 && raw != stable) {
      stable = raw;
      return !stable;
    }
    return false;
  }
};
Button setBtn{SET_PIN}, okBtn{OK_PIN};

// ---------- Thiết bị ----------
void applyOutputs() {
  digitalWrite(LIGHT_PIN, light ? HIGH : LOW);
  digitalWrite(FAN_PIN, fan ? HIGH : LOW);
  digitalWrite(BUZZER_PIN, gasAlarm ? HIGH : LOW);  // kêu liền (không nhấp nháy) để kẹt kết nối cũng không tắt còi
}

void setDevices(bool lightOn, bool fanOn) {
  if (light == lightOn && fan == fanOn) return;
  light = lightOn;
  fan = fanOn;
  stateDirty = true;
}

// ---------- MQTT ----------
String topic(const char *kind) { return base + kind; }

void publishJson(const char *kind, JsonDocument &doc, bool retained) {
  char buf[256];
  size_t n = serializeJson(doc, buf);
  mqtt.publish(topic(kind).c_str(), (const uint8_t *)buf, n, retained);
}

void publishState() {
  JsonDocument d;
  d["nodeId"] = nodeId;
  d["mode"] = autoMode ? "auto" : "manual";
  JsonObject dev = d["devices"].to<JsonObject>();
  dev["light"] = light;
  dev["fan"] = fan;
  dev["buzzer"] = gasAlarm;
  d["alarm"] = gasAlarm;
  publishJson("state", d, true);
}

void publishSensors() {
  JsonDocument d;
  if (!isnan(temperature)) d["temperature"] = serialized(String(temperature, 1));
  if (!isnan(humidity)) d["humidity"] = serialized(String(humidity, 0));
  d["gas"] = gas;
  d["presence"] = presence;
  if (inaOk) d["power"] = serialized(String(powerW, 2));
  publishJson("sensors", d, false);
}

void onMqtt(char *t, byte *payload, unsigned int len) {
  JsonDocument doc;
  if (deserializeJson(doc, payload, len)) return;

  if (String(t).endsWith("/config")) {
    gasThreshold = constrain(doc["gasThreshold"] | gasThreshold, 100, 4095);
    long sec = doc["offDelaySec"] | (long)(offDelayMs / 1000);
    offDelayMs = constrain(sec, 6L, 7200L) * 1000UL;
    prefs.putInt("gas", gasThreshold);
    prefs.putULong("off", offDelayMs);
    Serial.printf("Config: nguong gas %d, tu tat sau %lus\n", gasThreshold, offDelayMs / 1000);
    return;
  }

  // cmd: {mode} hoặc {device, value}
  const char *mode = doc["mode"];
  const char *device = doc["device"];
  if (mode && (!strcmp(mode, "auto") || !strcmp(mode, "manual"))) {
    autoMode = !strcmp(mode, "auto");
    if (autoMode) lastMotion = millis();  // về Auto coi như vừa thấy người, không tắt ngay
    prefs.putBool("auto", autoMode);
    Serial.printf("Lenh: che do %s\n", mode);
  } else if (device && !autoMode && !gasAlarm) {  // đang Auto hoặc đang báo gas → bỏ qua lệnh bật/tắt
    bool v = doc["value"];
    if (!strcmp(device, "light")) setDevices(v, fan);
    else if (!strcmp(device, "fan")) setDevices(light, v);
    Serial.printf("Lenh: %s = %d\n", device, v);
  }
  stateDirty = true;  // luôn gửi lại state để web khớp với node (kể cả khi lệnh bị từ chối)
}

// WiFi: thử 1 mạng 15 giây, không vào được thì đổi sang mạng còn lại
// (không dùng WiFiMulti vì nó chặn vòng lặp vài giây mỗi lần quét → trễ báo gas)
const char *WIFI_SSIDS[] = {WIFI_SSID, WIFI2_SSID};
const char *WIFI_PASSES[] = {WIFI_PASS, WIFI2_PASS};
int wifiIdx = 0;
unsigned long lastWifiTry = 0;

void keepWifi(unsigned long now) {
  if (WiFi.status() == WL_CONNECTED) return;
  if (lastWifiTry && now - lastWifiTry < WIFI_SWITCH_MS) return;
  if (lastWifiTry && strlen(WIFI2_SSID)) wifiIdx = 1 - wifiIdx;
  lastWifiTry = now;
  Serial.printf("WiFi: ket noi \"%s\"...\n", WIFI_SSIDS[wifiIdx]);
  WiFi.disconnect();
  WiFi.begin(WIFI_SSIDS[wifiIdx], WIFI_PASSES[wifiIdx]);
}

// Tìm Pi theo tên (pi.local) để đổi mạng nhà ↔ hotspot không phải sửa IP; không thấy thì dùng IP dự phòng
IPAddress piIp;
bool mdnsOk = false;

void keepConnected(unsigned long now) {
  if (mqtt.connected() || WiFi.status() != WL_CONNECTED) return;
  if (lastRetry && now - lastRetry < RETRY_MS) return;
  lastRetry = now;
  if (!mdnsOk) mdnsOk = MDNS.begin("esp32-bep");
  if (piIp == IPAddress()) {
    if (mdnsOk) piIp = MDNS.queryHost(MQTT_HOSTNAME, 2000);  // chặn tối đa 2 giây
    if (piIp == IPAddress()) piIp.fromString(MQTT_HOST);
  }
  mqtt.setServer(piIp, MQTT_PORT);
  String id = "esp32-" + String(ROOM) + "-" + String((uint32_t)ESP.getEfuseMac(), HEX);
  Serial.printf("MQTT: ket noi %s.local (%s) ... ", MQTT_HOSTNAME, piIp.toString().c_str());
  if (mqtt.connect(id.c_str(), MQTT_USER, MQTT_PASS)) {
    Serial.println("OK");
    mqtt.subscribe(topic("cmd").c_str(), 1);
    mqtt.subscribe(topic("config").c_str(), 1);
    stateDirty = true;
  } else {
    Serial.printf("loi %d (-2: khong thay Pi, 5: sai user/mat khau MQTT)\n", mqtt.state());
    piIp = IPAddress();  // lần sau tìm lại (Pi có thể đã đổi IP)
  }
}

// ---------- Cảm biến & logic ----------
void readSensors() {
  float t = dht.readTemperature(), h = dht.readHumidity();
  if (!isnan(t) && !isnan(h)) { temperature = t; humidity = h; }

  long sum = 0;
  for (int i = 0; i < 16; i++) sum += analogRead(MQ2_PIN);
  gas = sum / 16;

  if (inaOk) powerW = max(0.0f, ina.getPower_mW() / 1000);
}

void runLogic(unsigned long now) {
  presence = now >= PIR_WARMUP_MS && digitalRead(PIR_PIN) == HIGH;

  // Gas: vượt ngưỡng → báo; xuống dưới 90% ngưỡng mới hết (tránh bật tắt liên tục quanh ngưỡng)
  if (now >= GAS_WARMUP_MS) {
    if (!gasAlarm && gas >= gasThreshold) {
      gasAlarm = true;
      stateDirty = true;
      Serial.printf("!!! GAS %d >= %d: bat coi, khoa dieu khien\n", gas, gasThreshold);
    } else if (gasAlarm && gas < gasThreshold * 9 / 10) {
      gasAlarm = false;
      stateDirty = true;
      Serial.println("Gas ve muc an toan: tat coi");
    }
  }

  // Auto: có người → bật; không còn người sau offDelay → tắt. Đang báo gas thì giữ nguyên
  if (autoMode && !gasAlarm) {
    if (presence) {
      lastMotion = now;
      setDevices(true, true);
    } else if ((light || fan) && now - lastMotion >= offDelayMs) {
      setDevices(false, false);
    }
  }
}

// ---------- Nút ----------
void showMsg(const char *text) {
  snprintf(msg, sizeof msg, "%s", text);
  msgUntil = millis() + 2000;
}

void handleButtons(unsigned long now) {
  if (setBtn.pressed()) {
    editId = editing ? editId % MAX_ID + 1 : nodeId;
    editing = true;
    editUntil = now + EDIT_TIMEOUT_MS;
    infoUntil = 0;
  }
  if (okBtn.pressed()) {
    if (editing) {
      editing = false;
      nodeId = editId;
      prefs.putInt("id", nodeId);
      char t[17];
      snprintf(t, sizeof t, "Da luu ID %02d", nodeId);
      showMsg(t);
      stateDirty = true;
    } else {
      infoUntil = now + 5000;
    }
  }
  if (editing && now > editUntil) {
    editing = false;
    showMsg("Huy cai ID");
  }
}

// ---------- LCD ----------
void lcdLine(int row, const char *text) {
  char buf[17];
  snprintf(buf, sizeof buf, "%-16s", text);  // đệm khoảng trắng để xoá chữ cũ
  lcd->setCursor(0, row);
  lcd->print(buf);
}

void updateLcd(unsigned long now) {
  if (!lcd) return;
  char l1[24], l2[24];

  if (now < infoUntil) {
    snprintf(l1, sizeof l1, "ID %02d Phong bep", nodeId);
    if (WiFi.status() != WL_CONNECTED) snprintf(l2, sizeof l2, "WiFi: dang noi..");
    else if (!mqtt.connected()) snprintf(l2, sizeof l2, "Pi: chua ket noi");
    else snprintf(l2, sizeof l2, "%s", WiFi.localIP().toString().c_str());
  } else {
    if (isnan(temperature)) snprintf(l1, sizeof l1, "#%02d DHT22 loi!", nodeId);
    else snprintf(l1, sizeof l1, "#%02d %4.1f%cC %2.0f%%", nodeId, temperature, 0xDF, humidity);

    if (gasAlarm) snprintf(l2, sizeof l2, (now / 500) % 2 ? "!! CANH BAO GAS" : "G:%d KHOA DK", gas);
    else if (editing) snprintf(l2, sizeof l2, "Cai ID: %02d  OK?", editId);
    else if (now < msgUntil) snprintf(l2, sizeof l2, "%s", msg);
    else if (now < GAS_WARMUP_MS) snprintf(l2, sizeof l2, "MQ-2 nong %2lus", (GAS_WARMUP_MS - now) / 1000 + 1);
    else snprintf(l2, sizeof l2, "G:%-4d %3.1fW %s", gas, powerW, !mqtt.connected() ? "OFF" : autoMode ? "AUTO" : "MAN");
  }
  lcdLine(0, l1);
  lcdLine(1, l2);
}

void setupLcd() {
  for (uint8_t a : {0x27, 0x3F, 0x20, 0x38}) {
    Wire.beginTransmission(a);
    if (Wire.endTransmission() == 0) {
      lcd = new LiquidCrystal_I2C(a, 16, 2);
      lcd->init();
      lcd->backlight();
      return;
    }
  }
  Serial.println("LOI: khong tim thay LCD (SDA D21, SCL D22)");
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n=== Node phong bep ===");

  pinMode(LIGHT_PIN, OUTPUT);
  pinMode(FAN_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  gpio_set_drive_capability((gpio_num_t)BUZZER_PIN, GPIO_DRIVE_CAP_3);  // buzzer nối thẳng GPIO, cho dòng lớn nhất
  applyOutputs();
  pinMode(PIR_PIN, INPUT_PULLDOWN);
  pinMode(SET_PIN, INPUT_PULLUP);
  pinMode(OK_PIN, INPUT_PULLUP);
  analogReadResolution(12);
  analogSetPinAttenuation(MQ2_PIN, ADC_11db);

  prefs.begin("node", false);
  nodeId = constrain(prefs.getInt("id", 2), 1, MAX_ID);
  autoMode = prefs.getBool("auto", true);
  gasThreshold = prefs.getInt("gas", gasThreshold);
  offDelayMs = prefs.getULong("off", offDelayMs);
  Serial.printf("ID %02d, che do %s, nguong gas %d, tu tat %lus\n", nodeId, autoMode ? "auto" : "manual", gasThreshold, offDelayMs / 1000);

  dht.begin();
  Wire.begin(21, 22);
  setupLcd();
  inaOk = ina.begin(&Wire);
  if (!inaOk) Serial.println("Canh bao: khong thay INA219 (0x40) – khong gui dien nang");

  base = String("smarthome/") + HOME_ID + "/" + ROOM + "/";
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(false);  // keepWifi tự kết nối lại / đổi mạng
  mqtt.setCallback(onMqtt);
  mqtt.setBufferSize(512);
  mqtt.setSocketTimeout(3);  // Pi tắt thì không treo vòng lặp lâu (logic gas vẫn chạy)
  Serial.printf("Topic: %s#\n", base.c_str());
}

void loop() {
  unsigned long now = millis();
  keepWifi(now);
  keepConnected(now);
  mqtt.loop();
  handleButtons(now);
  runLogic(now);
  applyOutputs();

  if (now - lastSensors >= SENSOR_EVERY_MS) {
    lastSensors = now;
    readSensors();
    if (mqtt.connected()) publishSensors();
  }
  if (mqtt.connected() && (stateDirty || now - lastState >= STATE_EVERY_MS)) {
    stateDirty = false;
    lastState = now;
    publishState();
  }
  if (now - lastLcd >= 500) {
    lastLcd = now;
    updateLcd(now);
  }
}
