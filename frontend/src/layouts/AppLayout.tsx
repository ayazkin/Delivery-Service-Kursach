import { NavLink, Outlet } from 'react-router-dom'

const navigation = [
  { to: '/orders', label: 'Заказы' },
  { to: '/couriers', label: 'Курьеры' },
]

export function AppLayout() {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Основная навигация">
        <div className="brand">
          <span className="brand-mark">ДС</span>
          <span>Сервис доставки</span>
        </div>

        <nav className="nav-list">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? 'nav-link nav-link-active' : 'nav-link'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
