// Bước 2: Kiểm tra DHT22 – DATA nối D4, nguồn 3.3V
// Serial Monitor (115200) in nhiệt độ, độ ẩm mỗi 2 giây
#include <Arduino.h>
#include <DHT.h>

const int DHT_PIN = 4;
DHT dht(DHT_PIN, DHT22);

void setup()
{
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println("=== Test DHT22 (D4) ===");
  dht.begin();
  delay(2000); // DHT22 cần ~2 giây sau khi cấp nguồn
}

void loop()
{
  float t = dht.readTemperature();
  float h = dht.readHumidity();

  if (isnan(t) || isnan(h))
  {
    Serial.println("LOI: khong doc duoc DHT22 -> kiem tra day DATA (D4), VCC 3.3V, GND, dien tro keo len 10k");
  }
  else
  {
    Serial.printf("Nhiet do: %.1f C  |  Do am: %.1f %%\n", t, h);
  }
  delay(2000);
}
