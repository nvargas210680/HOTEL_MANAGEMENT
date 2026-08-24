'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiFetch } from '@/utils/api';

export default function OverviewPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await apiFetch('/api/admin/bookings/');

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setBookings(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    setUpdatingId(bookingId);
    try {
      const response = await apiFetch(`/api/admin/bookings/${bookingId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      setBookings((prev) =>
        prev.map((b) =>
          b.booking_id === bookingId ? { ...b, status: newStatus } : b
        )
      );
    } catch (err) {
      alert(`Could not update booking: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Compute filtered list on the fly based on search term & status filter
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchesSearch =
        b.guest_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.guest_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(b.booking_id).includes(searchTerm);

      const matchesStatus =
        statusFilter === 'All' || b.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchTerm, statusFilter]);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-0">Dashboard Overview</h1>
          <p className="text-muted small mb-0">Manage guest reservations and active status</p>
        </div>
        <span className="badge bg-primary fs-6">{bookings.length} Total Bookings</span>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="row g-3 mb-4">
        <div className="col-md-8">
          <input
            type="text"
            className="form-control"
            placeholder="Search by Guest Name, Email, or Booking ID..."
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
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
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
        <div className="card shadow-sm">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h5 className="mb-0 fw-bold">Recent Bookings</h5>
            <small className="text-muted">
              Showing {filteredBookings.length} of {bookings.length}
            </small>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover table-striped align-middle mb-0">
                <thead className="table-dark">
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
                        <td>{b.guest_email || 'N/A'}</td>
                        <td>
                          <span className="badge bg-secondary">
                            Room {b.room_number || 'N/A'}
                          </span>
                        </td>
                        <td>{b.check_in_date}</td>
                        <td>{b.check_out_date}</td>
                        <td>
                          <span
                            className={`badge ${
                              b.status === 'Confirmed'
                                ? 'bg-success'
                                : b.status === 'Cancelled'
                                ? 'bg-danger'
                                : 'bg-warning text-dark'
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
                              handleStatusChange(b.booking_id, e.target.value)
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