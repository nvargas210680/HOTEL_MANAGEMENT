"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/utils/api";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [profileData, setProfileData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    id_document: "",
  });

  useEffect(() => {
    let isMounted = true;

    const fetchUserProfile = async () => {
      try {
        const response = await apiFetch("/api/profile/");
        if (!response.ok) {
          throw new Error("Failed to load user profile information.");
        }
        const data = await response.json();

        if (isMounted) {
          setProfileData({
            first_name: data.first_name || "",
            last_name: data.last_name || "",
            email: data.email || "",
            phone_number: data.phone_number || "",
            id_document: data.id_document || "",
          });
        }
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchUserProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const response = await apiFetch("/api/profile/", {
        method: "PATCH",
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.detail || errData.error || "Failed to update profile."
        );
      }

      setSuccessMsg("Profile information updated successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4" style={{ maxWidth: "700px" }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-0">My Profile</h1>
          <p className="text-muted small mb-0">
            Manage your personal details and identity documents
          </p>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body p-4">
          {error && <div className="alert alert-danger mb-4">{error}</div>}
          {successMsg && (
            <div className="alert alert-success mb-4">{successMsg}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">First Name</label>
                <input
                  type="text"
                  className="form-control"
                  name="first_name"
                  value={profileData.first_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">Last Name</label>
                <input
                  type="text"
                  className="form-control"
                  name="last_name"
                  value={profileData.last_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-12">
                <label className="form-label fw-semibold">
                  Email Address
                </label>
                <input
                  type="email"
                  className="form-control bg-light"
                  name="email"
                  value={profileData.email}
                  disabled
                  readOnly
                />
                <small className="text-muted">
                  Email address is linked to your account credentials and cannot be changed.
                </small>
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">Phone Number</label>
                <input
                  type="tel"
                  className="form-control"
                  name="phone_number"
                  placeholder="+1 (555) 000-0000"
                  value={profileData.phone_number}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  ID / Passport Document Number
                </label>
                <input
                  type="text"
                  className="form-control"
                  name="id_document"
                  placeholder="e.g. A12345678"
                  value={profileData.id_document}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="mt-4 pt-3 border-top text-end">
              <button
                type="submit"
                className="btn btn-primary fw-semibold"
                disabled={submitting}
              >
                {submitting ? "Saving Changes..." : "Save Profile Details"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}