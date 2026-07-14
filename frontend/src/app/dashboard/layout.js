import Link from 'next/link';

export default function DashboardLayout({ children }) {
  return (
    <div className="container-fluid">
      <div className="row vh-100">
        
        {/* BOOTSTRAP SIDEBAR MENU */}
        <aside className="col-md-3 col-lg-2 bg-dark text-white p-3 d-flex flex-column">
          <h2 className="h4 text-center my-3 text-primary">Hotel Admin</h2>
          <hr className="bg-light" />
          
          {/* Navigation Links */}
          <nav className="nav nav-pills flex-column mb-auto">
            <Link href="/dashboard" className="nav-link text-white my-1 hover-opacity">
              Overview
            </Link>
            <Link href="/dashboard/rooms" className="nav-link text-white my-1 hover-opacity">
              Manage Rooms
            </Link>
            <Link href="/dashboard/rooms/create" className="nav-link text-white my-1 hover-opacity">
              Add New Rooms
            </Link>
          </nav>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="col-md-9 col-lg-10 bg-light p-4 overflow-auto">
          {children}
        </main>

      </div>
    </div>
  );
}