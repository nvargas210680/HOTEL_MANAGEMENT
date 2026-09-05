"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function MyBookingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- MODIFICATION & CANCELLATION STATE ---
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [roomBookings, setRoomBookings] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [modifyError, setModifyError] = useState(null);
  const [modifyDates, setModifyDates] = useState({
    check_in_date: "",
    check_out_date: "",
  });

  const parseStringToLocalDate = (dateStr) => {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const formatDateToYYYYMMDD = (date) => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const calculateNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const storedUser = localStorage.getItem("user");

    if (!token) {
      router.push("/login");
      return;
    }

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    fetchBookings(token);
  }, [router]);

  const fetchBookings = async (token) => {
    const authToken = token || localStorage.getItem("accessToken");
    try {
      const response = await fetch("http://127.0.0.1:8000/api/bookings/", {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBookings(data);
      } else {
        setBookings([]);
      }
    } catch (error) {
      console.error("Network error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    router.push("/login");
  };

  // Open Modal & Fetch Schedule for the Same Room to Prevent Date Overlaps
  const handleOpenModifyModal = async (booking) => {
    setSelectedBooking(booking);
    setModifyDates({
      check_in_date: booking.check_in_date || booking.check_in,
      check_out_date: booking.check_out_date || booking.check_out,
    });
    setModifyError(null);

    const token = localStorage.getItem("accessToken");
    const roomId = booking.room_details?.room_id || booking.room;

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/bookings/?room=${roomId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (response.ok) {
        const data = await response.json();
        // Exclude the current reservation from disabled intervals
        const currentBookingId = booking.id || booking.booking_id;
        setRoomBookings(
          data.filter((b) => (b.id || b.booking_id) !== currentBookingId),
        );
      }
    } catch (err) {
      console.error("Failed to load room schedule:", err);
    }
  };

  // Convert other room bookings into disabled intervals for DatePicker
  const excludedIntervals = useMemo(() => {
    return roomBookings
      .filter((b) => b.status !== "Cancelled" && b.status !== "Checked Out")
      .map((b) => {
        const start = parseStringToLocalDate(b.check_in_date || b.check_in);
        const end = parseStringToLocalDate(b.check_out_date || b.check_out);
        const dayBeforeCheckOut = new Date(end);
        dayBeforeCheckOut.setDate(dayBeforeCheckOut.getDate() - 1);

        return {
          start,
          end: dayBeforeCheckOut >= start ? dayBeforeCheckOut : start,
        };
      })
      .filter((i) => i.start && i.end);
  }, [roomBookings]);

  // Handle Cancel Booking
  const handleCancelBooking = async (bookingId) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;

    const token = localStorage.getItem("accessToken");
    setActionLoading(true);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/bookings/${bookingId}/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "Cancelled" }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to cancel booking.");
      }

      setBookings((prev) =>
        prev.map((b) => {
          const currentId = b.id || b.booking_id;
          return currentId === bookingId ? { ...b, status: "Cancelled" } : b;
        }),
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Date Modification
  const handleModifySubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setModifyError(null);

    const token = localStorage.getItem("accessToken");
    const bookingId = selectedBooking.id || selectedBooking.booking_id;

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/bookings/${bookingId}/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            check_in_date: modifyDates.check_in_date,
            check_out_date: modifyDates.check_out_date,
          }),
        },
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));

        // Extract custom backend detail, or use a descriptive user-friendly fallback
        const errorMessage =
          errData.detail ||
          errData.error ||
          errData.non_field_errors?.[0] ||
          "This room is unavailable for the selected dates. Please choose a different range.";

        throw new Error(errorMessage);
      }

      const updatedBooking = await response.json();

      setBookings((prev) =>
        prev.map((b) => {
          const currentId = b.id || b.booking_id;
          return currentId === bookingId ? updatedBooking : b;
        }),
      );
      setSelectedBooking(null);
    } catch (err) {
      setModifyError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="container py-5">
      {/* Header Bar */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="fw-bold mb-1">My Bookings</h1>
          <p className="text-muted mb-0">
            Welcome back{user?.first_name ? `, ${user.first_name}` : ""}! Here
            are your hotel reservations.
          </p>
        </div>
        <button className="btn btn-outline-danger" onClick={handleLogout}>
          Sign Out
        </button>
      </div>

      <hr className="mb-4" />

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : bookings.length === 0 ? (
        <div className="card text-center p-5 shadow-sm">
          <h4 className="fw-semibold">No Bookings Found</h4>
          <p className="text-muted">
            You haven't made any reservations with us yet.
          </p>
          <div>
            <Link href="/dashboard/rooms" className="btn btn-primary mt-2">
              Browse Rooms
            </Link>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          {bookings.map((booking) => {
            const bookingId = booking.id || booking.booking_id;
            const checkIn = booking.check_in_date || booking.check_in;
            const checkOut = booking.check_out_date || booking.check_out;
            const status = booking.status || "Confirmed";
            const isEditable =
              status !== "Cancelled" &&
              status !== "Checked Out" &&
              status !== "Completed";

            return (
              <div key={bookingId} className="col-md-6 col-lg-4">
                <div className="card h-100 shadow-sm border-0 d-flex flex-column">
                  <div className="card-body d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span
                        className={`badge ${
                          status === "Cancelled"
                            ? "bg-danger"
                            : status === "Confirmed"
                              ? "bg-success"
                              : "bg-secondary"
                        }`}
                      >
                        {status}
                      </span>
                      <small className="text-muted">ID: #{bookingId}</small>
                    </div>

                    <h5 className="card-title fw-bold text-capitalize">
                      {booking.room_details?.bed_type || "Standard Room"}
                    </h5>

                    {/* Dates Display */}
                    <div className="small text-muted mb-2">
                      <div>
                        <strong>Check-In:</strong> {checkIn}
                      </div>
                      <div>
                        <strong>Check-Out:</strong> {checkOut}
                      </div>
                    </div>

                    <div className="mb-2">
                      <span className="badge bg-light text-dark border">
                        🌙 {calculateNights(checkIn, checkOut)} Night(s)
                      </span>
                    </div>

                    <div className="border-top pt-2 mt-2">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-muted small">Nightly Rate:</span>
                        <span className="fw-semibold">
                          ${booking.room_details?.price_per_night || 0} / night
                        </span>
                      </div>

                      {booking.total_price && (
                        <div className="d-flex justify-content-between align-items-center mt-1">
                          <span className="text-muted small">
                            Est. Room Total:
                          </span>
                          <span className="fw-bold text-dark">
                            ${booking.total_price}*
                          </span>
                        </div>
                      )}

                      <p
                        className="text-muted text-end mb-0"
                        style={{ fontSize: "0.75rem" }}
                      >
                        *Excludes taxes, fees & incidentals
                      </p>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="mt-auto pt-3 border-top d-flex gap-2">
                      {isEditable ? (
                        <>
                          <button
                            className="btn btn-outline-primary btn-sm w-100"
                            onClick={() => handleOpenModifyModal(booking)}
                            disabled={actionLoading}
                          >
                            Modify Dates
                          </button>
                          <button
                            className="btn btn-outline-danger btn-sm w-100"
                            onClick={() => handleCancelBooking(bookingId)}
                            disabled={actionLoading}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <span className="text-muted small italic w-100 text-center">
                          {status === "Cancelled"
                            ? "Booking Cancelled"
                            : "No actions available"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODIFY DATES MODAL */}
      {selectedBooking && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  Modify Reservation Dates
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedBooking(null)}
                  disabled={actionLoading}
                ></button>
              </div>

              <form onSubmit={handleModifySubmit}>
                <div className="modal-body">
                  {modifyError && (
                    <div className="alert alert-danger">{modifyError}</div>
                  )}

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Check-In Date
                      </label>
                      <DatePicker
                        selected={parseStringToLocalDate(
                          modifyDates.check_in_date,
                        )}
                        onChange={(date) => {
                          const formatted = formatDateToYYYYMMDD(date);
                          setModifyDates((prev) => ({
                            ...prev,
                            check_in_date: formatted,
                          }));
                        }}
                        selectsStart
                        startDate={parseStringToLocalDate(
                          modifyDates.check_in_date,
                        )}
                        endDate={parseStringToLocalDate(
                          modifyDates.check_out_date,
                        )}
                        excludeDateIntervals={excludedIntervals}
                        minDate={new Date()}
                        className="form-control"
                        dateFormat="yyyy-MM-dd"
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Check-Out Date
                      </label>
                      <DatePicker
                        selected={parseStringToLocalDate(
                          modifyDates.check_out_date,
                        )}
                        onChange={(date) => {
                          const formatted = formatDateToYYYYMMDD(date);
                          setModifyDates((prev) => ({
                            ...prev,
                            check_out_date: formatted,
                          }));
                        }}
                        selectsEnd
                        startDate={parseStringToLocalDate(
                          modifyDates.check_in_date,
                        )}
                        endDate={parseStringToLocalDate(
                          modifyDates.check_out_date,
                        )}
                        excludeDateIntervals={excludedIntervals}
                        minDate={
                          parseStringToLocalDate(modifyDates.check_in_date) ||
                          new Date()
                        }
                        className="form-control"
                        dateFormat="yyyy-MM-dd"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={actionLoading}
                    onClick={() => setSelectedBooking(null)}
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary fw-bold"
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Saving..." : "Update Reservation"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
