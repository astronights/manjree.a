import { Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import Home from './pages/Home'
import ProductDetail from './pages/ProductDetail'
import AdminGuard from './pages/admin/AdminGuard'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminProductForm from './pages/admin/AdminProductForm'
import AdminAnalytics from './pages/admin/AdminAnalytics'

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
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/new" element={<AdminProductForm />} />
          <Route path="/admin/edit/:id" element={<AdminProductForm />} />
        </Route>
      </Routes>
    </div>
  )
}
