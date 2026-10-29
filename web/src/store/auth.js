// Đăng nhập (Firebase Auth) + hồ sơ tài khoản và danh sách nhà (Firestore, cập nhật realtime).
// Firestore:
//   users/{uid}  {fullName, email, role: 'admin'|'user', homeId, status: 'active'|'locked', createdAt}
//   homes/{id}   {name, address, createdAt, hasHardware?}
import { create } from 'zustand'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { collection, doc, getDoc, onSnapshot, query, setDoc, where } from 'firebase/firestore'
import { auth, BOOTSTRAP_ADMIN_UID, db, errorMessage, withTimeout } from '../services/firebase'

const withId = (snap) => ({ id: snap.id, ...snap.data() })

export const useAuth = create((set) => ({
  ready: false, // đã biết trạng thái đăng nhập + hồ sơ chưa
  profile: null, // users/{uid} của người đang đăng nhập
  homes: [], // admin: mọi nhà; user: nhà của mình
  homesLoaded: false, // đã nhận dữ liệu nhà lần đầu từ Firestore
  users: [], // admin: mọi tài khoản; user: thành viên cùng nhà

  async login(email, password) {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email.trim(), password)
      const snap = await getDoc(doc(db, 'users', user.uid))
      if (!snap.exists()) {
        if (user.uid !== BOOTSTRAP_ADMIN_UID) {
          await signOut(auth)
          return 'Tài khoản chưa được cấp quyền truy cập. Liên hệ quản trị viên'
        }
        // Lần đầu đăng nhập của admin gốc: tự tạo hồ sơ
        await withTimeout(setDoc(doc(db, 'users', user.uid), {
          fullName: 'Quản trị viên',
          email: user.email,
          role: 'admin',
          homeId: null,
          status: 'active',
          createdAt: new Date().toISOString(),
        }))
      } else if (snap.data().status === 'locked') {
        await signOut(auth)
        return 'Tài khoản đã bị khoá. Vui lòng liên hệ quản trị viên'
      }
      return null
    } catch (e) {
      return errorMessage(e)
    }
  },

  logout: () => signOut(auth),
}))

// ---------- Đồng bộ với Firebase ----------
let unsubs = []
const stopSync = () => {
  unsubs.forEach((u) => u())
  unsubs = []
}

// Lỗi đọc (vd: thiếu quyền) → vẫn coi như đã tải xong để giao diện không chờ mãi
const onLoadError = (e) => {
  console.error('Firestore:', e)
  useAuth.setState({ homesLoaded: true })
}

function startDataSync(profile) {
  const set = useAuth.setState
  if (profile.role !== 'admin' && !profile.homeId) {
    set({ homesLoaded: true })
    return
  }
  if (profile.role === 'admin') {
    unsubs.push(onSnapshot(collection(db, 'homes'), (s) => set({ homes: s.docs.map(withId), homesLoaded: true }), onLoadError))
    unsubs.push(onSnapshot(collection(db, 'users'), (s) => set({ users: s.docs.map(withId) })))
  } else if (profile.homeId) {
    unsubs.push(
      onSnapshot(doc(db, 'homes', profile.homeId), (s) => set({ homes: s.exists() ? [withId(s)] : [], homesLoaded: true }), onLoadError),
    )
    unsubs.push(
      onSnapshot(query(collection(db, 'users'), where('homeId', '==', profile.homeId)), (s) => set({ users: s.docs.map(withId) })),
    )
  }
}

let dataKey = null
onAuthStateChanged(auth, (user) => {
  stopSync()
  dataKey = null
  if (!user) {
    useAuth.setState({ ready: true, profile: null, homes: [], users: [], homesLoaded: false })
    return
  }
  // Theo dõi hồ sơ của chính mình: bị khoá / đổi quyền thì giao diện cập nhật ngay
  const unsubProfile = onSnapshot(
    doc(db, 'users', user.uid),
    (snap) => {
      const profile = snap.exists() ? withId(snap) : null
      if (profile?.status === 'locked') {
        signOut(auth)
        return
      }
      // Chỉ khởi động lại đồng bộ dữ liệu khi quyền hoặc nhà thay đổi
      const key = profile ? `${profile.role}:${profile.homeId}` : null
      if (key !== dataKey) {
        unsubs.filter((u) => u !== unsubProfile).forEach((u) => u())
        unsubs = [unsubProfile]
        dataKey = key
        useAuth.setState({ homes: [], users: [], homesLoaded: false })
        if (profile) startDataSync(profile)
      }
      // Hồ sơ chưa có (admin gốc đang được tạo hồ sơ ở login) → chờ snapshot tiếp theo
      useAuth.setState({ profile, ready: !!profile || user.uid !== BOOTSTRAP_ADMIN_UID })
    },
    () => useAuth.setState({ ready: true, profile: null }),
  )
  unsubs.push(unsubProfile)
})

// Trang chính sau khi đăng nhập
export const homePathOf = (user) => (user.role === 'admin' ? '/admin' : '/nha')

export function useCurrentUser() {
  return useAuth((s) => s.profile)
}

export function useCurrentHome() {
  return useAuth((s) => s.homes.find((h) => h.id === s.profile?.homeId) ?? null)
}
