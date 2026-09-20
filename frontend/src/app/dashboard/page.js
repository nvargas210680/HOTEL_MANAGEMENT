"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { apiFetch } from "@/utils/api";

export default function OverviewPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Check-In Date filter state
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedFromDate, setAppliedFromDate] = useState("");
  const [appliedToDate, setAppliedToDate] = useState("");

  const fromDateRef = useRef(null);
  const toDateRef = useRef(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async (from = "", to = "") => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      if (from) {
        params.append("from_date", from);
      }

      if (to) {
        params.append("to_date", to);
      }

      const query = params.toString();

      const response = await apiFetch(
        `/api/admin/bookings/${query ? `?${query}` : ""}`
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setBookings(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openDatePicker = (ref) => {
    if (ref.current) {
      if (typeof ref.current.showPicker === "function") {
        ref.current.showPicker();
      } else {
        ref.current.focus();
      }
    }
  };

  const handleDateFilter = () => {
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
    fetchBookings(fromDate, toDate);
  };

  const handleClearDateFilter = () => {
    setFromDate("");
    setToDate("");
    setAppliedFromDate("");
    setAppliedToDate("");
    fetchBookings("", "");
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    setUpdatingId(bookingId);

    try {
      const response = await apiFetch(`/api/admin/bookings/${bookingId}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      setBookings((prev) =>
        prev.map((b) =>
          b.booking_id === bookingId ? { ...b, status: newStatus } : b,
        ),
      );
    } catch (err) {
      alert(`Could not update booking: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Search & status filters are applied to the bookings
  // already returned by the backend date filter.
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchesSearch =
        b.guest_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.guest_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(b.booking_id).includes(searchTerm);

      const matchesStatus =
        statusFilter === "All" || b.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchTerm, statusFilter]);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-0" style={{ color: "#1e293b" }}>
            Dashboard Overview
          </h1>
          <p className="text-muted small mb-0">
            Manage guest reservations and active status
          </p>
        </div>

        <span
          className="d-inline-flex align-items-center justify-content-center px-3 py-2 fw-semibold"
          style={{
            height: "40px",
            minWidth: "130px",
            borderRadius: "8px",
            backgroundColor: "#f1f5f9",
            color: "#334155",
            fontSize: "0.9rem",
            border: "1px solid #e2e8f0",
          }}
        >
          {bookings.length} Total Bookings
        </span>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="row g-3 mb-4">
        <div className="col-md-5">
          <input
            type="text"
            className="form-control"
            placeholder="Search by Guest Name, Email, or Booking ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="col-md-3">
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">Filter by Status (All)</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div className="col-md-4">
          <div className="d-flex gap-2">
            <div className="input-group">
              <input
                ref={fromDateRef}
                type="date"
                className="form-control"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                aria-label="From check-in date"
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => openDatePicker(fromDateRef)}
                title="Select from date"
              >
                <i className="bi bi-calendar3"></i>
              </button>
            </div>

            <div className="input-group">
              <input
                ref={toDateRef}
                type="date"
                className="form-control"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                aria-label="To check-in date"
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => openDatePicker(toDateRef)}
                title="Select to date"
              >
                <i className="bi bi-calendar3"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex justify-content-end gap-2 mb-4">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleDateFilter}
        >
          Apply Date Filter
        </button>

        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={handleClearDateFilter}
        >
          Clear
        </button>
      </div>

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading bookings...</span>
          </div>
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && (
        <div className="card shadow-sm">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h5 className="mb-0 fw-bold">Recent Bookings</h5>

            <small className="text-muted">
              Showing {filteredBookings.length} of {bookings.length}
            </small>
          </div>

          <div className="card-body p-0">
            <div className="table-responsive">
              <table
                className="table table-hover align-middle mb-0"
                style={{ fontSize: "0.88rem" }}
              >
                <thead className="table-light text-uppercase fs-7 text-secondary">
                  <tr>
                    <th>ID</th>
                    <th>Guest Name</th>
                    <th>Email</th>
                    <th>Room</th>
                    <th>Check-In</th>
                    <th>Check-Out</th>
                    <th>Status</th>
                    <th>Total Price</th>
                    <th className="text-end pe-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-4 text-muted">
                        No bookings match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((b) => (
                      <tr key={b.booking_id}>
                        <td className="fw-bold">#{b.booking_id}</td>

                        <td>{b.guest_name}</td>

                        <td>{b.guest_email || "N/A"}</td>

                        <td>
                          <span className="badge bg-secondary">
                            Room {b.room_number || "N/A"}
                          </span>
                        </td>

                        <td>{b.check_in_date}</td>

                        <td>{b.check_out_date}</td>

                        <td>
                          <span
                            className={`badge ${
                              b.status === "Confirmed"
                                ? "bg-success"
                                : b.status === "Cancelled"
                                  ? "bg-danger"
                                  : "bg-warning text-dark"
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>

                        <td className="fw-semibold">${b.total_price}</td>

                        <td className="text-end pe-3">
                          <select
                            className="form-select form-select-sm d-inline-block w-auto"
                            value={b.status}
                            disabled={updatingId === b.booking_id}
                            onChange={(e) =>
                              handleStatusChange(
                                b.booking_id,
                                e.target.value,
                              )
                            }
                          >
                            <option value="Pending">Pending</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}