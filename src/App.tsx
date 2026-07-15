import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { shop } from './config'
import Header from './components/Header'
import PushOptIn from './components/PushOptIn'
import { isSupabaseMode } from './lib/store'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function ChatRedirect() {
  useEffect(() => { window.location.href = `https://wa.me/${shop.whatsappNumber}` }, [])
  return <p className="p-8 text-center text-sm text-night-700/80 dark:text-cream-300/60">Opening WhatsApp…</p>
}
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
      <ScrollToTop />
      <Header />
      {!isSupabaseMode && (
        // Backend not configured (VITE_SUPABASE_* missing at build time). Loud
        // on purpose: a production deploy should never show this.
        <p className="bg-marigold-100 px-4 py-1.5 text-center text-xs font-medium text-marigold-700 dark:bg-night-800 dark:text-marigold-300">
          Demo mode — sample data only. Changes stay in this browser and are not connected to the
          real shop.
        </p>
      )}
      <PushOptIn />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/install" element={<Home />} />
        <Route path="/chat" element={<ChatRedirect />} />
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
