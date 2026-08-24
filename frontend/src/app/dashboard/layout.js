'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!isAuthenticated) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

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
          </nav>

          {/* Logout Button */}
          <button onClick={handleLogout} className="btn btn-outline-danger w-100 mt-auto">
            Logout
          </button>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="col-md-9 col-lg-10 bg-light p-4 overflow-auto">
          {children}
        </main>

      </div>
    </div>
  );
}