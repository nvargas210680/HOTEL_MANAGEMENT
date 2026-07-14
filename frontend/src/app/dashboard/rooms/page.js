"use client";

import { useState, useEffect } from 'react';

export default function RoomsPage() {
  // 1. Initialize state as an empty array
  const [data, setData] = useState([]);

  useEffect(() => {
    // 2. Create an internal async function
    const fetchRooms = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/rooms/');
        const roomsJson = await response.json();
        
        // 3. Save the data to state once it arrives
        setData(roomsJson);
      } catch (error) {
        console.error("Error fetching rooms:", error);
      }
    };

    // 4. Execute the fetch function
    fetchRooms();
  }, []);

  const handleStatusChange = async (roomId, newStatus) => {
  // 1. Instantly update the local whiteboard (UI) so it looks fast to the user
  const updatedRooms = data.map(room => 
    room.room_id === roomId ? { ...room, status: newStatus } : room
  );
  setData(updatedRooms);

  // 2. Pack the data up and send it to Django via the network
  try {
    await fetch(`http://127.0.0.1:8000/api/rooms/${roomId}/`, {
      method: 'PATCH', // PATCH means "only update the fields I send you"
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: newStatus }), // Convert our JavaScript object to a JSON string
    });
  } catch (error) {
    console.error("Failed to update status on the server:", error);
  }
};

    return(

    
<div 
   className="py-5" 
    style={{
  backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('/images/hotel_palms.jpg')`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',

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
            <p className="card-text"><strong>Bed Type:</strong> {room.bed_count} x {room.bed_type}</p>
            <p className="card-text"><strong>Rate Type:</strong> {room.price_type}</p>
            <p className="card-text"><strong>Price:</strong> ${room.price_per_night} / night</p>
            <p className="card-text">
            <strong>Status:</strong> 
            <select 
            className="form-select form-select-sm mt-1" 
            value={room.status}
            onChange={(e) => handleStatusChange(room.room_id, e.target.value)}
           >
            <option value="Available">Available</option>
            <option value="Occupied">Occupied</option>
            <option value="Maintenance">Maintenance</option>
            </select>
            </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
  </div>
)}

   