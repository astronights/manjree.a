import { Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import PushStatus from './components/PushStatus'
import { isSupabaseMode } from './lib/store'
import Home from './pages/Home'
import ProductDetail from './pages/ProductDetail'
import AdminGuard from './pages/admin/AdminGuard'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminProductForm from './pages/admin/AdminProductForm'
import AdminAnalytics from './pages/admin/AdminAnalytics'
import AdminOrdering from './pages/admin/AdminOrdering'
import AdminNotify from './pages/admin/AdminNotify'
import AdminSettings from './pages/admin/AdminSettings'

export default function App() {
  return (
    <div className="min-h-dvh bg-cream-100 text-night-800 dark:bg-night-900 dark:text-cream-100">
      <Header />
      {!isSupabaseMode && (
        // Backend not configured (VITE_SUPABASE_* missing at build time). Loud
        // on purpose: a production deploy should never show this.
        <p className="bg-marigold-100 px-4 py-1.5 text-center text-xs font-medium text-marigold-700 dark:bg-night-800 dark:text-marigold-300">
          Demo mode — sample data only. Changes stay in this browser and are not connected to the
          real shop.
        </p>
      )}
      <PushStatus />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route element={<AdminGuard />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/ordering" element={<AdminOrdering />} />
          <Route path="/admin/notify" element={<AdminNotify />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/new" element={<AdminProductForm />} />
          <Route path="/admin/edit/:id" element={<AdminProductForm />} />
        </Route>
      </Routes>
    </div>
  )
}
