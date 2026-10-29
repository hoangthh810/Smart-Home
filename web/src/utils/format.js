export const fmtNumber = (v, digits = 0) =>
  v == null || Number.isNaN(v)
    ? '--'
    : Number(v).toLocaleString('vi-VN', { minimumFractionDigits: digits, maximumFractionDigits: digits })

export const fmtVnd = (v) => `${fmtNumber(Math.round(v ?? 0))} đ`

export const fmtDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
    : '--'

// ID node ESP32 (cài bằng nút trên node) – hiển thị 2 chữ số giống LCD: #01
export const fmtNodeId = (id) => (id == null ? '--' : `#${String(id).padStart(2, '0')}`)

export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('vi-VN') : '--')

export function fmtEnergy(wh) {
  if (wh == null) return '--'
  return wh >= 1000 ? `${fmtNumber(wh / 1000, 2)} kWh` : `${fmtNumber(wh, 1)} Wh`
}

export function timeAgo(iso) {
  if (!iso) return '--'
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'vừa xong'
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
  return `${Math.floor(diff / 86400)} ngày trước`
}
