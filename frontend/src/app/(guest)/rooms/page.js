"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { apiFetch } from "@/utils/api";

export default function RoomsPage() {
  const [data, setData] = useState([]);
  const [isStaff, setIsStaff] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [bookingError, setBookingError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const router = useRouter();

  const formatDateToYYYYMMDD = (date) => {
    if (!date) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const parseStringToLocalDate = (dateString) => {
    if (!dateString) return null;

    const [year, month, day] = dateString.split("-").map(Number);

    return new Date(year, month - 1, day);
  };

  const fetchRooms = async () => {
    try {
      const response = await apiFetch("/api/room-types/");

      if (!response.ok) {
        throw new Error("Failed to load room types.");
      }

      const roomsJson = await response.json();

      setData(roomsJson);
    } catch (error) {
      console.error("Error fetching room types:", error);
    }
  };

  const checkRoomAvailability = async (
    room,
    selectedCheckIn,
    selectedCheckOut,
  ) => {
    if (!selectedCheckIn || !selectedCheckOut) {
      setAvailability(null);
      return;
    }

    if (selectedCheckOut <= selectedCheckIn) {
      setAvailability(0);
      return;
    }

    setCheckingAvailability(true);
    setBookingError("");

    try {
      const response = await apiFetch(
        `/api/room-types/?check_in=${selectedCheckIn}&check_out=${selectedCheckOut}`,
      );

      if (!response.ok) {
        throw new Error("Unable to check room availability.");
      }

      const rooms = await response.json();

      const selectedRoomType = rooms.find(
        (item) => item.room_type_id === room.room_type_id,
      );

      if (selectedRoomType) {
        setAvailability(selectedRoomType.available_inventory);
      } else {
        setAvailability(0);
      }
    } catch (error) {
      console.error("Failed to check availability:", error);
      setAvailability(null);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const openBookingModal = (room) => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      router.push("/login");
      return;
    }

    setSelectedRoom(room);
    setBookingError("");
    setCheckIn(null);
    setCheckOut(null);
    setAvailability(room.available_inventory);
  };

  const handleConfirmBooking = async () => {
    if (!checkIn || !checkOut) {
      setBookingError(
        "Please select both check-in and check-out dates.",
      );
      return;
    }

    if (checkOut <= checkIn) {
      setBookingError(
        "Check-out date must be after check-in date.",
      );
      return;
    }

    if (availability === 0) {
      setBookingError(
        "This room type is fully booked for the selected dates.",
      );
      return;
    }

    setIsSubmitting(true);
    setBookingError("");

    try {
      const response = await apiFetch("/api/bookings/", {
        method: "POST",
        body: JSON.stringify({
          room_type: selectedRoom.room_type_id,
          check_in_date: checkIn,
          check_out_date: checkOut,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));

        throw new Error(
          errData.detail ||
            errData.error ||
            errData.non_field_errors?.[0] ||
            "Failed to create booking.",
        );
      }

      setSelectedRoom(null);
      setCheckIn(null);
      setCheckOut(null);
      setAvailability(null);

      router.push("/my-bookings");
    } catch (err) {
      setBookingError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (roomTypeId, newStatus) => {
    const token = localStorage.getItem("accessToken");

    const updatedRooms = data.map((room) =>
      room.room_type_id === roomTypeId
        ? {
            ...room,
            status: newStatus,
          }
        : room,
    );

    setData(updatedRooms);

    try {
      await apiFetch(`/api/room-types/${roomTypeId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });
    } catch (error) {
      console.error(
        "Failed to update status on the server:",
        error,
      );

      fetchRooms();
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);

        setIsStaff(Boolean(user.is_staff));
      } catch (error) {
        console.error(
          "Failed to parse user from localStorage",
          error,
        );
      }
    }
  }, []);

  useEffect(() => {
    if (selectedRoom && checkIn && checkOut) {
      checkRoomAvailability(
        selectedRoom,
        checkIn,
        checkOut,
      );
    }
  }, [checkIn, checkOut, selectedRoom]);

  return (
    <>
      <div
        className="min-vh-100"
        style={{
          backgroundImage: `linear-gradient(
            rgba(0, 0, 0, 0.35),
            rgba(0, 0, 0, 0.35)
          ), url('/images/hotel_palms.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
          paddingTop: "110px",
          paddingBottom: "48px",
        }}
      >
        <div className="container-fluid px-4 px-md-5">
          <div className="text-center text-white mb-5">
            <h1 className="fw-bold display-5">
              Our Exclusive Suites
            </h1>

            <p className="text-white-50 lead">
              Experience unmatched comfort and tailored hospitality.
            </p>
          </div>

          <div className="row">
            {data.map((room) => (
              <div
                key={room.room_type_id}
                className="col-12 col-md-6 col-lg-4 mb-4"
              >
                <div className="card h-100 border-0 shadow-lg rounded-4 overflow-hidden bg-white">
                  <div className="position-relative">
                    <img
                      src={
                        room.picture ||
                        "/images/bright-hotel-room-bed.jpg"
                      }
                      className="card-img-top"
                      alt={`${room.name} Suite`}
                      style={{
                        height: "220px",
                        objectFit: "cover",
                      }}
                    />

                    <div className="position-absolute top-0 end-0 m-3">
                      {isStaff ? (
                        <span className="badge bg-dark bg-opacity-75 px-3 py-2 rounded-pill">
                          {room.inventory} Units
                        </span>
                      ) : (
                        <span
                          className={`badge px-3 py-2 rounded-pill ${
                            room.status === "Available"
                              ? "bg-success"
                              : "bg-secondary"
                          }`}
                        >
                          {room.status}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="card-body p-4 d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h4 className="fw-bold text-dark mb-0">
                          {room.name}
                        </h4>

                        <span className="text-primary fw-bold fs-5">
                          ${room.price_per_night}{" "}
                          <small className="text-muted fs-6">
                            / night
                          </small>
                        </span>
                      </div>

                      <hr className="text-muted opacity-25 my-3" />

                      <div className="d-flex align-items-center gap-2 mb-3 text-secondary">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          fill="currentColor"
                          className="bi bi-bed"
                          viewBox="0 0 16 16"
                        >
                          <path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v7h-1V4H2v6H1V3zm4 9v2h6v-2H5z" />
                          <path d="M2 12h12v1H2v-1z" />
                        </svg>

                        <span>
                          {room.bed_count} {room.bed_type} Bed(s)
                        </span>
                      </div>

                      <div className="d-flex align-items-center gap-2 mb-3 text-secondary">
                        <i className="bi bi-door-open"></i>

                        <span>
                          {room.inventory} rooms of this type
                        </span>
                      </div>

                      <div className="mb-3">
                        <p
                          className="small fw-bold text-muted mb-2 text-uppercase tracking-wider"
                          style={{
                            fontSize: "0.75rem",
                            letterSpacing: "1px",
                          }}
                        >
                          Suite Amenities
                        </p>

                        <div className="row g-2 text-secondary small">
                          <div className="col-6 d-flex align-items-center gap-2">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              viewBox="0 0 24 24"
                            >
                              <rect
                                width="20"
                                height="15"
                                x="2"
                                y="3"
                                rx="2.5"
                              />
                              <line
                                x1="8"
                                x2="16"
                                y1="21"
                                y2="21"
                              />
                              <line
                                x1="12"
                                x2="12"
                                y1="18"
                                y2="21"
                              />
                            </svg>

                            <span
                              style={{
                                fontSize: "0.85rem",
                              }}
                            >
                              Flat Screen TV
                            </span>
                          </div>

                          <div className="col-6 d-flex align-items-center gap-2">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              viewBox="0 0 24 24"
                            >
                              <rect
                                width="20"
                                height="14"
                                x="2"
                                y="5"
                                rx="2"
                              />
                              <path d="M18 9h1v6h-1z" />
                              <path d="M6 9h8v6H6z" />
                            </svg>

                            <span
                              style={{
                                fontSize: "0.85rem",
                              }}
                            >
                              Microwave
                            </span>
                          </div>

                          <div className="col-6 d-flex align-items-center gap-2">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              viewBox="0 0 24 24"
                            >
                              <rect
                                width="14"
                                height="20"
                                x="5"
                                y="2"
                                rx="2"
                              />
                              <path d="M5 10h14" />
                              <path d="M10 6h1" />
                              <path d="M10 14h1" />
                            </svg>

                            <span
                              style={{
                                fontSize: "0.85rem",
                              }}
                            >
                              Refrigerator
                            </span>
                          </div>

                          <div className="col-6 d-flex align-items-center gap-2">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              viewBox="0 0 24 24"
                            >
                              <path d="M2 14h20v2a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-2z" />
                              <path d="M6 14v-2a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v2" />
                              <path d="M6 6c0-1 1-2 2-2s2 1 2 2-1 2-2 2-2-1-2-2z" />
                              <path d="M14 6c0-1 1-2 2-2s2 1 2 2-1 2-2 2-2-1-2-2z" />
                            </svg>

                            <span
                              style={{
                                fontSize: "0.85rem",
                              }}
                            >
                              Hot Tub
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2">
                      {isStaff ? (
                        <div>
                          <label className="form-label small fw-bold text-muted">
                            Staff Status Control:
                          </label>

                          <select
                            className="form-select form-select-sm"
                            value={room.status}
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
                        </div>
                      ) : (
                        room.status === "Available" && (
                          <button
                            className="btn btn-dark w-100 py-2 rounded-pill fw-semibold shadow-sm"
                            onClick={() =>
                              openBookingModal(room)
                            }
                          >
                            Book Your Stay
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedRoom && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          style={{
            backgroundColor: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(5px)",
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 p-3">
              <div className="modal-header border-0 pb-0">
                <h4 className="modal-title fw-bold">
                  Reserve Your Stay
                </h4>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedRoom(null)}
                ></button>
              </div>

              <div className="modal-body">
                <p className="text-muted mb-2">
                  Selected Suite:{" "}
                  <strong className="text-dark">
                    {selectedRoom.name}
                  </strong>
                </p>

                <p className="text-muted mb-4">
                  Rate:{" "}
                  <strong className="text-dark">
                    ${selectedRoom.price_per_night} per night
                  </strong>
                </p>

                <div className="alert alert-light border rounded-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted">
                      Available for selected dates
                    </span>

                    <strong
                      className={
                        availability === 0
                          ? "text-danger"
                          : "text-success"
                      }
                    >
                      {checkingAvailability
                        ? "Checking..."
                        : availability === null
                          ? "Select dates"
                          : `${availability} available`}
                    </strong>
                  </div>
                </div>

                {bookingError && (
                  <div className="alert alert-danger rounded-3">
                    {bookingError}
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label small fw-semibold text-muted">
                    Check-In Date
                  </label>

                  <DatePicker
                    selected={parseStringToLocalDate(checkIn)}
                    onChange={(date) =>
                      setCheckIn(formatDateToYYYYMMDD(date))
                    }
                    selectsStart
                    startDate={parseStringToLocalDate(checkIn)}
                    endDate={parseStringToLocalDate(checkOut)}
                    minDate={new Date()}
                    placeholderText="Select check-in date"
                    className="form-control rounded-3 py-2"
                    dateFormat="yyyy-MM-dd"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold text-muted">
                    Check-Out Date
                  </label>

                  <DatePicker
                    selected={parseStringToLocalDate(checkOut)}
                    onChange={(date) =>
                      setCheckOut(formatDateToYYYYMMDD(date))
                    }
                    selectsEnd
                    startDate={parseStringToLocalDate(checkIn)}
                    endDate={parseStringToLocalDate(checkOut)}
                    minDate={
                      parseStringToLocalDate(checkIn) ||
                      new Date()
                    }
                    placeholderText="Select check-out date"
                    className="form-control rounded-3 py-2"
                    dateFormat="yyyy-MM-dd"
                  />
                </div>
              </div>

              <div className="modal-footer border-0 pt-0">
                <button
                  className="btn btn-light rounded-pill px-4"
                  onClick={() => setSelectedRoom(null)}
                >
                  Cancel
                </button>

                <button
                  className="btn btn-dark rounded-pill px-4"
                  onClick={handleConfirmBooking}
                  disabled={
                    isSubmitting ||
                    checkingAvailability ||
                    !checkIn ||
                    !checkOut ||
                    availability === 0
                  }
                >
                  {isSubmitting
                    ? "Processing..."
                    : "Confirm Reservation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}