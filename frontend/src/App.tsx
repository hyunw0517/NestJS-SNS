import { Route, Routes } from 'react-router-dom'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import PublicOnlyRoute from '@/components/auth/PublicOnlyRoute'
import AppLayout from '@/components/layout/AppLayout'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import Messages from '@/pages/Messages'
import PostDetail from '@/pages/PostDetail'
import Profile from '@/pages/Profile'
import Register from '@/pages/Register'

function App() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/profile/:id?" element={<Profile />} />
          <Route path="/posts/:id" element={<PostDetail />} />
          <Route path="/messages" element={<Messages />} />
        </Route>
      </Route>

      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
    </Routes>
  )
}

export default App
