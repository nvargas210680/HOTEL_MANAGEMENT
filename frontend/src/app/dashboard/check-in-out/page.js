"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { apiFetch } from "@/utils/api";

export default function CheckInOutPage() {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  // Inside your component or right before rendering the modal:
  const baseAmount = Number(selectedInvoice?.total_price || 0);
  const gstRate = 0.05; // 5% Alberta GST
  const gstAmount = baseAmount * gstRate;
  const grandTotal = baseAmount + gstAmount;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [bookingsRes, roomsRes] = await Promise.all([
        apiFetch("/api/admin/bookings/"), // <-- Use the admin endpoint here
        apiFetch("/api/rooms/"),
      ]);

      if (!bookingsRes.ok || !roomsRes.ok) {
        throw new Error("Failed to fetch check-in/out data.");
      }

      const bookingsData = await bookingsRes.json();
      const roomsData = await roomsRes.json();

      setBookings(bookingsData);
      setRooms(roomsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Check-In
  const handleCheckIn = async (bookingId, roomId) => {
    setUpdatingId(bookingId);
    try {
      // 1. Update booking status to Checked In
      const bookingRes = await apiFetch(`/api/bookings/${bookingId}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: "Checked In" }),
      });
      if (!bookingRes.ok) throw new Error("Failed to check in booking.");

      // 2. Automatically update room status to Occupied
      if (roomId) {
        const roomRes = await apiFetch(`/api/rooms/${roomId}/`, {
          method: "PATCH",
          body: JSON.stringify({ status: "Occupied" }),
        });
        if (!roomRes.ok)
          throw new Error("Failed to update room status to Occupied.");
      }

      await fetchData();
    } catch (err) {
      alert(`Check-in error: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Handle Check-Out
  const handleCheckOut = async (bookingId, roomId) => {
    setUpdatingId(bookingId);
    try {
      // 1. Update booking status to Checked Out
      const bookingRes = await apiFetch(`/api/bookings/${bookingId}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: "Checked Out" }),
      });
      if (!bookingRes.ok) throw new Error("Failed to check out booking.");

      // 2. Automatically update room status to Cleaning
      if (roomId) {
        const roomRes = await apiFetch(`/api/rooms/${roomId}/`, {
          method: "PATCH",
          body: JSON.stringify({ status: "Cleaning" }),
        });
        if (!roomRes.ok)
          throw new Error("Failed to update room status to Cleaning.");
      }

      await fetchData();
    } catch (err) {
      alert(`Check-out error: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredBookings = useMemo(() => {
    // Get today's date in YYYY-MM-DD format to match Django date fields
    const todayStr = new Date().toISOString().split("T")[0];

    return bookings.filter((b) => {
      const guestName =
        `${b.guest_name || `${b.guest_first_name || ""} ${b.guest_last_name || ""}`}`.toLowerCase();
      const guestEmail = (b.guest_email || "").toLowerCase();
      const guestPhone = (b.guest_phone || "").toLowerCase();
      const roomNum = String(b.room_number || b.room || "").toLowerCase();

      const searchTermLower = searchTerm.toLowerCase();
      const matchesSearch =
        guestName.includes(searchTermLower) ||
        guestEmail.includes(searchTermLower) ||
        guestPhone.includes(searchTermLower) ||
        roomNum.includes(searchTermLower);

      // Handle Status / Date Filtering
      let matchesFilter = true;
      if (statusFilter === "Today Arrivals") {
        matchesFilter = b.check_in_date === todayStr;
      } else if (statusFilter === "Today Departures") {
        matchesFilter = b.check_out_date === todayStr;
      } else if (statusFilter !== "All") {
        matchesFilter = b.status === statusFilter;
      }

      return matchesSearch && matchesFilter;
    });
  }, [bookings, searchTerm, statusFilter]);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-0">Check-In & Check-Out Desk</h1>
          <p className="text-muted small mb-0">
            Manage guest arrivals, active stays, and departures
          </p>
        </div>
        <span className="badge bg-primary fs-6">
          {bookings.length} Total Bookings
        </span>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="row g-3 mb-4">
        <div className="col-md-8">
          <input
            type="text"
            className="form-control"
            placeholder="Search by Guest Name, Email, Phone, or Room..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="col-md-4">
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Bookings</option>
            <option value="Today Arrivals">📅 Today's Arrivals</option>
            <option value="Today Departures">📅 Today's Departures</option>
            <option value="Confirmed">Confirmed (Ready)</option>
            <option value="Checked In">Checked In (Active Stay)</option>
            <option value="Checked Out">Checked Out</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
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
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h5 className="mb-0 fw-bold">Reservation Records</h5>
            <small className="text-muted">
              Showing {filteredBookings.length} of {bookings.length}
            </small>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light text-uppercase fs-7 text-secondary">
                  <tr>
                    <th className="py-3 ps-3">Guest Details</th>
                    <th className="py-3">Room</th>
                    <th className="py-3">Schedule</th>
                    <th className="py-3">Status</th>
                    <th className="py-3 text-end pe-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">
                        No bookings match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((b) => {
                      const roomId = b.room_id || b.room;
                      const isProcessing = updatingId === b.booking_id;

                      return (
                        <tr key={b.booking_id}>
                          {/* Guest Details Column */}
                          <td className="ps-3 py-3">
                            <div className="fw-bold text-dark">
                              {b.guest_name ||
                                `${b.guest_first_name || ""} ${b.guest_last_name || "Guest"}`}
                            </div>
                            <div className="text-muted small d-flex flex-column gap-1 mt-1">
                              {b.guest_email && (
                                <span>
                                  <i className="bi bi-envelope me-1"></i>{" "}
                                  {b.guest_email}
                                </span>
                              )}
                              {b.guest_phone && (
                                <span>
                                  <i className="bi bi-telephone me-1"></i>{" "}
                                  {b.guest_phone}
                                </span>
                              )}
                              {b.id_document && (
                                <span className="text-secondary font-monospace bg-light px-1 rounded d-inline-block w-auto">
                                  ID: {b.id_document}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Room Column */}
                          <td>
                            <span className="fw-semibold">
                              Room {b.room_number || roomId}
                            </span>
                          </td>

                          {/* Schedule Column */}
                          <td>
                            <div className="small">
                              <div>
                                <span className="text-muted">In:</span>{" "}
                                {b.check_in_date}
                              </div>
                              <div>
                                <span className="text-muted">Out:</span>{" "}
                                {b.check_out_date}
                              </div>
                            </div>
                          </td>

                          {/* Status Column */}
                          <td>
                            <span
                              className={`badge px-2 py-1 ${
                                b.status === "Checked In"
                                  ? "bg-success"
                                  : b.status === "Confirmed"
                                    ? "bg-primary"
                                    : b.status === "Checked Out"
                                      ? "bg-secondary"
                                      : "bg-warning text-dark"
                              }`}
                            >
                              {b.status || "Pending"}
                            </span>
                          </td>

                          {/* Actions Column */}
                          <td className="text-end pe-3">
                            <div className="d-flex justify-content-end gap-2">
                              {b.status === "Confirmed" && (
                                <button
                                  className="btn btn-sm btn-success px-3"
                                  disabled={isProcessing}
                                  onClick={() =>
                                    handleCheckIn(b.booking_id, roomId)
                                  }
                                >
                                  {isProcessing ? "Processing..." : "Check In"}
                                </button>
                              )}
                              {b.status === "Checked In" && (
                                <button
                                  className="btn btn-sm btn-outline-warning px-3"
                                  disabled={isProcessing}
                                  onClick={() =>
                                    handleCheckOut(b.booking_id, roomId)
                                  }
                                >
                                  {isProcessing ? "Processing..." : "Check Out"}
                                </button>
                              )}
                              {b.status !== "Confirmed" &&
                                b.status !== "Checked In" && (
                                  <span className="text-muted small fst-italic">
                                    Completed
                                  </span>
                                )}
                              {b.status === "Checked Out" && (
                                <button
                                  className="btn btn-sm btn-outline-primary px-3"
                                  onClick={() => setSelectedInvoice(b)}
                                >
                                  <i className="bi bi-receipt me-1"></i> Invoice
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {selectedInvoice && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-file-earmark-text me-2"></i> Hotel Invoice
                  #{selectedInvoice.booking_id}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setSelectedInvoice(null)}
                ></button>
              </div>

              <div className="modal-body p-4" id="printable-invoice">
                {/* Invoice Header */}
                <div className="d-flex justify-content-between mb-4 border-bottom pb-3">
                  <div>
                    <h4 className="fw-bold text-primary mb-1">Hotel Admin</h4>
                    <p className="text-muted small mb-0">
                      123 Hospitality Lane, City Center
                    </p>
                    <p className="text-muted small mb-0">
                      support@hoteladmin.com
                    </p>
                  </div>
                  <div className="text-end">
                    <h5 className="fw-bold text-secondary">INVOICE</h5>
                    <p className="small text-muted mb-0">
                      Date: {new Date().toLocaleDateString()}
                    </p>
                    <p className="small text-muted mb-0">
                      Status:{" "}
                      <span className="badge bg-success">Paid / Completed</span>
                    </p>
                  </div>
                </div>

                {/* Guest & Stay Details */}
                <div className="row mb-4">
                  <div className="col-sm-6">
                    <h6 className="text-muted text-uppercase fs-7 fw-bold">
                      Billed To:
                    </h6>
                    <div className="fw-bold fs-5">
                      {selectedInvoice.guest_name}
                    </div>
                    <div className="text-muted small">
                      {selectedInvoice.guest_email}
                    </div>
                    <div className="text-muted small">
                      {selectedInvoice.guest_phone}
                    </div>
                  </div>
                  <div className="col-sm-6 text-sm-end mt-3 mt-sm-0">
                    <h6 className="text-muted text-uppercase fs-7 fw-bold">
                      Stay Details:
                    </h6>
                    <div className="fw-semibold">
                      Room: {selectedInvoice.room_number}
                    </div>
                    <div className="text-muted small">
                      Check-In: {selectedInvoice.check_in_date}
                    </div>
                    <div className="text-muted small">
                      Check-Out: {selectedInvoice.check_out_date}
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                {/* Line Items Table */}
          <table className="table table-bordered align-middle">
            <thead className="table-light">
              <tr>
                <th>Description</th>
                <th className="text-center">Rate Type</th>
                <th className="text-end">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Room Accommodation (Room {selectedInvoice.room_number})</td>
                <td className="text-center">Standard Stay</td>
                <td className="text-end">${baseAmount.toFixed(2)}</td>
              </tr>
            </tbody>
            <tbody className="border-top-0">
              <tr>
                <td colSpan="2" className="text-end text-muted">Subtotal:</td>
                <td className="text-end">${baseAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td colSpan="2" className="text-end text-muted">GST (5% - Alberta):</td>
                <td className="text-end">${gstAmount.toFixed(2)}</td>
              </tr>
            </tbody>
            <tfoot className="table-light">
              <tr>
                <td colSpan="2" className="text-end fw-bold">Total Due:</td>
                <td className="text-end fw-bold text-success fs-5">${grandTotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
              </div>

              {/* Modal Footer Actions */}
              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedInvoice(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={() => window.print()}
                >
                  <i className="bi bi-printer me-1"></i> Print Invoice
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() =>
                    alert(
                      `Invoice emailed successfully to ${selectedInvoice.guest_email}!`,
                    )
                  }
                >
                  <i className="bi bi-envelope me-1"></i> Send via Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
