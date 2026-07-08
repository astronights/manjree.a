import { Route, Routes } from 'react-router-dom'
import Header from './components/Header.jsx'
import Home from './pages/Home.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import AdminGuard from './pages/admin/AdminGuard.jsx'
import AdminLogin from './pages/admin/AdminLogin.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminProductForm from './pages/admin/AdminProductForm.jsx'

export default function App() {
  return (
    <div className="min-h-dvh bg-cream-100 text-night-800 dark:bg-night-900 dark:text-cream-100">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route element={<AdminGuard />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/new" element={<AdminProductForm />} />
          <Route path="/admin/edit/:id" element={<AdminProductForm />} />
        </Route>
      </Routes>
    </div>
  )
}
