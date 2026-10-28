// Dữ liệu mẫu ban đầu (sẽ được thay bằng dữ liệu từ backend khi tích hợp)
import { DEFAULT_EVN_TIERS, DEFAULT_HOME_SETTINGS, DEFAULT_VAT } from './constants'

const DAY = 86400000

export function createSeed() {
  const now = Date.now()
  const ago = (days, hours = 0) => new Date(now - days * DAY - hours * 3600000).toISOString()

  const homes = [
    { id: 'home1', name: 'Nhà Huy Hoàng', address: 'Thủ Đức, TP. Hồ Chí Minh', createdAt: ago(170), hasHardware: true },
    { id: 'home2', name: 'Nhà anh An', address: 'Quận 7, TP. Hồ Chí Minh', createdAt: ago(120) },
    { id: 'home3', name: 'Nhà chị Bình', address: 'Biên Hoà, Đồng Nai', createdAt: ago(55) },
    { id: 'home4', name: 'Nhà Minh Châu', address: 'Dĩ An, Bình Dương', createdAt: ago(12) },
  ]

  const users = [
    { id: 'u0', username: 'admin', password: 'admin123', fullName: 'Quản trị viên', email: 'admin@smarthome.local', role: 'admin', homeId: null, status: 'active', createdAt: ago(200) },
    { id: 'u1', username: 'hoang', password: '123456', fullName: 'Tống Hữu Huy Hoàng', email: 'hoang@example.com', role: 'user', homeId: 'home1', status: 'active', createdAt: ago(170) },
    { id: 'u2', username: 'lan', password: '123456', fullName: 'Nguyễn Thị Lan', email: 'lan@example.com', role: 'user', homeId: 'home1', status: 'active', createdAt: ago(168) },
    { id: 'u3', username: 'an', password: '123456', fullName: 'Lê Văn An', email: 'an@example.com', role: 'user', homeId: 'home2', status: 'active', createdAt: ago(120) },
    { id: 'u4', username: 'hoa', password: '123456', fullName: 'Phạm Thị Hoa', email: 'hoa@example.com', role: 'user', homeId: 'home2', status: 'locked', createdAt: ago(90) },
    { id: 'u5', username: 'binh', password: '123456', fullName: 'Trần Thị Bình', email: 'binh@example.com', role: 'user', homeId: 'home3', status: 'active', createdAt: ago(55) },
    { id: 'u6', username: 'khoa', password: '123456', fullName: 'Trần Minh Khoa', email: 'khoa@example.com', role: 'user', homeId: 'home3', status: 'active', createdAt: ago(40) },
    { id: 'u7', username: 'chau', password: '123456', fullName: 'Đỗ Minh Châu', email: 'chau@example.com', role: 'user', homeId: 'home4', status: 'active', createdAt: ago(12) },
    { id: 'u8', username: 'tuan', password: '123456', fullName: 'Đỗ Anh Tuấn', email: 'tuan@example.com', role: 'user', homeId: 'home4', status: 'active', createdAt: ago(3) },
  ]

  const emailsOf = (homeId) => users.filter((u) => u.homeId === homeId).map((u) => u.email)
  const settings = Object.fromEntries(
    homes.map((h) => [h.id, { ...DEFAULT_HOME_SETTINGS, alertEmails: emailsOf(h.id) }]),
  )

  const alerts = [
    {
      id: 'a1', homeId: 'home3', type: 'gas', room: 'kitchen', peakValue: 612, threshold: 400,
      createdAt: ago(0, 2), resolvedAt: ago(0, 1.6),
      acknowledgedAt: null, acknowledgedBy: null, reminders: [], emailsSentTo: emailsOf('home3'),
    },
    {
      id: 'a2', homeId: 'home2', type: 'gas', room: 'kitchen', peakValue: 488, threshold: 400,
      createdAt: ago(6, 5), resolvedAt: ago(6, 4.8),
      acknowledgedAt: ago(6, 4.9), acknowledgedBy: 'Lê Văn An', reminders: [], emailsSentTo: emailsOf('home2'),
    },
    {
      id: 'a3', homeId: 'home1', type: 'gas', room: 'kitchen', peakValue: 530, threshold: 400,
      createdAt: ago(14, 3), resolvedAt: ago(14, 2.7),
      acknowledgedAt: ago(14, 2.5), acknowledgedBy: 'Tống Hữu Huy Hoàng',
      reminders: [{ at: ago(14, 2.6), by: 'Quản trị viên' }], emailsSentTo: emailsOf('home1'),
    },
    {
      id: 'a4', homeId: 'home1', type: 'gas', room: 'kitchen', peakValue: 455, threshold: 400,
      createdAt: ago(45, 7), resolvedAt: ago(45, 6.9),
      acknowledgedAt: ago(45, 6.95), acknowledgedBy: 'Nguyễn Thị Lan', reminders: [], emailsSentTo: emailsOf('home1'),
    },
  ]

  const logs = [
    { id: 'l1', homeId: 'home1', at: ago(0, 1), actor: 'Tống Hữu Huy Hoàng', room: 'living', action: 'Chuyển sang chế độ Tự động' },
    { id: 'l2', homeId: 'home1', at: ago(0, 1.2), actor: 'Tống Hữu Huy Hoàng', room: 'living', action: 'Tắt Quạt' },
    { id: 'l3', homeId: 'home1', at: ago(0, 3), actor: 'Nguyễn Thị Lan', room: 'kitchen', action: 'Bật Đèn LED' },
    { id: 'l4', homeId: 'home1', at: ago(0, 3.1), actor: 'Nguyễn Thị Lan', room: 'kitchen', action: 'Chuyển sang chế độ Thủ công' },
  ]

  return {
    homes,
    users,
    settings,
    alerts,
    logs,
    evn: { tiers: DEFAULT_EVN_TIERS, vat: DEFAULT_VAT },
  }
}
