// Kết nối Firebase (Auth + Firestore). Cấu hình lấy từ web/.env.local
import { initializeApp } from 'firebase/app'
import { browserSessionPersistence, getAuth, inMemoryPersistence, setPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app = initializeApp(config)
export const auth = getAuth(app)
export const db = getFirestore(app)

// Mỗi tab một phiên đăng nhập (tiện demo: 1 tab admin, 1 tab user)
setPersistence(auth, browserSessionPersistence)

// App phụ để admin tạo tài khoản cho người khác mà không bị đăng xuất khỏi phiên của mình
// (createUserWithEmailAndPassword luôn đăng nhập vào tài khoản vừa tạo)
const secondaryApp = initializeApp(config, 'secondary')
export const secondaryAuth = getAuth(secondaryApp)
setPersistence(secondaryAuth, inMemoryPersistence)

export const BOOTSTRAP_ADMIN_UID = import.meta.env.VITE_BOOTSTRAP_ADMIN_UID

// Đổi mã lỗi Firebase sang câu tiếng Việt
const ERRORS = {
  'auth/invalid-credential': 'Sai email hoặc mật khẩu',
  'auth/wrong-password': 'Sai email hoặc mật khẩu',
  'auth/user-not-found': 'Sai email hoặc mật khẩu',
  'auth/invalid-email': 'Email không hợp lệ',
  'auth/email-already-in-use': 'Email này đã được dùng cho một tài khoản khác',
  'auth/weak-password': 'Mật khẩu phải có ít nhất 6 ký tự',
  'auth/too-many-requests': 'Thử sai quá nhiều lần, vui lòng đợi vài phút',
  'auth/network-request-failed': 'Không kết nối được máy chủ, kiểm tra Internet',
  'auth/requires-recent-login': 'Vui lòng đăng nhập lại rồi thử lại',
  'permission-denied': 'Không có quyền thực hiện thao tác này',
  timeout:
    'Không ghi được dữ liệu lên Firebase. Nếu dùng Brave hoặc trình chặn quảng cáo (uBlock, AdBlock…), hãy tắt chặn cho trang này rồi thử lại',
}
export const errorMessage = (e) => ERRORS[e?.code] ?? e?.message ?? 'Đã có lỗi xảy ra'

// Lệnh ghi Firestore bị chặn (Brave Shields, adblock) sẽ treo mãi không báo lỗi → đặt giới hạn thời gian
export function withTimeout(promise, ms = 15000) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'timeout' })), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}
