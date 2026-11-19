// Dữ liệu khởi tạo cho phần còn giả lập (cài đặt nhà, cảnh báo, nhật ký).
// Nhà và tài khoản đã chuyển lên Firebase (xem store/auth.js).
export function createSeed() {
  return {
    settings: {}, // homeId -> cài đặt; chưa có thì dùng DEFAULT_HOME_SETTINGS
    alerts: [],
    logs: [],
  }
}
