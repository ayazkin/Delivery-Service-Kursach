import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { AppLayout } from './layouts/AppLayout'
import { CouriersPage } from './pages/CouriersPage'
import { EventMonitorPage } from './pages/EventMonitorPage'
import { OrderDetailsPage } from './pages/OrderDetailsPage'
import { OrdersPage } from './pages/OrdersPage'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/orders" replace />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:id" element={<OrderDetailsPage />} />
        <Route path="/couriers" element={<CouriersPage />} />
        <Route path="/monitor" element={<EventMonitorPage />} />
      </Route>
    </Routes>
  )
}

export default App
