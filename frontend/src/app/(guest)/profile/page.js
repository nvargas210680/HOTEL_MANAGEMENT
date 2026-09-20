"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/utils/api";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [profileData, setProfileData] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    id_document: "",
  });

  const [originalData, setOriginalData] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchUserProfile = async () => {
      try {
        const response = await apiFetch("/api/profile/");

        if (!response.ok) {
          throw new Error("Failed to load user profile information.");
        }

        const data = await response.json();

        const userData = {
          username: data.username || "",
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || "",
          phone_number: data.phone_number || "",
          id_document: data.id_document || "",
        };

        if (isMounted) {
          setProfileData(userData);
          setOriginalData(userData);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
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

  const handleEdit = () => {
    setError(null);
    setSuccessMsg(null);
    setEditing(true);
  };

  const handleCancel = () => {
    setProfileData(originalData);
    setEditing(false);
    setError(null);
    setSuccessMsg(null);
  };

  const saveProfile = async () => {
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
          errData.detail ||
            errData.error ||
            "Failed to update profile.",
        );
      }

      const updatedData = await response.json().catch(() => profileData);

      const savedData = {
        username: updatedData.username ?? profileData.username,
        first_name: updatedData.first_name ?? profileData.first_name,
        last_name: updatedData.last_name ?? profileData.last_name,
        email: updatedData.email ?? profileData.email,
        phone_number:
          updatedData.phone_number ?? profileData.phone_number,
        id_document:
          updatedData.id_document ?? profileData.id_document,
      };

      setProfileData(savedData);
      setOriginalData(savedData);
      setEditing(false);
      setShowUsernameModal(false);
      setSuccessMsg("Profile information updated successfully!");
    } catch (err) {
      setError(err.message);
      setShowUsernameModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      originalData &&
      profileData.username !== originalData.username
    ) {
      setShowUsernameModal(true);
      return;
    }

    await saveProfile();
  };

  if (loading) {
    return (
      <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading profile...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-vh-100 bg-light py-5">
        <div className="container" style={{ maxWidth: "700px" }}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h3 mb-0" style={{ color: "#1e293b" }}>
                My Profile
              </h1>
              <p className="text-muted small mb-0">
                View and manage your personal information
              </p>
            </div>

            {!editing && (
              <button
                type="button"
                className="btn btn-primary fw-semibold px-4"
                onClick={handleEdit}
              >
                <i className="bi bi-pencil me-2"></i>
                Edit Profile
              </button>
            )}
          </div>

          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              {error && (
                <div className="alert alert-danger mb-4">
                  {error}
                </div>
              )}

              {successMsg && (
                <div className="alert alert-success mb-4">
                  {successMsg}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      First Name
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      name="first_name"
                      value={profileData.first_name}
                      onChange={handleChange}
                      disabled={!editing}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      Last Name
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      name="last_name"
                      value={profileData.last_name}
                      onChange={handleChange}
                      disabled={!editing}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      Username
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      name="username"
                      value={profileData.username}
                      onChange={handleChange}
                      disabled={!editing}
                      required
                    />
                  </div>

                  <div className="col-md-6">
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
                  </div>

                  <div className="col-12">
                    <small className="text-muted">
                      Email address is linked to your account credentials
                      and cannot be changed.
                    </small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      className="form-control"
                      name="phone_number"
                      placeholder="+1 (555) 000-0000"
                      value={profileData.phone_number}
                      onChange={handleChange}
                      disabled={!editing}
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
                      disabled={!editing}
                      required
                    />
                  </div>
                </div>

                {editing && (
                  <div className="mt-4 pt-3 border-top d-flex justify-content-end gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary fw-semibold px-4"
                      onClick={handleCancel}
                      disabled={submitting}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="btn btn-primary fw-semibold px-4"
                      disabled={submitting}
                    >
                      <i className="bi bi-check-lg me-2"></i>
                      Save Changes
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>

      {showUsernameModal && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.55)",
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  Change Username?
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowUsernameModal(false)}
                  disabled={submitting}
                ></button>
              </div>

              <div className="modal-body">
                <p className="mb-2">
                  You are changing your username from:
                </p>

                <div className="bg-light rounded p-3 mb-3 text-center">
                  <span className="text-muted">
                    {originalData?.username}
                  </span>
                  <i className="bi bi-arrow-right mx-3"></i>
                  <strong>{profileData.username}</strong>
                </div>

                <p className="text-muted small mb-0">
                  Please make sure the new username is correct before
                  saving your changes.
                </p>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary fw-semibold"
                  onClick={() => setShowUsernameModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="btn btn-primary fw-semibold"
                  onClick={saveProfile}
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Confirm Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}