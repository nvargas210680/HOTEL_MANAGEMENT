"use client";

import Link from "next/link";
import "bootstrap-icons/font/bootstrap-icons.css";

export default function LandingPage() {
  return (
    <div
      className="min-vh-100 d-flex flex-column justify-content-between text-white text-center position-relative overflow-hidden"
      style={{
        minHeight: "100vh",
      }}
    >
      <video
        autoPlay
        loop
        muted
        playsInline
        className="position-absolute top-0 start-0 w-100 h-100"
        style={{
          objectFit: "cover",
          zIndex: 0,
        }}
      >
        <source src="/videos/hotel_palms.mp4" type="video/mp4" />
      </video>

      <div
        className="position-absolute top-0 start-0 w-100 h-100"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.08)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      ></div>

      <div
        className="position-relative min-vh-100 d-flex flex-column justify-content-between"
        style={{ zIndex: 2 }}
      >
        <div></div>

        {/* Hero */}
        <main className="container px-3" style={{ maxWidth: "780px" }}>
          <div
            className="text-uppercase fw-semibold mb-4 border border-white rounded px-3 py-2 d-inline-block"
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.3rem",
              opacity: 0.95,
              textShadow: "0 2px 10px rgba(0,0,0,0.6)",
            }}
          >
            Welcome to Hotel Palms
          </div>

          <p
            className="lead mx-auto mb-4"
            style={{
              maxWidth: "650px",
              lineHeight: "1.8",
              textShadow: "0 2px 12px rgba(0,0,0,0.65)",
            }}
          >
            Experience comfort, elegance, and exceptional hospitality. Discover
            a place designed to make every stay feel special.
          </p>

          <div className="d-flex justify-content-center gap-3 flex-wrap mb-4">
            <Link
              href="/rooms"
              className="btn px-4 py-2 fw-semibold shadow-sm"
              style={{
                color: "#ffffff",
                backgroundColor: "rgba(20, 32, 45, 0.85)",
                border: "1px solid rgba(255,255,255,0.75)",
                borderRadius: "10px",
                backdropFilter: "blur(6px)",
                textShadow: "0 1px 3px rgba(0,0,0,0.4)",
                transition: "all 0.2s ease-in-out",
              }}
            >
              Browse Rooms
            </Link>

            <Link
              href="/login"
              className="btn px-4 py-2 fw-semibold shadow-sm"
              style={{
                color: "#ffffff",
                backgroundColor: "rgba(255,255,255,0.2)",
                border: "1px solid rgba(255,255,255,0.85)",
                borderRadius: "10px",
                backdropFilter: "blur(6px)",
                textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                transition: "all 0.2s ease-in-out",
              }}
            >
              Sign In
            </Link>
          </div>

          <Link
            href="/about"
            className="text-white text-decoration-none small fw-semibold"
            style={{
              opacity: 0.95,
              textShadow: "0 2px 8px rgba(0,0,0,0.65)",
            }}
          >
            Discover Hotel Palms
            <i className="bi bi-arrow-right ms-2"></i>
          </Link>
        </main>

        {/* Footer */}
        <footer
          className="w-100 mt-5 py-4 text-white-50 small"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.45)",
            backdropFilter: "blur(8px)",
            borderTop: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <div className="container px-4">
            <div className="row align-items-center gy-3">
              <div className="col-md-4 text-center text-md-start">
                <div className="fw-semibold text-white mb-1">Hotel Palms</div>
                <div>Your comfort, our priority.</div>
              </div>

              <div className="col-md-4 text-center">
                <div>123 Palm Avenue, Calgary, AB</div>
                <div className="mt-1">info@hotelpalms.com</div>
              </div>

              <div className="col-md-4 text-center text-md-end">
                <div className="d-flex justify-content-center justify-content-md-end gap-3">
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white-50 text-decoration-none fs-5"
                    aria-label="Instagram"
                  >
                    <i className="bi bi-instagram"></i>
                  </a>

                  <a
                    href="https://youtube.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white-50 text-decoration-none fs-5"
                    aria-label="YouTube"
                  >
                    <i className="bi bi-youtube"></i>
                  </a>

                  <a
                    href="https://x.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white-50 text-decoration-none fs-5"
                    aria-label="X"
                  >
                    <i className="bi bi-twitter-x"></i>
                  </a>
                </div>
              </div>
            </div>

            <hr
              className="my-3"
              style={{ borderColor: "rgba(255,255,255,0.15)" }}
            />

            <div className="row align-items-center py-3 text-white-50 small">
              {/* Left Section: Clean up repetition */}
              <div className="col-md-4 text-center text-md-start mb-2 mb-md-0">
                <span>Experience elegance</span>
              </div>

              {/* Center Section: Copyright */}
              <div className="col-md-4 text-center mb-2 mb-md-0">
                <span>© 2026 Hotel Palms. All rights reserved.</span>
              </div>

              {/* Right Section: Links */}
              <div className="col-md-4 text-center text-md-end">
                <div className="d-inline-flex gap-3">
                  <Link
                    href="/about"
                    className="text-white-50 text-decoration-none"
                  >
                    About Us
                  </Link>
                  <Link
                    href="/rooms"
                    className="text-white-50 text-decoration-none"
                  >
                    Rooms
                  </Link>
                  <Link
                    href="/login"
                    className="text-white-50 text-decoration-none"
                  >
                    Sign In
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
