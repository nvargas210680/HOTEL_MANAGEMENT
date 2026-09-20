"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { apiFetch } from "@/utils/api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [selectedPicture, setSelectedPicture] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState(null);
  const [existingGuests, setExistingGuests] = useState([]);
  const [isNewGuest, setIsNewGuest] = useState(true);
  const [selectedGuestId, setSelectedGuestId] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  const [bookingAvailability, setBookingAvailability] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

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

  const todayStr = formatDateToYYYYMMDD(new Date());

  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);

  const tomorrowStr = formatDateToYYYYMMDD(tomorrowDate);

  const [bookingDates, setBookingDates] = useState({
    check_in_date: todayStr,
    check_out_date: tomorrowStr,
  });

  const [walkInGuestData, setWalkInGuestData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    id_document: "",
  });

  const [newRoom, setNewRoom] = useState({
    name: "",
    bed_count: 1,
    bed_type: "King",
    price_per_night: "",
    inventory: 1,
    status: "Available",
  });

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);

      const response = await apiFetch("/api/room-types/");

      if (!response.ok) {
        throw new Error(
          `Error ${response.status}: ${response.statusText}`,
        );
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

  useEffect(() => {
    let isMounted = true;

    if (!selectedRoomForBooking) {
      setExistingGuests([]);
      return;
    }

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

    fetchGuests();

    return () => {
      isMounted = false;
    };
  }, [selectedRoomForBooking]);

  const checkAvailability = useCallback(async () => {
    if (
      !selectedRoomForBooking ||
      !bookingDates.check_in_date ||
      !bookingDates.check_out_date
    ) {
      return;
    }

    if (
      bookingDates.check_out_date <=
      bookingDates.check_in_date
    ) {
      setBookingAvailability(0);
      return;
    }

    setCheckingAvailability(true);

    try {
      const response = await apiFetch(
        `/api/room-types/?check_in=${bookingDates.check_in_date}&check_out=${bookingDates.check_out_date}`,
      );

      if (!response.ok) {
        throw new Error("Failed to check room availability.");
      }

      const data = await response.json();

      const selectedType = data.find(
        (room) =>
          room.room_type_id ===
          selectedRoomForBooking.room_type_id,
      );

      if (selectedType) {
        setBookingAvailability(
          selectedType.available_inventory,
        );
      } else {
        setBookingAvailability(0);
      }
    } catch (err) {
      console.error("Failed to check availability:", err);
      setBookingAvailability(null);
    } finally {
      setCheckingAvailability(false);
    }
  }, [
    selectedRoomForBooking,
    bookingDates.check_in_date,
    bookingDates.check_out_date,
  ]);

  useEffect(() => {
    if (selectedRoomForBooking) {
      checkAvailability();
    }
  }, [
    selectedRoomForBooking,
    bookingDates.check_in_date,
    bookingDates.check_out_date,
    checkAvailability,
  ]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setNewRoom((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddRoomSubmit = async (e) => {
    e.preventDefault();

    setSubmitting(true);
    setFormError(null);

    try {
      const formData = new FormData();

      formData.append("name", newRoom.name);
      formData.append(
        "bed_count",
        parseInt(newRoom.bed_count, 10),
      );
      formData.append("bed_type", newRoom.bed_type);
      formData.append(
        "price_per_night",
        parseFloat(newRoom.price_per_night),
      );
      formData.append(
        "inventory",
        parseInt(newRoom.inventory, 10),
      );
      formData.append("status", newRoom.status);

      if (selectedPicture) {
        formData.append("picture", selectedPicture);
      }

      const response = await apiFetch("/api/room-types/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({}));

        if (errorData.name) {
          throw new Error(
            Array.isArray(errorData.name)
              ? errorData.name[0]
              : errorData.name,
          );
        }

        if (errorData.detail) {
          throw new Error(errorData.detail);
        }

        throw new Error(
          "Failed to create room type. Please check your inputs.",
        );
      }

      const createdRoom = await response.json();

      setRooms((prev) => [
        createdRoom,
        ...prev,
      ]);

      setShowModal(false);
      setSelectedPicture(null);

      setNewRoom({
        name: "",
        bed_count: 1,
        bed_type: "King",
        price_per_night: "",
        inventory: 1,
        status: "Available",
      });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (
    roomTypeId,
    newStatus,
  ) => {
    try {
      const response = await apiFetch(
        `/api/room-types/${roomTypeId}/`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: newStatus,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          "Failed to update room type status.",
        );
      }

      setRooms((prev) =>
        prev.map((room) =>
          room.room_type_id === roomTypeId
            ? {
                ...room,
                status: newStatus,
              }
            : room,
        ),
      );
    } catch (err) {
      alert(`Could not update status: ${err.message}`);
      fetchRooms();
    }
  };

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const search = searchTerm.toLowerCase();

      const matchesSearch =
        room.name
          ?.toLowerCase()
          .includes(search) ||
        room.bed_type
          ?.toLowerCase()
          .includes(search);

      const matchesStatus =
        statusFilter === "All" ||
        room.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [
    rooms,
    searchTerm,
    statusFilter,
  ]);

  const handleOpenWalkIn = (room) => {
    setSelectedRoomForBooking(room);
    setBookingError(null);
    setBookingAvailability(null);

    setBookingDates({
      check_in_date: todayStr,
      check_out_date: tomorrowStr,
    });

    setSelectedGuestId("");

    setIsNewGuest(true);

    setWalkInGuestData({
      first_name: "",
      last_name: "",
      email: "",
      phone_number: "",
      id_document: "",
    });
  };

  const handleCheckInChange = (date) => {
    if (!date) return;

    const newInStr =
      typeof date === "string"
        ? date
        : formatDateToYYYYMMDD(date);

    const parsedInDate =
      parseStringToLocalDate(newInStr);

    const nextDay = new Date(parsedInDate);
    nextDay.setDate(
      nextDay.getDate() + 1,
    );

    const nextDayStr =
      formatDateToYYYYMMDD(nextDay);

    if (
      newInStr >=
      bookingDates.check_out_date
    ) {
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

  const handleWalkInSubmit = async (e) => {
    e.preventDefault();

    if (
      !bookingDates.check_in_date ||
      !bookingDates.check_out_date
    ) {
      setBookingError(
        "Please select valid check-in and check-out dates.",
      );
      return;
    }

    if (
      bookingDates.check_out_date <=
      bookingDates.check_in_date
    ) {
      setBookingError(
        "Check-out date must be after check-in date.",
      );
      return;
    }

    if (
      bookingAvailability === 0
    ) {
      setBookingError(
        "This room type is fully booked for the selected dates.",
      );
      return;
    }

    setBookingSubmitting(true);
    setBookingError(null);

    try {
      let targetGuestId =
        selectedGuestId;

      if (isNewGuest) {
        const generatedPassword =
          `WalkIn_${Math.random().toString(36).slice(-8)}!`;

        const registerPayload = {
          username:
            walkInGuestData.email,
          email:
            walkInGuestData.email,
          password:
            generatedPassword,
          confirm_password:
            generatedPassword,
          first_name:
            walkInGuestData.first_name,
          last_name:
            walkInGuestData.last_name,
          phone_number:
            walkInGuestData.phone_number,
          id_document:
            walkInGuestData.id_document,
        };

        const regResponse =
          await apiFetch(
            "/api/register/",
            {
              method: "POST",
              body: JSON.stringify(
                registerPayload,
              ),
            },
          );

        if (!regResponse.ok) {
          const errData =
            await regResponse
              .json()
              .catch(() => ({}));

          throw new Error(
            errData.detail ||
              JSON.stringify(errData) ||
              "Failed to register new walk-in guest account.",
          );
        }

        const guestsResponse =
          await apiFetch(
            "/api/guests/",
          );

        if (guestsResponse.ok) {
          const guestsList =
            await guestsResponse.json();

          const createdGuest =
            guestsList.find(
              (guest) =>
                guest.email ===
                walkInGuestData.email,
            );

          if (createdGuest) {
            targetGuestId =
              createdGuest.guest_id;
          }
        }
      }

      if (!targetGuestId) {
        throw new Error(
          "Could not determine a valid guest ID for this booking.",
        );
      }

      const bookingPayload = {
        room_type:
          selectedRoomForBooking.room_type_id,
        guest_id:
          targetGuestId,
        check_in_date:
          bookingDates.check_in_date,
        check_out_date:
          bookingDates.check_out_date,
      };

      const bookingResponse =
        await apiFetch(
          "/api/bookings/",
          {
            method: "POST",
            body: JSON.stringify(
              bookingPayload,
            ),
          },
        );

      if (!bookingResponse.ok) {
        const errData =
          await bookingResponse
            .json()
            .catch(() => ({}));

        throw new Error(
          errData.error ||
            errData.detail ||
            errData.non_field_errors?.[0] ||
            "Failed to create booking.",
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

      setBookingAvailability(null);

      fetchRooms();
    } catch (err) {
      setBookingError(err.message);
    } finally {
      setBookingSubmitting(false);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1
            className="h3 mb-0"
            style={{
              color: "#1e293b",
            }}
          >
            Rooms Inventory
          </h1>

          <p className="text-secondary small mb-0">
            Manage room types, inventory, pricing,
            and availability
          </p>
        </div>

        <div className="d-flex gap-2 align-items-center">
          <span
            className="d-inline-flex align-items-center justify-content-center px-3 py-2 fw-semibold"
            style={{
              height: "40px",
              minWidth: "150px",
              borderRadius: "8px",
              backgroundColor: "#f1f5f9",
              color: "#334155",
              fontSize: "0.9rem",
              border: "1px solid #e2e8f0",
            }}
          >
            {rooms.length} Room Types
          </span>

          <button
            className="btn btn-primary d-inline-flex align-items-center justify-content-center px-3 py-2 fw-semibold"
            style={{
              height: "40px",
              minWidth: "150px",
              borderRadius: "8px",
              fontSize: "0.9rem",
            }}
            onClick={() => {
              setFormError(null);
              setShowModal(true);
            }}
          >
            + Add Room Type
          </button>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-8">
          <input
            type="text"
            className="form-control"
            placeholder="Search by Room Type or Bed Type..."
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(e.target.value)
            }
          />
        </div>

        <div className="col-md-4">
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
          >
            <option value="All">
              Filter by Status (All)
            </option>
            <option value="Available">
              Available
            </option>
            <option value="Maintenance">
              Maintenance
            </option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="text-center py-5">
          <div
            className="spinner-border text-primary"
            role="status"
          >
            <span className="visually-hidden">
              Loading room inventory...
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="card shadow-sm">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h5 className="mb-0 fw-bold">
              Room Types
            </h5>

            <small className="text-muted">
              Showing {filteredRooms.length} of{" "}
              {rooms.length}
            </small>
          </div>

          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light text-uppercase fs-7 text-secondary">
                  <tr>
                    <th>Room Type</th>
                    <th>Bed Configuration</th>
                    <th>Price / Night</th>
                    <th>Inventory</th>
                    <th>Availability</th>
                    <th>Status</th>
                    <th className="text-end pe-3">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRooms.length === 0 ? (
                    <tr>
                      <td
                        colSpan="7"
                        className="text-center py-4 text-muted"
                      >
                        No room types match your
                        filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRooms.map((room) => (
                      <tr
                        key={
                          room.room_type_id
                        }
                      >
                        <td>
                          <div className="fw-bold">
                            {room.name}
                          </div>
                        </td>

                        <td>
                          {room.bed_count} x{" "}
                          {room.bed_type}
                        </td>

                        <td className="fw-semibold">
                          ${room.price_per_night}
                        </td>

                        <td>
                          <span className="badge bg-light text-dark border">
                            {room.inventory}{" "}
                            units
                          </span>
                        </td>

                        <td>
                          <span className="badge bg-success">
                            {room.available_inventory ??
                              room.inventory}{" "}
                            available
                          </span>
                        </td>

                        <td>
                          <span
                            className={`badge ${
                              room.status ===
                              "Available"
                                ? "bg-success"
                                : "bg-warning text-dark"
                            }`}
                          >
                            {room.status ||
                              "Available"}
                          </span>
                        </td>

                        <td className="text-end pe-3">
                          {room.status ===
                            "Available" && (
                            <button
                              className="btn btn-sm btn-outline-success me-2"
                              onClick={() =>
                                handleOpenWalkIn(
                                  room,
                                )
                              }
                            >
                              + Book Walk-In
                            </button>
                          )}

                          <select
                            className="form-select form-select-sm d-inline-block w-auto"
                            value={
                              room.status ||
                              "Available"
                            }
                            onChange={(e) =>
                              handleStatusChange(
                                room.room_type_id,
                                e.target.value,
                              )
                            }
                          >
                            <option value="Available">
                              Available
                            </option>

                            <option value="Maintenance">
                              Maintenance
                            </option>
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

      {showModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{
            backgroundColor:
              "rgba(0, 0, 0, 0.5)",
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  Add New Room Type
                </h5>

                <button
                  type="button"
                  className="btn-close"
                  disabled={submitting}
                  onClick={() =>
                    setShowModal(false)
                  }
                ></button>
              </div>

              <form
                onSubmit={
                  handleAddRoomSubmit
                }
              >
                <div className="modal-body">
                  {formError && (
                    <div className="alert alert-danger">
                      {formError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Room Type
                    </label>

                    <input
                      type="text"
                      className="form-control"
                      name="name"
                      placeholder="e.g. Standard King, Deluxe King"
                      value={newRoom.name}
                      onChange={
                        handleInputChange
                      }
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
                        value={
                          newRoom.bed_count
                        }
                        onChange={
                          handleInputChange
                        }
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
                        value={
                          newRoom.bed_type
                        }
                        onChange={
                          handleInputChange
                        }
                      >
                        <option value="Single">
                          Single
                        </option>

                        <option value="Double">
                          Double
                        </option>

                        <option value="Queen">
                          Queen
                        </option>

                        <option value="King">
                          King
                        </option>

                        <option value="Suite">
                          Suite
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Price / Night ($)
                      </label>

                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control"
                        name="price_per_night"
                        placeholder="150.00"
                        value={
                          newRoom.price_per_night
                        }
                        onChange={
                          handleInputChange
                        }
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Inventory
                      </label>

                      <input
                        type="number"
                        min="1"
                        className="form-control"
                        name="inventory"
                        value={
                          newRoom.inventory
                        }
                        onChange={
                          handleInputChange
                        }
                        required
                      />

                      <small className="text-muted">
                        Number of rooms of this
                        type available.
                      </small>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Initial Status
                    </label>

                    <select
                      className="form-select"
                      name="status"
                      value={
                        newRoom.status
                      }
                      onChange={
                        handleInputChange
                      }
                    >
                      <option value="Available">
                        Available
                      </option>

                      <option value="Maintenance">
                        Maintenance
                      </option>
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
                      onChange={(e) =>
                        setSelectedPicture(
                          e.target.files?.[0] ||
                            null,
                        )
                      }
                    />
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={submitting}
                    onClick={() =>
                      setShowModal(false)
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting
                      ? "Creating..."
                      : "Save Room Type"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {selectedRoomForBooking && (
        <div
          className="modal fade show d-block"
          style={{
            backgroundColor:
              "rgba(0, 0, 0, 0.5)",
          }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content shadow">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">
                  Walk-In Booking —{" "}
                  {
                    selectedRoomForBooking.name
                  }
                </h5>

                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() =>
                    setSelectedRoomForBooking(
                      null,
                    )
                  }
                ></button>
              </div>

              <form
                onSubmit={
                  handleWalkInSubmit
                }
              >
                <div className="modal-body p-4">
                  {bookingError && (
                    <div className="alert alert-danger">
                      {bookingError}
                    </div>
                  )}

                  <div className="alert alert-light border mb-4">
                    <div className="d-flex justify-content-between">
                      <span>
                        Room Type
                      </span>

                      <strong>
                        {
                          selectedRoomForBooking.name
                        }
                      </strong>
                    </div>

                    <div className="d-flex justify-content-between mt-2">
                      <span>
                        Nightly Rate
                      </span>

                      <strong>
                        $
                        {
                          selectedRoomForBooking.price_per_night
                        }
                      </strong>
                    </div>

                    <div className="d-flex justify-content-between mt-2">
                      <span>
                        Inventory
                      </span>

                      <strong>
                        {
                          selectedRoomForBooking.inventory
                        }{" "}
                        units
                      </strong>
                    </div>

                    <div className="d-flex justify-content-between mt-2">
                      <span>
                        Selected Dates Availability
                      </span>

                      <strong
                        className={
                          bookingAvailability ===
                          0
                            ? "text-danger"
                            : "text-success"
                        }
                      >
                        {checkingAvailability
                          ? "Checking..."
                          : bookingAvailability ===
                            null
                          ? "Select dates"
                          : `${bookingAvailability} available`}
                      </strong>
                    </div>
                  </div>

                  <h6 className="fw-bold mb-3 text-secondary">
                    1. Stay Dates
                  </h6>

                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Check-In Date
                      </label>

                      <DatePicker
                        selected={parseStringToLocalDate(
                          bookingDates.check_in_date,
                        )}
                        onChange={
                          handleCheckInChange
                        }
                        selectsStart
                        startDate={parseStringToLocalDate(
                          bookingDates.check_in_date,
                        )}
                        endDate={parseStringToLocalDate(
                          bookingDates.check_out_date,
                        )}
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
                          bookingDates.check_out_date,
                        )}
                        onChange={(date) =>
                          setBookingDates(
                            (prev) => ({
                              ...prev,
                              check_out_date:
                                formatDateToYYYYMMDD(
                                  date,
                                ),
                            }),
                          )
                        }
                        selectsEnd
                        startDate={parseStringToLocalDate(
                          bookingDates.check_in_date,
                        )}
                        endDate={parseStringToLocalDate(
                          bookingDates.check_out_date,
                        )}
                        minDate={
                          parseStringToLocalDate(
                            bookingDates.check_in_date,
                          ) ||
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
                        checked={
                          isNewGuest
                        }
                        onChange={() =>
                          setIsNewGuest(
                            true,
                          )
                        }
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
                        checked={
                          !isNewGuest
                        }
                        onChange={() =>
                          setIsNewGuest(
                            false,
                          )
                        }
                      />

                      <label
                        className="form-check-label fw-semibold"
                        htmlFor="existingGuest"
                      >
                        Select Existing Guest
                      </label>
                    </div>
                  </div>

                  {isNewGuest ? (
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">
                          First Name
                        </label>

                        <input
                          type="text"
                          className="form-control"
                          value={
                            walkInGuestData.first_name
                          }
                          onChange={(e) =>
                            setWalkInGuestData(
                              (prev) => ({
                                ...prev,
                                first_name:
                                  e.target.value,
                              }),
                            )
                          }
                          required
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">
                          Last Name
                        </label>

                        <input
                          type="text"
                          className="form-control"
                          value={
                            walkInGuestData.last_name
                          }
                          onChange={(e) =>
                            setWalkInGuestData(
                              (prev) => ({
                                ...prev,
                                last_name:
                                  e.target.value,
                              }),
                            )
                          }
                          required
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">
                          Email
                        </label>

                        <input
                          type="email"
                          className="form-control"
                          value={
                            walkInGuestData.email
                          }
                          onChange={(e) =>
                            setWalkInGuestData(
                              (prev) => ({
                                ...prev,
                                email:
                                  e.target.value,
                              }),
                            )
                          }
                          required
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">
                          Phone Number
                        </label>

                        <input
                          type="tel"
                          className="form-control"
                          value={
                            walkInGuestData.phone_number
                          }
                          onChange={(e) =>
                            setWalkInGuestData(
                              (prev) => ({
                                ...prev,
                                phone_number:
                                  e.target.value,
                              }),
                            )
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
                          value={
                            walkInGuestData.id_document
                          }
                          onChange={(e) =>
                            setWalkInGuestData(
                              (prev) => ({
                                ...prev,
                                id_document:
                                  e.target.value,
                              }),
                            )
                          }
                          required
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mb-3">
                      <label className="form-label">
                        Select Guest
                      </label>

                      <select
                        className="form-select"
                        value={
                          selectedGuestId
                        }
                        onChange={(e) =>
                          setSelectedGuestId(
                            e.target.value,
                          )
                        }
                        required={
                          !isNewGuest
                        }
                      >
                        <option value="">
                          -- Choose Existing Guest --
                        </option>

                        {existingGuests.map(
                          (guest) => (
                            <option
                              key={
                                guest.guest_id
                              }
                              value={
                                guest.guest_id
                              }
                            >
                              {
                                guest.first_name
                              }{" "}
                              {
                                guest.last_name
                              }{" "}
                              (
                              {
                                guest.email
                              }
                              )
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  )}
                </div>

                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={
                      bookingSubmitting
                    }
                    onClick={() =>
                      setSelectedRoomForBooking(
                        null,
                      )
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={
                      bookingSubmitting ||
                      checkingAvailability ||
                      bookingAvailability ===
                        0
                    }
                  >
                    {bookingSubmitting
                      ? "Processing..."
                      : "Confirm Walk-In Booking"}
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