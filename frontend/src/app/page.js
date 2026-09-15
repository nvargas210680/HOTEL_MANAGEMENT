"use client";

import Link from "next/link";
import "bootstrap-icons/font/bootstrap-icons.css";

export default function LandingPage() {
  return (
    <div
      className="min-vh-100 d-flex flex-column justify-content-between text-white text-center"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.48), rgba(0, 0, 0, 0.48)), url('/images/hotel_palms.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Spacer */}
      <div></div>

      {/* Hero */}
      <main className="container px-3" style={{ maxWidth: "780px" }}>
        <div
          className="text-uppercase fw-semibold mb-3"
          style={{
            fontSize: "0.75rem",
            letterSpacing: "0.3rem",
            opacity: 0.85,
          }}
        >
          Welcome to Hotel Palms
        </div>

        <h1
          className="display-2 fw-bold mb-4"
          style={{
            letterSpacing: "-0.02em",
            textShadow: "0 2px 15px rgba(0,0,0,0.25)",
          }}
        >
          A stay worth
          <br />
          <span className="fst-italic fw-light">remembering.</span>
        </h1>

        <p
          className="lead mx-auto mb-4"
          style={{
            maxWidth: "650px",
            lineHeight: "1.8",
            textShadow: "0 1px 8px rgba(0,0,0,0.25)",
          }}
        >
          Experience comfort, elegance, and exceptional hospitality.
          Discover a place designed to make every stay feel special.
        </p>

        <div className="d-flex justify-content-center gap-3 flex-wrap mb-4">
          <Link
            href="/rooms"
            className="btn btn-light btn-lg px-4 rounded-pill fw-semibold shadow"
          >
            Browse Rooms
          </Link>

          <Link
            href="/login"
            className="btn btn-outline-light btn-lg px-4 rounded-pill fw-semibold"
          >
            Sign In
          </Link>
        </div>

        <Link
          href="/about"
          className="text-white text-decoration-none small"
          style={{ opacity: 0.85 }}
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
              <div className="fw-semibold text-white mb-1">
                Hotel Palms
              </div>
              <div>
                Your comfort, our priority.
              </div>
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

          <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
            <span>© 2026 Hotel Palms. All rights reserved.</span>

            <div className="d-flex gap-3">
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
      </footer>
    </div>
  );
}