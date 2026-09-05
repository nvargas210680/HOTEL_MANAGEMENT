"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { apiFetch } from "@/utils/api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [formError, setFormError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [selectedPicture, setSelectedPicture] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // --- WALK-IN BOOKING STATE ---
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState(null);
  const [existingGuests, setExistingGuests] = useState([]);
  const [existingBookings, setExistingBookings] = useState([]);
  const [isNewGuest, setIsNewGuest] = useState(true);
  const [selectedGuestId, setSelectedGuestId] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState(null);

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

  const [walkInGuestData, setWalkInGuestData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    id_document: "",
  });

  const todayStr = formatDateToYYYYMMDD(new Date());
  const tomorrowDate = new Date(Date.now() + 86400000);
  const tomorrowStr = formatDateToYYYYMMDD(tomorrowDate);

  const [bookingDates, setBookingDates] = useState({
    check_in_date: todayStr,
    check_out_date: tomorrowStr,
  });

  const [submitting, setSubmitting] = useState(false);
  const [newRoom, setNewRoom] = useState({
    room_number: "",
    bed_count: 1,
    bed_type: "King",
    price_type: "Standard",
    price_per_night: "",
    status: "Available",
  });

  const fetchRooms = useCallback(async () => {
    try {
      const response = await apiFetch("/api/rooms/");
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setRooms(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Fetch guests and room's existing bookings when walk-in modal opens
  useEffect(() => {
    let isMounted = true;

    if (selectedRoomForBooking) {
      const fetchGuests = async () => {
        try {
          const response = await apiFetch("/api/guests/");
          if (response.ok && isMounted) {
            const data = await response.json();
            setExistingGuests(data);
          }
        } catch (err) {
          console.error("Failed to load guests:", err);
        }
      };

      const fetchRoomBookings = async () => {
        try {
          const response = await apiFetch(
            `/api/bookings/?room=${selectedRoomForBooking.room_id}`
          );
          if (response.ok && isMounted) {
            const data = await response.json();
            setExistingBookings(data);
          }
        } catch (err) {
          console.error("Failed to load room bookings:", err);
        }
      };

      fetchGuests();
      fetchRoomBookings();
    } else {
      setExistingBookings([]);
    }

    return () => {
      isMounted = false;
    };
  }, [selectedRoomForBooking]);

  // Convert active bookings into Date intervals to disable in react-datepicker
  const excludedIntervals = useMemo(() => {
    return existingBookings
      .filter((b) => b.status !== "Cancelled" && b.status !== "Checked Out")
      .map((b) => {
        const start = parseStringToLocalDate(b.check_in_date);
        const end = parseStringToLocalDate(b.check_out_date);

        const dayBeforeCheckOut = new Date(end);
        dayBeforeCheckOut.setDate(dayBeforeCheckOut.getDate() - 1);

        return {
          start,
          end: dayBeforeCheckOut >= start ? dayBeforeCheckOut : start,
        };
      })
      .filter((i) => i.start && i.end);
  }, [existingBookings]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewRoom((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleStatusChange = async (roomId, newStatus) => {
    setUpdatingId(roomId);
    try {
      const response = await apiFetch(`/api/rooms/${roomId}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update room status");
      }

      setRooms((prev) =>
        prev.map((r) =>
          r.room_id === roomId ? { ...r, status: newStatus } : r
        )
      );
    } catch (err) {
      alert(`Could not update status: ${err.message}`);
      fetchRooms();
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAddRoomSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const formData = new FormData();
      formData.append("room_number", newRoom.room_number);
      formData.append("bed_count", parseInt(newRoom.bed_count, 10));
      formData.append("bed_type", newRoom.bed_type);
      formData.append("price_type", newRoom.price_type);
      formData.append("price_per_night", parseFloat(newRoom.price_per_night));
      formData.append("status", newRoom.status);

      if (selectedPicture) {
        formData.append("picture", selectedPicture);
      }

      const response = await apiFetch("/api/rooms/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.room_number) {
          throw new Error(`Room Number ${newRoom.room_number} already exists.`);
        } else if (errorData.detail) {
          throw new Error(errorData.detail);
        } else {
          throw new Error("Failed to create room. Please check your inputs.");
        }
      }

      const createdRoom = await response.json();

      setRooms((prev) => [createdRoom, ...prev]);
      setShowModal(false);
      setSelectedPicture(null);
      setNewRoom({
        room_number: "",
        bed_count: 1,
        bed_type: "King",
        price_type: "Standard",
        price_per_night: "",
        status: "Available",
      });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const matchesSearch =
        String(r.room_number)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        r.bed_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.price_type?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "All" || r.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [rooms, searchTerm, statusFilter]);

  const handleWalkInSubmit = async (e) => {
    e.preventDefault();
    setBookingSubmitting(true);
    setBookingError(null);

    try {
      let targetGuestId = selectedGuestId;

      if (isNewGuest) {
        const registerPayload = {
          username: walkInGuestData.email,
          email: walkInGuestData.email,
          password: `WalkIn_${Math.random().toString(36).slice(-8)}!`,
          first_name: walkInGuestData.first_name,
          last_name: walkInGuestData.last_name,
          phone_number: walkInGuestData.phone_number,
          id_document: walkInGuestData.id_document,
        };

        const regResponse = await apiFetch("/api/register/", {
          method: "POST",
          body: JSON.stringify(registerPayload),
        });

        if (!regResponse.ok) {
          const errData = await regResponse.json().catch(() => ({}));
          throw new Error(
            errData.detail ||
              JSON.stringify(errData) ||
              "Failed to register new walk-in guest account."
          );
        }

        const guestsResponse = await apiFetch("/api/guests/");
        if (guestsResponse.ok) {
          const guestsList = await guestsResponse.json();
          const createdGuest = guestsList.find(
            (g) => g.email === walkInGuestData.email
          );
          if (createdGuest) {
            targetGuestId = createdGuest.guest_id;
          }
        }
      }

      if (!targetGuestId) {
        throw new Error("Could not determine valid guest ID for this booking.");
      }

      const bookingPayload = {
        room: selectedRoomForBooking.room_id,
        guest_id: targetGuestId,
        check_in_date: bookingDates.check_in_date,
        check_out_date: bookingDates.check_out_date,
      };

      const bookingResponse = await apiFetch("/api/bookings/", {
        method: "POST",
        body: JSON.stringify(bookingPayload),
      });

      if (!bookingResponse.ok) {
        const errData = await bookingResponse.json().catch(() => ({}));
        throw new Error(
          errData.error || errData.detail || "Failed to create booking."
        );
      }

      setSelectedRoomForBooking(null);
      setSelectedGuestId("");
      setWalkInGuestData({
        first_name: "",
        last_name: "",
        email: "",
        phone_number: "",
        id_document: "",
      });
      fetchRooms();
    } catch (err) {
      setBookingError(err.message);
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleCheckInChange = (date) => {
    if (!date) return;
    const newInStr =
      typeof date === "string" ? date : formatDateToYYYYMMDD(date);
    const parsedInDate = parseStringToLocalDate(newInStr);
    const nextDay = new Date(parsedInDate.getTime() + 86400000);
    const nextDayStr = formatDateToYYYYMMDD(nextDay);

    if (newInStr >= bookingDates.check_out_date) {
      setBookingDates({
        check_in_date: newInStr,
        check_out_date: nextDayStr,
      });
    } else {
      setBookingDates((prev) => ({
        ...prev,
        check_in_date: newInStr,
      }));
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-0">Rooms Inventory</h1>
          <p className="text-muted small mb-0">
            Monitor inventory status and pricing details
          </p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <span className="badge bg-primary fs-6">
            {rooms.length} Total Rooms
          </span>
          <button
            className="btn btn-primary btn-sm fw-semibold ms-2"
            onClick={() => setShowModal(true)}
          >
            + Add New Room
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="row g-3 mb-4">
        <div className="col-md-8">
          <input
            type="text"
            className="form-control"
            placeholder="Search by Room Number, Bed Type, or Rate..."
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
            <option value="All">Filter by Status (All)</option>
            <option value="Available">Available</option>
            <option value="Occupied">Occupied</option>
            <option value="Maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading rooms inventory...</span>
          </div>
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && (
        <div className="card shadow-sm">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h5 className="mb-0 fw-bold">Room Records</h5>
            <small className="text-muted">
              Showing {filteredRooms.length} of {rooms.length}
            </small>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover table-striped align-middle mb-0">
                <thead className="table-dark">
                  <tr>
                    <th>Room #</th>
                    <th>Bed Configuration</th>
                    <th>Rate Type</th>
                    <th>Price / Night</th>
                    <th>Current Status</th>
                    <th className="text-end pe-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRooms.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-4 text-muted">
                        No rooms match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRooms.map((r) => (
                      <tr key={r.room_id}>
                        <td className="fw-bold">Room {r.room_number}</td>
                        <td>
                          {r.bed_count} x {r.bed_type}
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border">
                            {r.price_type || "Standard"}
                          </span>
                        </td>
                        <td className="fw-semibold">${r.price_per_night}</td>
                        <td>
                          <span
                            className={`badge ${
                              r.status === "Available"
                                ? "bg-success"
                                : r.status === "Occupied"
                                ? "bg-danger"
                                : "bg-warning text-dark"
                            }`}
                          >
                            {r.status || "Available"}
                          </span>
                        </td>
                        <td className="text-end pe-3">
                          {r?.status?.toLowerCase() === "available" && (
                            <button
                              className="btn btn-sm btn-outline-success me-2"
                              onClick={() => setSelectedRoomForBooking(r)}
                            >
                              + Book Walk-In
                            </button>
                          )}
                          <select
                            className="form-select form-select-sm d-inline-block w-auto"
                            value={r.status || "Available"}
                            disabled={updatingId === r.room_id}
                            onChange={(e) =>
                              handleStatusChange(r.room_id, e.target.value)
                            }
                          >
                            <option value="Available">Available</option>
                            <option value="Occupied">Occupied</option>
                            <option value="Maintenance">Maintenance</option>
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

      {/* ADD ROOM MODAL */}
      {showModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Add New Room</h5>
                <button
                  type="button"
                  className="btn-close"
                  disabled={submitting}
                  onClick={() => setShowModal(false)}
                ></button>
              </div>

              <form onSubmit={handleAddRoomSubmit}>
                <div className="modal-body">
                  {formError && (
                    <div className="alert alert-danger">{formError}</div>
                  )}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Room Number
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      name="room_number"
                      placeholder="e.g. 101, 202"
                      value={newRoom.room_number}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Bed Count
                      </label>
                      <input
                        type="number"
                        min="1"
                        className="form-control"
                        name="bed_count"
                        value={newRoom.bed_count}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Bed Type
                      </label>
                      <select
                        className="form-select"
                        name="bed_type"
                        value={newRoom.bed_type}
                        onChange={handleInputChange}
                      >
                        <option value="Single">Single</option>
                        <option value="Double">Double</option>
                        <option value="Queen">Queen</option>
                        <option value="King">King</option>
                        <option value="Suite">Suite</option>
                      </select>
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Rate Type
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        name="price_type"
                        placeholder="e.g. Standard, Deluxe, VIP"
                        value={newRoom.price_type}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Price / Night ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        name="price_per_night"
                        placeholder="120.00"
                        value={newRoom.price_per_night}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Initial Status
                    </label>
                    <select
                      className="form-select"
                      name="status"
                      value={newRoom.status}
                      onChange={handleInputChange}
                    >
                      <option value="Available">Available</option>
                      <option value="Occupied">Occupied</option>
                      <option value="Maintenance">Maintenance</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Room Picture
                    </label>
                    <input
                      type="file"
                      className="form-control"
                      accept="image/*"
                      onChange={(e) => setSelectedPicture(e.target.files[0])}
                    />
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={submitting}
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? "Creating..." : "Save Room"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* WALK-IN BOOKING MODAL */}
      {selectedRoomForBooking && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content shadow">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">
                  Walk-In Booking — Room {selectedRoomForBooking.room_number}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setSelectedRoomForBooking(null)}
                ></button>
              </div>

              <form onSubmit={handleWalkInSubmit}>
                <div className="modal-body p-4">
                  {bookingError && (
                    <div className="alert alert-danger">{bookingError}</div>
                  )}

                  {/* 1. Stay Dates */}
                  <h6 className="fw-bold mb-3 text-secondary">1. Stay Dates</h6>
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Check-In Date
                      </label>
                      <DatePicker
                        selected={parseStringToLocalDate(
                          bookingDates.check_in_date
                        )}
                        onChange={(date) => handleCheckInChange(date)}
                        selectsStart
                        startDate={parseStringToLocalDate(
                          bookingDates.check_in_date
                        )}
                        endDate={parseStringToLocalDate(
                          bookingDates.check_out_date
                        )}
                        excludeDateIntervals={excludedIntervals}
                        minDate={new Date()}
                        placeholderText="Select check-in date"
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
                          bookingDates.check_out_date
                        )}
                        onChange={(date) =>
                          setBookingDates((prev) => ({
                            ...prev,
                            check_out_date: formatDateToYYYYMMDD(date),
                          }))
                        }
                        selectsEnd
                        startDate={parseStringToLocalDate(
                          bookingDates.check_in_date
                        )}
                        endDate={parseStringToLocalDate(
                          bookingDates.check_out_date
                        )}
                        excludeDateIntervals={excludedIntervals}
                        minDate={
                          parseStringToLocalDate(bookingDates.check_in_date) ||
                          new Date()
                        }
                        placeholderText="Select check-out date"
                        className="form-control"
                        dateFormat="yyyy-MM-dd"
                        required
                      />
                    </div>
                  </div>

                  <hr />

                  {/* 2. Guest Information */}
                  <h6 className="fw-bold mb-3 text-secondary">
                    2. Guest Information
                  </h6>
                  <div className="mb-3">
                    <div className="form-check form-check-inline me-4">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="guestType"
                        id="newGuest"
                        checked={isNewGuest}
                        onChange={() => setIsNewGuest(true)}
                      />
                      <label
                        className="form-check-label fw-semibold"
                        htmlFor="newGuest"
                      >
                        New Guest Registration
                      </label>
                    </div>
                    <div className="form-check form-check-inline">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="guestType"
                        id="existingGuest"
                        checked={!isNewGuest}
                        onChange={() => setIsNewGuest(false)}
                      />
                      <label
                        className="form-check-label fw-semibold"
                        htmlFor="existingGuest"
                      >
                        Select Existing Guest
                      </label>
                    </div>
                  </div>

                  {/* 3. Guest Details Input */}
                  {isNewGuest ? (
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">First Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={walkInGuestData.first_name}
                          onChange={(e) =>
                            setWalkInGuestData((prev) => ({
                              ...prev,
                              first_name: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Last Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={walkInGuestData.last_name}
                          onChange={(e) =>
                            setWalkInGuestData((prev) => ({
                              ...prev,
                              last_name: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Email</label>
                        <input
                          type="email"
                          className="form-control"
                          value={walkInGuestData.email}
                          onChange={(e) =>
                            setWalkInGuestData((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Phone Number</label>
                        <input
                          type="tel"
                          className="form-control"
                          value={walkInGuestData.phone_number}
                          onChange={(e) =>
                            setWalkInGuestData((prev) => ({
                              ...prev,
                              phone_number: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label">
                          ID / Passport Document Number
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={walkInGuestData.id_document}
                          onChange={(e) =>
                            setWalkInGuestData((prev) => ({
                              ...prev,
                              id_document: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mb-3">
                      <label className="form-label">Select Guest</label>
                      <select
                        className="form-select"
                        value={selectedGuestId}
                        onChange={(e) => setSelectedGuestId(e.target.value)}
                        required={!isNewGuest}
                      >
                        <option value="">-- Choose Existing Guest --</option>
                        {existingGuests.map((guest) => (
                          <option key={guest.guest_id} value={guest.guest_id}>
                            {guest.first_name} {guest.last_name} ({guest.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={bookingSubmitting}
                    onClick={() => setSelectedRoomForBooking(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={bookingSubmitting}
                  >
                    {bookingSubmitting ? "Processing..." : "Confirm Walk-In Booking"}
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