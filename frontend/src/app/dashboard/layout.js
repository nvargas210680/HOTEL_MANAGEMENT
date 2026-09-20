"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    router.push("/login");
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
            <Link
              href="/dashboard"
              className="nav-link text-white my-1 hover-opacity"
            >
              Overview
            </Link>
            <Link
              href="/dashboard/rooms"
              className="nav-link text-white my-1 hover-opacity"
            >
              Manage Rooms
            </Link>
            <Link
              href="/dashboard/check-in-out"
              className="nav-link text-white my-1 hover-opacity"
            >
              Check-In / Out
            </Link>
            <Link
              href="/dashboard/reports"
              className="nav-link text-white my-1 hover-opacity"
            >
              Reports
            </Link>
          </nav>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-100 mt-auto fw-semibold"
            style={{
              height: "42px",
              borderRadius: "8px",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              color: "#ffffff",
              fontSize: "0.9rem",
              letterSpacing: "0.2px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#dc3545";
              e.currentTarget.style.borderColor = "#dc3545";
              e.currentTarget.style.boxShadow =
                "0 4px 12px rgba(220, 53, 69, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor =
                "rgba(255, 255, 255, 0.08)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
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
