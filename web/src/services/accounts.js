// Thao tác của admin với nhà và tài khoản trên Firebase.
// Lưu ý: web không xoá được tài khoản Auth của người khác (cần Admin SDK – sau này do Pi làm),
// nên "xoá tài khoản" = xoá hồ sơ Firestore, tài khoản đó không đăng nhập vào hệ thống được nữa.
import { createUserWithEmailAndPassword, deleteUser, sendPasswordResetEmail, signOut } from 'firebase/auth'
import { addDoc, collection, deleteDoc, doc, getDocs, query, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore'
import { auth, db, secondaryAuth, withTimeout } from './firebase'

const nowIso = () => new Date().toISOString()

export async function createHome({ name, address }) {
  const ref = await withTimeout(addDoc(collection(db, 'homes'), { name, address, createdAt: nowIso() }))
  return ref.id
}

export const updateHome = (id, patch) => updateDoc(doc(db, 'homes', id), patch)

// Xoá nhà + hồ sơ các thành viên của nhà
export async function deleteHome(id) {
  const members = await getDocs(query(collection(db, 'users'), where('homeId', '==', id)))
  const batch = writeBatch(db)
  members.forEach((m) => batch.delete(m.ref))
  batch.delete(doc(db, 'homes', id))
  await batch.commit()
}

// Cấp tài khoản: tạo trên Firebase Auth (qua app phụ) rồi ghi hồ sơ vào Firestore.
// Ghi hồ sơ lỗi thì xoá luôn tài khoản Auth vừa tạo (app phụ đang đăng nhập bằng chính tài khoản đó),
// tránh email bị "chiếm" mà không dùng được.
export async function createAccount({ fullName, email, password, homeId }) {
  const { user } = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password)
  const profile = { fullName, email: user.email, role: 'user', homeId, status: 'active', createdAt: nowIso() }
  try {
    await withTimeout(setDoc(doc(db, 'users', user.uid), profile))
  } catch (e) {
    await deleteUser(user).catch(() => {})
    throw e
  } finally {
    await signOut(secondaryAuth).catch(() => {})
  }
  return { id: user.uid, ...profile }
}

export const updateAccount = (id, patch) => updateDoc(doc(db, 'users', id), patch)
export const deleteAccount = (id) => deleteDoc(doc(db, 'users', id))

// Firebase gửi email có đường link để người dùng tự đặt mật khẩu mới
export const sendResetPassword = (email) => sendPasswordResetEmail(auth, email)
