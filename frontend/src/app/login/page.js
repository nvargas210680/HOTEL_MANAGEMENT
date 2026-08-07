"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function LoginPage() {

    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

  useEffect(() => {
  const token = localStorage.getItem('accessToken');
  const storedUser = localStorage.getItem('user');

  if (token && storedUser) {
    const user = JSON.parse(storedUser);
    if (user.is_staff) {
      router.push('/dashboard');
    } else {
      router.push('/my-bookings');
    }
  }
}, [router]);

    const handleSubmit = async (e) => {
  e.preventDefault();
    

  try {
    
    const response = await fetch('http://127.0.0.1:8000/api/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username,
        password: password,
      }),
    });

    
    const data = await response.json();

    if (response.ok) {
  console.log('Login successful! Response data:', data);
  
  
  localStorage.setItem('accessToken', data.access);
  
  
  localStorage.setItem('user', JSON.stringify({
    username: data.username,
    is_staff: data.is_staff,
    first_name: data.first_name,
  }));

  
  if (data.is_staff) {
    router.push('/dashboard');       
  } else {
    router.push('/my-bookings');     
  }
}

  } catch (error) {
    console.error('Network error connecting to Django:', error);
    alert('Could not connect to the backend server.');
  }
};

  return (

<div 
   className="min-vh-100 d-flex align-items-center justify-content-center"
    style={{
  backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('/images/hotel_palms.jpg')`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',

    }}
    >
      
      <div className="card p-4 shadow-lg text-dark" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 className="text-center mb-4 fw-bold">Sign In</h2>
      

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label fw-semibold">Username</label>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Enter your username" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label className="form-label fw-semibold">Password</label>
          <input 
            type="password" 
            className="form-control" 
            placeholder="Enter your password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="btn btn-primary w-100 mt-2">
            Login
        </button>
         <div className="text-center mt-3">
         <span className="text-muted small">Don't have an account? </span>
          <Link href="/register" className="text-decoration-none fw-semibold">
            Create Account
         </Link>
        </div>
       </form> 
      </div>

    </div>

  );
}