import Link from 'next/link';

export default function GuestLayout({ children }) {
  return (
    <div>
      <header className="navbar navbar-expand-lg navbar-light bg-light px-4 border-bottom">
        <Link href="/rooms" className="navbar-brand fw-bold">
          Hotel Logo
        </Link>
        
        <div className="navbar-nav ms-auto d-flex align-items-center gap-3">
          <Link href="/rooms" className="nav-link">
            Rooms
          </Link>
          <Link href="/my-bookings" className="nav-link">
            My Bookings
          </Link>
          {/* Logout button or user dropdown */}
        </div>
      </header>

      <main className="container py-4">
        {children}
      </main>
    </div>
  );
}