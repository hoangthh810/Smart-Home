// Cấu hình cố định của hệ thống: phòng, thiết bị, cảm biến

export const ROOMS = {
  living: {
    id: 'living',
    name: 'Phòng khách',
    devices: ['light', 'fan'],
    sensors: ['temperature', 'humidity', 'presence'],
  },
  kitchen: {
    id: 'kitchen',
    name: 'Phòng bếp',
    devices: ['light', 'fan', 'buzzer'],
    sensors: ['temperature', 'humidity', 'gas', 'presence'],
  },
}

export const ROOM_IDS = Object.keys(ROOMS)

export const DEVICE_LABELS = {
  light: 'Đèn LED',
  fan: 'Quạt',
  buzzer: 'Còi báo',
}

// Thiết bị người dùng được bật/tắt (còi do hệ thống điều khiển)
export const CONTROLLABLE_DEVICES = ['light', 'fan']

export const MODE_LABELS = {
  auto: 'Tự động',
  manual: 'Thủ công',
}

export const DEFAULT_HOME_SETTINGS = {
  gasThreshold: 400, // chỉ số ADC của MQ-2 (0–4095, không phải ppm) – vượt ngưỡng sẽ kích hoạt cảnh báo
  tempHigh: 35, // °C – chỉ để hiển thị
  humidityHigh: 85, // % – chỉ để hiển thị
  offDelayMin: 5, // phút – tự tắt khi không còn người (chế độ Auto)
  alertEmails: [],
}
