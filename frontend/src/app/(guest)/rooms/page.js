"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function RoomsPage() {
  const [data, setData] = useState([]);
  const [isStaff, setIsStaff] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [bookingError, setBookingError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [excludeIntervals, setExcludeIntervals] = useState([]);
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
    return new Date(year, month - 1, day); // Constructs the date in local timezone
  };

  const handleSelectRoomForBooking = async (room) => {
    setSelectedRoom(room);
    setBookingError("");
    setCheckIn(null);
    setCheckOut(null);

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/bookings/booked_dates/?room_id=${room.room_id}`,
      );
      const bookedRanges = await res.json();

      const intervals = bookedRanges.map((b) => ({
        start: parseStringToLocalDate(b.check_in_date),
        end: parseStringToLocalDate(b.check_out_date),
      }));

      setExcludeIntervals(intervals);
    } catch (err) {
      console.error("Failed to load booked dates:", err);
      setExcludeIntervals([]);
    }
  };

  const handleConfirmBooking = async () => {
    setIsSubmitting(true);
    setBookingError("");

    const token = localStorage.getItem("accessToken");

    try {
      const response = await fetch("http://127.0.0.1:8000/api/bookings/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          room: selectedRoom.room_id, // or selectedRoom.id depending on your model
          check_in_date: checkIn, // Renamed to check_in_date
          check_out_date: checkOut, // Renamed to check_out_date
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        console.log("DJANGO 400 ERROR RESPONSE:", errData);
        throw new Error(errData.detail || "Failed to create booking.");
      }

      setSelectedRoom(null);
      router.push("/my-bookings");
    } catch (err) {
      setBookingError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/rooms/");
        const roomsJson = await response.json();
        setData(roomsJson);
      } catch (error) {
        console.error("Error fetching rooms:", error);
      }
    };

    fetchRooms();
  }, []);

  const handleStatusChange = async (roomId, newStatus) => {
    const updatedRooms = data.map((room) =>
      room.room_id === roomId ? { ...room, status: newStatus } : room,
    );
    setData(updatedRooms);
    const token = localStorage.getItem("accessToken");
    if (!token) {
      console.error("No access token found. User must be logged in.");
      return;
    }
    try {
      await fetch(`http://127.0.0.1:8000/api/rooms/${roomId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }), // Convert our JavaScript object to a JSON string
      });
    } catch (error) {
      console.error("Failed to update status on the server:", error);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setIsStaff(Boolean(user.is_staff));
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
      }
    }
  }, []);

  return (
    <>
      <div
        className="py-5"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('/images/hotel_palms.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="container mt-5">
          <div className="row">
            {data.map((room) => (
              <div key={room.room_id} className="col-12 col-md-6 col-lg-4 mb-4">
                <div className="card h-100">
                  <img
                    src={room.picture || "https://placehold.co/600x400"}
                    className="card-img-top"
                    alt={`Room ${room.room_number}`}
                  />

                  <div className="card-body">
                    <h3>Room {room.room_number}</h3>
                    <p className="card-text">
                      <strong>Bed Type:</strong> {room.bed_count} x{" "}
                      {room.bed_type}
                    </p>
                    <p className="card-text">
                      <strong>Rate Type:</strong> {room.price_type}
                    </p>
                    <p className="card-text">
                      <strong>Price:</strong> ${room.price_per_night} / night
                    </p>

                    {isStaff ? (
                      <p className="card-text">
                        <strong>Status:</strong>
                        <select
                          className="form-select form-select-sm mt-1"
                          value={room.status}
                          onChange={(e) =>
                            handleStatusChange(room.room_id, e.target.value)
                          }
                        >
                          <option value="Available">Available</option>
                          <option value="Occupied">Occupied</option>
                          <option value="Maintenance">Maintenance</option>
                        </select>
                      </p>
                    ) : (
                      <div className="mt-3">
                        <p className="card-text">
                          <strong>Status:</strong>{" "}
                          <span
                            className={`badge ${
                              room.status === "Available"
                                ? "bg-success"
                                : "bg-secondary"
                            }`}
                          >
                            {room.status}
                          </span>
                        </p>

                        {room.status === "Available" && (
                          <button
                            className="btn btn-primary w-100 mt-2"
                            onClick={() => handleSelectRoomForBooking(room)}
                          >
                            Book Now
                          </button>
                        )}
                      </div>
                    )}
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
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Book Room {selectedRoom.room_number}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedRoom(null)}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  <strong>Price per night:</strong> $
                  {selectedRoom.price_per_night}
                </p>

                {bookingError && (
                  <div className="alert alert-danger">{bookingError}</div>
                )}
                {/* Check-In DatePicker */}
                <DatePicker
                  selected={parseStringToLocalDate(checkIn)}
                  onChange={(date) => setCheckIn(formatDateToYYYYMMDD(date))}
                  selectsStart
                  startDate={parseStringToLocalDate(checkIn)}
                  endDate={parseStringToLocalDate(checkOut)}
                  minDate={new Date()}
                  excludeDateIntervals={excludeIntervals}
                  placeholderText="Select check-in date"
                  className="form-control"
                  dateFormat="yyyy-MM-dd"
                />

                {/* Check-Out DatePicker */}
                <DatePicker
                  selected={parseStringToLocalDate(checkOut)}
                  onChange={(date) => setCheckOut(formatDateToYYYYMMDD(date))}
                  selectsEnd
                  startDate={parseStringToLocalDate(checkIn)}
                  endDate={parseStringToLocalDate(checkOut)}
                  minDate={parseStringToLocalDate(checkIn) || new Date()}
                  excludeDateIntervals={excludeIntervals}
                  placeholderText="Select check-out date"
                  className="form-control"
                  dateFormat="yyyy-MM-dd"
                />
                {/* --- END OF NEW DATEPICKER BLOCK --- */}
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setSelectedRoom(null)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleConfirmBooking}
                  disabled={isSubmitting || !checkIn || !checkOut}
                >
                  {isSubmitting ? "Confirming..." : "Confirm Booking"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
