// Chế độ cài đặt qua trình duyệt – máy tính hoặc điện thoại, không cần app (dùng chung cho các node)
//   Node phát WiFi riêng → máy tính/điện thoại kết nối rồi mở 192.168.4.1 (thường tự bật) → trang tiếng Việt: WiFi nhà, WiFi dự phòng, ID nhà, Pi
//   Lưu vào flash. Không chặn vòng lặp → logic gas vẫn chạy trong lúc cài
#pragma once
#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>

struct NetConfig {
  String ssid1, pass1, ssid2, pass2, home, piHost, mqttPass;
  bool ready() const { return ssid1.length() && home.length() && piHost.length(); }
};

namespace portal {

const char *AP_PASS = "12345678";  // hiện trên LCD; cần chạm tay vào node mới bật được chế độ này
const unsigned long TIMEOUT_MS = 10 * 60000UL;

WebServer web(80);
DNSServer dns;
bool active = false;
unsigned long until = 0, applyAt = 0;
String apName, title;
NetConfig *cfg = nullptr;
Preferences *prefs = nullptr;

void load(NetConfig &c, Preferences &p, const char *s1, const char *p1, const char *s2, const char *p2,
          const char *home, const char *piHost, const char *mqttPass) {
  c.ssid1 = p.getString("ssid1", s1);
  c.pass1 = p.getString("pass1", p1);
  c.ssid2 = p.getString("ssid2", s2);
  c.pass2 = p.getString("pass2", p2);
  c.home = p.getString("home", home);
  c.piHost = p.getString("pihost", piHost);
  c.mqttPass = p.getString("mqttpass", mqttPass);
}

String esc(const String &s) {
  String o;
  for (char ch : s) {
    if (ch == '&') o += "&amp;";
    else if (ch == '<') o += "&lt;";
    else if (ch == '>') o += "&gt;";
    else if (ch == '"') o += "&quot;";
    else o += ch;
  }
  return o;
}

// ID nhà / tên Pi nằm trong topic MQTT → chỉ cho chữ, số và vài ký tự an toàn (không / + #)
bool safeToken(const String &s, const char *extra, size_t maxLen) {
  if (!s.length() || s.length() > maxLen) return false;
  for (char ch : s)
    if (!isalnum((unsigned char)ch) && !strchr(extra, ch)) return false;
  return true;
}

void sendPage(const String &body) {
  web.send(200, "text/html; charset=utf-8",
           "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'>"
           "<title>Cài đặt node</title><style>"
           "body{font-family:system-ui,sans-serif;max-width:440px;margin:auto;padding:16px;background:#f6f7fb;color:#1e2235}"
           "h1{font-size:20px}label{display:block;margin:14px 0 4px;font-weight:600;font-size:14px}"
           "input{width:100%;padding:10px;border:1px solid #cbd0e0;border-radius:8px;box-sizing:border-box;font-size:16px;background:#fff}"
           "small{color:#6b7190;font-size:12px}button{margin-top:20px;width:100%;padding:12px;border:0;border-radius:8px;"
           "background:#5b4bff;color:#fff;font-size:16px}.err{background:#fff5f5;border-left:4px solid #ef4444;padding:8px 12px;border-radius:6px}"
           "</style>" + body);
}

void sendForm(const String &error = "") {
  int n = WiFi.scanComplete();
  if (n == WIFI_SCAN_FAILED) WiFi.scanNetworks(true);  // quét nền, lần tải trang sau sẽ có danh sách
  String nets;
  for (int i = 0; i < n; i++) nets += "<option value=\"" + esc(WiFi.SSID(i)) + "\">";

  String b = "<h1>" + esc(title) + "</h1>";
  if (error.length()) b += "<p class=err>" + esc(error) + "</p>";
  b += "<form method=post action=/save>"
       "<label>WiFi nhà (2.4 GHz)</label><input name=s1 list=nets required maxlength=32 value=\"" + esc(cfg->ssid1) + "\">"
       "<label>Mật khẩu WiFi nhà</label><input name=p1 type=password maxlength=63 placeholder='để trống = giữ nguyên'>"
       "<label>WiFi dự phòng (hotspot điện thoại)</label><input name=s2 list=nets maxlength=32 value=\"" + esc(cfg->ssid2) + "\">"
       "<small>Để trống nếu không dùng. Hotspot phải phát 2.4 GHz.</small>"
       "<label>Mật khẩu WiFi dự phòng</label><input name=p2 type=password maxlength=63 placeholder='để trống = giữ nguyên'>"
       "<label>ID nhà</label><input name=home required maxlength=40 value=\"" + esc(cfg->home) + "\">"
       "<small>Xem trên web: Cài đặt nhà → Lắp đặt thiết bị → nút sao chép.</small>"
       "<label>Tên hoặc IP Raspberry Pi</label><input name=pi required maxlength=63 value=\"" + esc(cfg->piHost) + "\">"
       "<small>Hostname (vd: pi) hoặc IP (vd: 192.168.1.25).</small>"
       "<label>Mật khẩu MQTT</label><input name=mp type=password maxlength=63 placeholder='để trống = giữ nguyên'>"
       "<datalist id=nets>" + nets + "</datalist><button>Lưu cài đặt</button></form>"
       "<p><small>Chế độ cài đặt tự tắt sau 10 phút.</small></p>";
  sendPage(b);
}

void handleSave() {
  String s1 = web.arg("s1"), s2 = web.arg("s2"), home = web.arg("home"), pi = web.arg("pi");
  String p1 = web.arg("p1"), p2 = web.arg("p2"), mp = web.arg("mp");
  s1.trim(); s2.trim(); home.trim(); pi.trim();
  if (!s1.length() || s1.length() > 32 || s2.length() > 32) return sendForm("Tên WiFi không hợp lệ (tối đa 32 ký tự)");
  if (p1.length() > 63 || p2.length() > 63 || mp.length() > 63) return sendForm("Mật khẩu quá dài (tối đa 63 ký tự)");
  if (!safeToken(home, "_-", 40)) return sendForm("ID nhà chỉ gồm chữ, số, - và _ (sao chép từ trang web)");
  if (!safeToken(pi, ".-", 63)) return sendForm("Tên hoặc IP Raspberry Pi không hợp lệ");

  cfg->ssid1 = s1;
  cfg->ssid2 = s2;
  if (p1.length()) cfg->pass1 = p1;
  if (!s2.length()) cfg->pass2 = "";
  else if (p2.length()) cfg->pass2 = p2;
  cfg->home = home;
  cfg->piHost = pi;
  if (mp.length()) cfg->mqttPass = mp;

  prefs->putString("ssid1", cfg->ssid1);
  prefs->putString("pass1", cfg->pass1);
  prefs->putString("ssid2", cfg->ssid2);
  prefs->putString("pass2", cfg->pass2);
  prefs->putString("home", cfg->home);
  prefs->putString("pihost", cfg->piHost);
  prefs->putString("mqttpass", cfg->mqttPass);

  sendPage("<h1>Đã lưu ✔</h1><p>Node đang kết nối WiFi <b>" + esc(cfg->ssid1) +
           "</b>. Bạn có thể đóng trang này và kết nối máy lại WiFi nhà.</p>"
           "<p><small>Không kết nối được thì giữ nút SET 5 giây để cài lại.</small></p>");
  applyAt = millis() + 1500;  // để trang kịp gửi về trình duyệt rồi mới tắt WiFi cài đặt
}

void setup(NetConfig *c, Preferences *p, const String &name, const String &pageTitle) {
  cfg = c;
  prefs = p;
  apName = name;
  title = pageTitle;
  web.on("/", HTTP_GET, [] { sendForm(); });
  web.on("/save", HTTP_POST, handleSave);
  web.onNotFound([] {  // mở trang bất kỳ → chuyển về trang cài đặt (captive portal)
    web.sendHeader("Location", "http://192.168.4.1/");
    web.send(302);
  });
}

void start() {
  if (active) return;
  active = true;
  until = millis() + TIMEOUT_MS;
  applyAt = 0;
  WiFi.disconnect();
  WiFi.mode(WIFI_AP_STA);  // giữ STA để quét danh sách WiFi
  WiFi.softAP(apName.c_str(), AP_PASS);
  dns.start(53, "*", WiFi.softAPIP());
  WiFi.scanNetworks(true);
  web.begin();
  Serial.printf("Che do cai dat: WiFi \"%s\", mat khau %s, trang http://192.168.4.1\n", apName.c_str(), AP_PASS);
}

void stop() {
  web.stop();
  dns.stop();
  WiFi.softAPdisconnect(true);
  WiFi.mode(WIFI_STA);
  active = false;
  Serial.println("Tat che do cai dat");
}

// Gọi mỗi vòng lặp. Trả về true khi vừa lưu cài đặt mới (node cần kết nối lại)
bool loop(unsigned long now) {
  if (!active) return false;
  dns.processNextRequest();
  web.handleClient();
  if (applyAt && now >= applyAt) {
    stop();
    return true;
  }
  if (now > until) stop();
  return false;
}

}  // namespace portal
