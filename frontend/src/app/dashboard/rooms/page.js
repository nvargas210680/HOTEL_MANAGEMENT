"use client";

import { useState, useEffect, useMemo } from "react";
import { apiFetch } from "@/utils/api";

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [formError, setFormError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newRoom, setNewRoom] = useState({
    room_number: "",
    bed_count: 1,
    bed_type: "King",
    price_type: "Standard",
    price_per_night: "",
    status: "Available",
  });

  const handleInputChange = (e) => {
  const { name, value } = e.target;
  setNewRoom((prev) => ({
    ...prev,
    [name]: value,
  }));
};

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
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
          r.room_id === roomId ? { ...r, status: newStatus } : r,
        ),
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
    setFormError(null); // Clear previous errors

    try {
      const response = await apiFetch("/api/rooms/", {
        method: "POST",
        body: JSON.stringify({
          room_number: newRoom.room_number,
          bed_count: parseInt(newRoom.bed_count, 10),
          bed_type: newRoom.bed_type,
          price_type: newRoom.price_type,
          price_per_night: parseFloat(newRoom.price_per_night),
          status: newRoom.status,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Check if Django returned a specific field validation error
        if (errorData.room_number) {
          throw new Error(`Room Number ${newRoom.room_number} already exists.`);
        } else if (errorData.detail) {
          throw new Error(errorData.detail);
        } else {
          throw new Error("Failed to create room. Please check your inputs.");
        }
      }

      const createdRoom = await response.json();

      // Reset form and close modal on success
      setRooms((prev) => [createdRoom, ...prev]);
      setShowModal(false);
      setNewRoom({
        room_number: "",
        bed_count: 1,
        bed_type: "King",
        price_type: "Standard",
        price_per_night: "",
        status: "Available",
      });
    } catch (err) {
      setFormError(err.message); // Show error inside the modal
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
                      <label className="form-label fw-semibold">Bed Type</label>
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
    </div>
  );
}
