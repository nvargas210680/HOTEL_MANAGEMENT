"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("http://127.0.0.1:8000/api/password-reset/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || "If an account with this email exists, a reset link has been sent.");
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('/images/hotel_palms.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="card p-4 shadow-lg text-dark" style={{ width: "100%", maxWidth: "400px" }}>
        <h2 className="text-center mb-3 fw-bold">Forgot Password</h2>
        <p className="text-muted small text-center mb-4">
          Enter your email address and we will provide you with a password reset link.
        </p>

        {message && <div className="alert alert-success" role="alert">{message}</div>}
        {error && <div className="alert alert-danger" role="alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-semibold">Email Address</label>
            <input
              type="email"
              required
              className="form-control"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary w-100 mt-2">
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
          <div className="text-center mt-3">
            <Link href="/" className="text-decoration-none small text-muted">
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}