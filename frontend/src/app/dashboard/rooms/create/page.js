"use client";
import { useState } from "react";
import { useRouter } from 'next/navigation';


export default function CreateRoomPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    hotel_id: 1, // Defaulting to hotel ID 1 for now
    room_number: "",
    bed_count: 1,
    bed_type: "King",
    price_type: "per night",
    price_per_night: "",
    status: "Available"
  });

  // A new whiteboard specifically for notification messages
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "" // This will be 'success' or 'danger' to match Bootstrap colors
  });

  // A single function to update the whiteboard whenever any input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // The messenger handling the network submission
  const handleSubmit = async (e) => {
    e.preventDefault(); // Stops the page from refreshing

    try {
      const response = await fetch("http://127.0.0.1:8000/api/rooms/", {
        method: "POST", // Tells Django to create a new row
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData), // Sends your whiteboard data
      });

      if (response.ok) {
        // Trigger the green success notification banner
        setNotification({
          show: true,
          message: "Room saved successfully!",
          type: "success"
        });

        setTimeout(() => {
         router.push("/dashboard/rooms");
         }, 1500);
         

        // This resets the form to blank values after a successful save
        setFormData({
          hotel_id: 1,
          room_number: "",
          bed_count: 1,
          bed_type: "King",
          price_type: "per night",
          price_per_night: "",
          status: "Available"
        });
      } else {
        // A 400 response means the room number unique validation failed
        setNotification({
          show: true,
          message: "This room number already exists. Please use a unique number.",
          type: "danger"
        });
      }
    } catch (error) {
      console.error("Error:", error);
      setNotification({
        show: true,
        message: "Could not connect to Django backend server.",
        type: "danger"
      });
    }
  };

  return (
    <div className="container mt-4" style={{ maxWidth: "600px" }}>
      <div className="card shadow-sm p-4">
        <h2 className="mb-4 text-primary">Add a New Room</h2>

        {/* Dynamic Bootstrap Popup Alert */}
        {notification.show && (
          <div className={`alert alert-${notification.type} alert-dismissible fade show`} role="alert">
            {notification.message}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* Room Number Input */}
          <div className="mb-3">
            <label className="form-label font-weight-bold">Room Number</label>
            <input 
              type="text" 
              className="form-control"
              name="room_number"
              placeholder="e.g., 101"
              value={formData.room_number}
              onChange={handleChange}
              required
            />
          </div>

          {/* Bed Count (Numeric Input) */}
          <div className="mb-3">
            <label className="form-label font-weight-bold">Bed Count</label>
            <input 
              type="number" 
              className="form-control"
              name="bed_count"
              min="1"
              value={formData.bed_count}
              onChange={handleChange}
              required
            />
          </div>

          {/* Bed Type (Dropdown) */}
          <div className="mb-3">
            <label className="form-label font-weight-bold">Bed Type</label>
            <select 
              className="form-select"
              name="bed_type"
              value={formData.bed_type}
              onChange={handleChange}
            >
              <option value="King">King</option>
              <option value="Queen">Queen</option>
              <option value="Twin">Twin</option>
              <option value="Double">Single</option>
            </select>
          </div>

          {/* Price Type (Dropdown) */}
          <div className="mb-3">
            <label className="form-label font-weight-bold">Price Type</label>
            <select 
              className="form-select"
              name="price_type"
              value={formData.price_type}
              onChange={handleChange}
            >
              <option value="per night">Per Night</option>
              <option value="Member">Member</option>
              <option value="Holiday/Peak">Holiday/Peak</option>
            </select>
          </div>

          {/* Price Per Night (Decimal Input) */}
          <div className="mb-3">
            <label className="form-label font-weight-bold">Price Per Night</label>
            <div className="input-group">
              <span className="input-group-text">$</span>
              <input 
                type="number" 
                step="0.01" 
                className="form-control"
                name="price_per_night"
                placeholder="0.00"
                value={formData.price_per_night}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Status (Dropdown) */}
          <div className="mb-4">
            <label className="form-label font-weight-bold">Initial Status</label>
            <select 
              className="form-select"
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="Available">Available</option>
              <option value="Occupied">Occupied</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>

          {/* Submit Button */}
          <button type="submit" className="btn btn-primary w-100 py-2">
            Save New Room
          </button>
        </form>
      </div>
    </div>
  );
}

