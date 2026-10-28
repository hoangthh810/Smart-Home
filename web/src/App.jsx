import { Navigate, Route, Routes } from 'react-router-dom'
import { homePathOf, useCurrentUser } from './store/auth'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Account from './pages/Account'
import Dashboard from './pages/user/Dashboard'
import Room from './pages/user/Room'
import Energy from './pages/user/Energy'
import HistoryPage from './pages/user/History'
import HomeSettings from './pages/user/HomeSettings'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminAlerts from './pages/admin/AdminAlerts'
import EvnPricing from './pages/admin/EvnPricing'

function RequireRole({ role, children }) {
  const user = useCurrentUser()
  if (!user || user.status === 'locked') return <Navigate to="/dang-nhap" replace />
  if (user.role !== role) return <Navigate to={homePathOf(user)} replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dang-nhap" element={<Login />} />

      <Route
        path="nha"
        element={
          <RequireRole role="user">
            <Layout role="user" />
          </RequireRole>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="phong/:roomId" element={<Room />} />
        <Route path="dien-nang" element={<Energy />} />
        <Route path="lich-su" element={<HistoryPage />} />
        <Route path="cai-dat" element={<HomeSettings />} />
        <Route path="tai-khoan" element={<Account />} />
      </Route>

      <Route
        path="admin"
        element={
          <RequireRole role="admin">
            <Layout role="admin" />
          </RequireRole>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="nguoi-dung" element={<AdminUsers />} />
        <Route path="canh-bao" element={<AdminAlerts />} />
        <Route path="bang-gia" element={<EvnPricing />} />
        <Route path="tai-khoan" element={<Account />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
