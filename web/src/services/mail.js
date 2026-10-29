// Gửi email qua EmailJS (dịch vụ trung gian nối với Gmail, không cần backend).
// Sau này chuyển sang Raspberry Pi gửi qua Gmail SMTP thì chỉ sửa file này.
import emailjs from '@emailjs/browser'

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

const loginUrl = () => `${window.location.origin}/dang-nhap`

const SENDER_NAME = 'Nhà Thông Minh'
const ROLE_LABELS = { admin: 'Quản trị viên', user: 'Thành viên' }

// Thư cấp tài khoản. `params` khớp biến trong template EmailJS:
//   To Email {{to_email}}, From Name {{name}}, nội dung {{name}} {{time}} {{message}} {{to_name}} {{role_assigned}} {{password}}
// `subject`/`body` chỉ để xem trước trên web (nội dung thật do template EmailJS quyết định).
export function accountEmail({ user, home, password }) {
  const role = `${ROLE_LABELS[user.role] ?? 'Thành viên'}${home?.name ? ` – ${home.name}` : ''}`
  const params = {
    to_email: user.email,
    to_name: user.fullName,
    name: SENDER_NAME,
    time: new Date().toLocaleString('vi-VN'),
    message: `Đăng nhập tại: ${loginUrl()}`,
    role_assigned: role,
    password,
  }
  const subject = 'Tài khoản Smart Home của bạn đã được phê duyệt'
  const body = [
    `Xin chào ${params.to_name},`,
    '',
    'Yêu cầu đăng ký tài khoản của bạn đã được Admin phê duyệt.',
    'Dưới đây là thông tin đăng nhập của bạn:',
    '',
    `- Vai trò: ${params.role_assigned}`,
    `- Email đăng nhập: ${params.to_email}`,
    `- Mật khẩu tạm thời: ${params.password}`,
    '',
    `Vui lòng đăng nhập tại trang web để sử dụng sản phẩm (${loginUrl()}). Xin cảm ơn.`,
    '',
    'Trân trọng,',
  ].join('\n')
  return { to: user.email, subject, body, params }
}

export async function sendMail({ params }) {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) throw new Error('Chưa cấu hình EmailJS trong web/.env.local')
  try {
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, params, { publicKey: PUBLIC_KEY })
  } catch (e) {
    // EmailJS trả về { status, text }
    throw new Error(e?.text || e?.message || 'Gửi email thất bại')
  }
}
