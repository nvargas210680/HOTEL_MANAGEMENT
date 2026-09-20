"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const storedUser = localStorage.getItem("user");

    if (token && storedUser) {
      const user = JSON.parse(storedUser);

      if (user.is_staff) {
        router.push("/dashboard");
      } else {
        router.push("/rooms");
      }
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://127.0.0.1:8000/api/token/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Login successful! Response data:", data);

        localStorage.setItem("accessToken", data.access);
        localStorage.setItem("refreshToken", data.refresh);

        localStorage.setItem(
          "user",
          JSON.stringify({
            username: data.username,
            is_staff: data.is_staff,
            first_name: data.first_name,
          }),
        );

        if (data.is_staff) {
          router.push("/dashboard");
        } else {
          router.push("/rooms");
        }
      } else {
        setErrorMessage("Invalid username or password.");
      }
    } catch (error) {
      console.error("Network error connecting to Django:", error);
      alert("Could not connect to the backend server.");
    }
  };

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center px-3"
      style={{
        position: "relative",
        overflow: "hidden",
        backgroundImage: `url('/images/hotel_palms.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0, 0, 0, 0.32)",
        }}
      />

      <div
        className="w-100 p-4 p-md-5"
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "420px",
          background: "rgba(255, 255, 255, 0.12)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.32)",
          borderRadius: "20px",
          boxShadow:
            "0 8px 32px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.18)",
          color: "#ffffff",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "8%",
            right: "8%",
            height: "1px",
            background: "rgba(255, 255, 255, 0.45)",
          }}
        />

        <div className="text-center mb-4">
          <div
            className="d-flex align-items-center justify-content-center mx-auto mb-3"
            style={{
              width: "58px",
              height: "58px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.14)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              boxShadow: "inset 0 1px 8px rgba(255, 255, 255, 0.12)",
            }}
          >
            <i
              className="bi bi-buildings"
              style={{
                fontSize: "1.5rem",
                color: "#ffffff",
              }}
            />
          </div>

          <h2
            className="fw-bold mb-2"
            style={{
              color: "#ffffff",
              letterSpacing: "-0.3px",
            }}
          >
            Welcome Back
          </h2>

          <p
            className="mb-0"
            style={{
              color: "rgba(255, 255, 255, 0.78)",
              fontSize: "0.9rem",
            }}
          >
            Sign in to continue to Hotel Palms
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label
              className="form-label fw-semibold"
              style={{
                color: "#ffffff",
                fontSize: "0.9rem",
              }}
            >
              Username
            </label>

            <div className="position-relative">
              <i
                className="bi bi-person position-absolute"
                style={{
                  left: "15px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "rgba(255, 255, 255, 0.7)",
                  zIndex: 2,
                }}
              />

              <input
                type="text"
                className="form-control"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  height: "48px",
                  paddingLeft: "42px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  background: "rgba(255, 255, 255, 0.16)",
                  color: "#ffffff",
                  boxShadow: "inset 0 1px 6px rgba(0, 0, 0, 0.08)",
                }}
              />
            </div>
          </div>

          <div className="mb-3">
            <label
              className="form-label fw-semibold"
              style={{
                color: "#ffffff",
                fontSize: "0.9rem",
              }}
            >
              Password
            </label>

            <div className="position-relative">
              <i
                className="bi bi-lock position-absolute"
                style={{
                  left: "15px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "rgba(255, 255, 255, 0.7)",
                  zIndex: 2,
                }}
              />

              <input
                type="password"
                className="form-control"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  height: "48px",
                  paddingLeft: "42px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  background: "rgba(255, 255, 255, 0.16)",
                  color: "#ffffff",
                  boxShadow: "inset 0 1px 6px rgba(0, 0, 0, 0.08)",
                }}
              />
            </div>

            {errorMessage && (
              <div
                className="mt-3 px-3 py-2"
                role="alert"
                style={{
                  background: "rgba(220, 53, 69, 0.2)",
                  border: "1px solid rgba(255, 150, 150, 0.3)",
                  borderRadius: "9px",
                  color: "#ffffff",
                  fontSize: "0.85rem",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              >
                <i className="bi bi-exclamation-circle me-2" />
                {errorMessage}
              </div>
            )}

            <div className="text-end mt-2">
              <Link
                href="/auth/forgot-password"
                className="text-decoration-none"
                style={{
                  color: "rgba(255, 255, 255, 0.78)",
                  fontSize: "0.82rem",
                }}
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            className="btn w-100 fw-semibold mt-2"
            style={{
              height: "48px",
              borderRadius: "10px",
              background: "rgba(255, 255, 255, 0.9)",
              color: "#1e293b",
              border: "1px solid rgba(255, 255, 255, 0.7)",
              boxShadow: "0 4px 15px rgba(0, 0, 0, 0.15)",
            }}
          >
            Sign In
          </button>

          <div className="text-center mt-4">
            <span
              className="small"
              style={{
                color: "rgba(255, 255, 255, 0.72)",
              }}
            >
              Don't have an account?{" "}
            </span>

            <Link
              href="/register"
              className="text-decoration-none fw-semibold"
              style={{
                color: "#ffffff",
                fontSize: "0.88rem",
              }}
            >
              Create Account
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}