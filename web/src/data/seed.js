// Dữ liệu khởi tạo cho phần còn giả lập (cài đặt nhà, cảnh báo, nhật ký, bảng giá EVN).
// Nhà và tài khoản đã chuyển lên Firebase (xem store/auth.js).
import { DEFAULT_EVN_TIERS, DEFAULT_VAT } from './constants'

export function createSeed() {
  return {
    settings: {}, // homeId -> cài đặt; chưa có thì dùng DEFAULT_HOME_SETTINGS
    alerts: [],
    logs: [],
    evn: { tiers: DEFAULT_EVN_TIERS, vat: DEFAULT_VAT },
  }
}
