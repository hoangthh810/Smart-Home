// Cấu hình cố định của hệ thống: phòng, thiết bị, cảm biến

export const ROOMS = {
  living: {
    id: 'living',
    name: 'Phòng khách',
    devices: ['light', 'fan'],
    sensors: ['temperature', 'humidity', 'lux', 'presence', 'power'],
  },
  kitchen: {
    id: 'kitchen',
    name: 'Phòng bếp',
    devices: ['light', 'fan', 'buzzer'],
    sensors: ['temperature', 'humidity', 'gas', 'presence', 'power'],
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

// Bảng giá điện sinh hoạt bậc thang EVN (đồng/kWh, chưa VAT).
// `max` là mốc kWh cộng dồn trong tháng, null = không giới hạn.
// Admin có thể chỉnh lại trên trang Bảng giá EVN.
export const DEFAULT_EVN_TIERS = [
  { max: 50, price: 1984 },
  { max: 100, price: 2050 },
  { max: 200, price: 2380 },
  { max: 300, price: 2998 },
  { max: 400, price: 3350 },
  { max: null, price: 3460 },
]
export const DEFAULT_VAT = 8

export const DEFAULT_HOME_SETTINGS = {
  gasThreshold: 400, // ppm – vượt ngưỡng sẽ kích hoạt cảnh báo
  tempHigh: 35, // °C – chỉ để hiển thị
  humidityHigh: 85, // % – chỉ để hiển thị
  luxLow: 50, // lux – chỉ để hiển thị
  offDelayMin: 5, // phút – tự tắt khi không còn người (chế độ Auto)
  alertEmails: [],
}
