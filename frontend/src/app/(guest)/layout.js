"use client";

import { useState, useEffect } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";

export default function GuestLayout({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");

    setIsAuthenticated(false);
    router.push("/login");
  };

  return (
    <div className="min-vh-100 bg-dark text-light">
      <header
        className="navbar navbar-expand-lg navbar-dark px-4 px-md-5"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "66px",
          zIndex: 1050,

          backgroundColor: "rgba(18, 18, 18, 0.55)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",

          borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
        }}
      >
        <NextLink
          href="/"
          className="navbar-brand fw-bold fs-4 text-uppercase text-light"
          style={{ letterSpacing: "2px" }}
        >
          Hotel Palms
        </NextLink>

        <div className="navbar-nav ms-auto d-flex align-items-center gap-4">
          <NextLink href="/rooms" className="nav-link text-light fw-medium">
            Rooms
          </NextLink>

          {isAuthenticated ? (
            <>
              <NextLink
                href="/my-bookings"
                className="nav-link text-light fw-medium"
              >
                My Bookings
              </NextLink>

              <NextLink
                href="/profile"
                className="nav-link text-light fw-medium"
              >
                My Profile
              </NextLink>

              <button
                onClick={handleLogout}
                className="btn btn-outline-light btn-sm rounded-pill px-4"
              >
                Logout
              </button>
            </>
          ) : (
            <NextLink
              href="/login"
              className="btn btn-light text-dark btn-sm rounded-pill px-4 fw-semibold"
            >
              Sign In
            </NextLink>
          )}
        </div>
      </header>

      <main
        className="container-fluid"
        style={{
          padding: "66px 0 0 0",
        }}
      >
        {children}
      </main>
    </div>
  );
}
