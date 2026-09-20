"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirm_password: "",
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    id_document: "",
  });
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (formData.password !== formData.confirm_password) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/api/register/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Registration successful:", data);
        alert("Account created successfully! Please log in.");
        router.push("/login");
      } else {
        setErrorMsg(
          data.detail ||
            data.confirm_password ||
            "Registration failed. Please check your details.",
        );
      }
    } catch (error) {
      console.error("Network error connecting to Django:", error);
      setErrorMsg("Could not connect to the backend server.");
    }
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center py-5"
      style={{
        minHeight: "100vh",
        paddingTop: "90px",
        paddingBottom: "40px",
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.28), rgba(0, 0, 0, 0.28)), url('/images/hotel_palms.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      <div
        className="p-4 p-md-5"
        style={{
          width: "100%",
          maxWidth: "500px",
          borderRadius: "24px",
          background: "rgba(255, 255, 255, 0.14)",
          backdropFilter: "blur(22px) saturate(140%)",
          WebkitBackdropFilter: "blur(22px) saturate(140%)",
          border: "1px solid rgba(255, 255, 255, 0.32)",
          boxShadow:
            "0 25px 60px rgba(0, 0, 0, 0.28), inset 0 1px 1px rgba(255, 255, 255, 0.28)",
        }}
      >
        <div className="text-center mb-4">
          <div
            className="d-inline-flex align-items-center justify-content-center mb-3 overflow-hidden"
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.16)",
              border: "1px solid rgba(255, 255, 255, 0.38)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow:
                "0 12px 35px rgba(0, 0, 0, 0.22), inset 0 1px 1px rgba(255, 255, 255, 0.3)",
            }}
          >
            <img
              src="/images/hotel_palms_logo.jpg"
              alt="Hotel Palms Logo"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>

          <h2
            className="mb-1 fw-bold"
            style={{
              color: "#ffffff",
              textShadow: "0 2px 10px rgba(0, 0, 0, 0.25)",
            }}
          >
            Create Guest Account
          </h2>

          <p
            className="mb-0"
            style={{
              color: "rgba(255, 255, 255, 0.82)",
              fontSize: "0.9rem",
            }}
          >
            Create an account to manage your hotel reservations
          </p>
        </div>

        {errorMsg && (
          <div className="alert alert-danger py-2 small" role="alert">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label
                className="form-label fw-semibold"
                style={{ color: "#ffffff" }}
              >
                First Name
              </label>
              <input
                type="text"
                name="first_name"
                className="form-control"
                placeholder="John"
                value={formData.first_name}
                onChange={handleChange}
                required
                style={{
                  background: "rgba(255, 255, 255, 0.16)",
                  border: "1px solid rgba(255, 255, 255, 0.28)",
                  color: "#ffffff",
                  borderRadius: "10px",
                  padding: "10px 13px",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              />
            </div>

            <div className="col-md-6 mb-3">
              <label
                className="form-label fw-semibold"
                style={{ color: "#ffffff" }}
              >
                Last Name
              </label>
              <input
                type="text"
                name="last_name"
                className="form-control"
                placeholder="Doe"
                value={formData.last_name}
                onChange={handleChange}
                required
                style={{
                  background: "rgba(255, 255, 255, 0.16)",
                  border: "1px solid rgba(255, 255, 255, 0.28)",
                  color: "#ffffff",
                  borderRadius: "10px",
                  padding: "10px 13px",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              />
            </div>
          </div>

          <div className="mb-3">
            <label
              className="form-label fw-semibold"
              style={{ color: "#ffffff" }}
            >
              Username
            </label>
            <input
              type="text"
              name="username"
              className="form-control"
              placeholder="Choose a username"
              value={formData.username}
              onChange={handleChange}
              required
              style={{
                background: "rgba(255, 255, 255, 0.16)",
                border: "1px solid rgba(255, 255, 255, 0.28)",
                color: "#ffffff",
                borderRadius: "10px",
                padding: "10px 13px",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
            />
          </div>

          <div className="mb-3">
            <label
              className="form-label fw-semibold"
              style={{ color: "#ffffff" }}
            >
              Email
            </label>
            <input
              type="email"
              name="email"
              className="form-control"
              placeholder="name@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              style={{
                background: "rgba(255, 255, 255, 0.16)",
                border: "1px solid rgba(255, 255, 255, 0.28)",
                color: "#ffffff",
                borderRadius: "10px",
                padding: "10px 13px",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
            />
          </div>

          <div className="mb-3">
            <label
              className="form-label fw-semibold"
              style={{ color: "#ffffff" }}
            >
              Password
            </label>
            <input
              type="password"
              name="password"
              className="form-control"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              required
              style={{
                background: "rgba(255, 255, 255, 0.16)",
                border: "1px solid rgba(255, 255, 255, 0.28)",
                color: "#ffffff",
                borderRadius: "10px",
                padding: "10px 13px",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
            />
          </div>

          <div className="mb-3">
            <label
              className="form-label fw-semibold"
              style={{ color: "#ffffff" }}
            >
              Confirm Password
            </label>
            <input
              type="password"
              name="confirm_password"
              className="form-control"
              placeholder="Re-enter password"
              value={formData.confirm_password}
              onChange={handleChange}
              required
              style={{
                background: "rgba(255, 255, 255, 0.16)",
                border: "1px solid rgba(255, 255, 255, 0.28)",
                color: "#ffffff",
                borderRadius: "10px",
                padding: "10px 13px",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
            />
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label
                className="form-label fw-semibold"
                style={{ color: "#ffffff" }}
              >
                Phone Number
              </label>
              <input
                type="tel"
                name="phone_number"
                className="form-control"
                placeholder="+1 123 456 7890"
                value={formData.phone_number}
                onChange={handleChange}
                required
                style={{
                  background: "rgba(255, 255, 255, 0.16)",
                  border: "1px solid rgba(255, 255, 255, 0.28)",
                  color: "#ffffff",
                  borderRadius: "10px",
                  padding: "10px 13px",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              />
            </div>

            <div className="col-md-6 mb-3">
              <label
                className="form-label fw-semibold"
                style={{ color: "#ffffff" }}
              >
                ID / Passport Number
              </label>
              <input
                type="text"
                name="id_document"
                className="form-control"
                placeholder="ID or Passport #"
                value={formData.id_document}
                onChange={handleChange}
                required
                style={{
                  background: "rgba(255, 255, 255, 0.16)",
                  border: "1px solid rgba(255, 255, 255, 0.28)",
                  color: "#ffffff",
                  borderRadius: "10px",
                  padding: "10px 13px",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              />
            </div>
          </div>

          <button
            className="btn w-100 mt-2 fw-semibold"
            style={{
              background: "rgba(255, 255, 255, 0.82)",
              border: "1px solid rgba(255, 255, 255, 0.95)",
              color: "#1e293b",
              borderRadius: "10px",
              padding: "11px",
              boxShadow: "0 8px 20px rgba(0, 0, 0, 0.16)",
            }}
          >
            Create Account
          </button>

          <div className="text-center mt-4">
            <span
              className="small"
              style={{ color: "rgba(255, 255, 255, 0.8)" }}
            >
              Already have an account?{" "}
            </span>
            <Link
              href="/login"
              className="text-decoration-none fw-semibold"
              style={{ color: "#ffffff" }}
            >
              Log In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
