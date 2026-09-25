export default function DashboardPage() {
  const user = JSON.parse(localStorage.getItem('user_info') || 'null')
  return <main className="dashboard-page"><h1>Dashboard</h1><p>Xin chào {user?.name || user?.email || 'bạn'}.</p></main>
}
