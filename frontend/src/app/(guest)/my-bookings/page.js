"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "react-datepicker/dist/react-datepicker.css";

export default function MyBookingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const calculateNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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

    const fetchBookings = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/bookings/", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log("FETCHED BOOKINGS DATA:", data);
          setBookings(data);
        } else {
          // Treat non-200 responses safely by setting empty bookings
          setBookings([]);
        }
      } catch (error) {
        console.error("Network error fetching bookings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    router.push("/login");
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
        /* Empty State */
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
        /* Bookings List */
        <div className="row g-4">
          {bookings.map((booking) => (
            <div
              key={booking.id || booking.booking_id}
              className="col-md-6 col-lg-4"
            >
              <div className="card h-100 shadow-sm border-0">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="badge bg-success">Confirmed</span>
                    <small className="text-muted">
                      ID: #{booking.id || booking.booking_id}
                    </small>
                  </div>
                  <h5 className="card-title fw-bold text-capitalize">
                    {booking.room_details?.bed_type || "Standard Room"}
                  </h5>

                  {/* Number of Nights Highlight */}
                  <div className="mb-2">
                    <span className="badge bg-light text-dark border">
                      🌙{" "}
                      {calculateNights(
                        booking.check_in_date || booking.check_in,
                        booking.check_out_date || booking.check_out,
                      )}{" "}
                      Night(s)
                    </span>
                  </div>

                  {/* NEW REAL-WORLD DISPLAY */}
                  <div className="border-top pt-2 mt-2">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-muted small">Nightly Rate:</span>
                      <span className="fw-semibold">
                        ${booking.room_details?.price_per_night} / night
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
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
