"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';



export default function DashboardPage() {

  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);


useEffect(() => {
  // 1. Look for the token in localStorage
  const token = localStorage.getItem('accessToken');
  
  // 2. If the token does NOT exist, redirect to login
  if (!token) {
    router.push('/login');
  } else {
    setIsLoading(false);
  }
}, [router]);

const handleLogout = () => {
    // 1. Wipe the Next.js client-side storage
    localStorage.removeItem('accessToken');
    router.push('/login');
}

if (isLoading) return <p>Loading...</p>;

  return (

    <div style={{ padding: '2rem' }}>
      <h1>Staff Dashboard</h1>
      <p>Welcome! You have successfully logged in.</p>
      <button 
        onClick={handleLogout} 
        style={{ padding: '0.5rem 1rem', background: 'red', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        Logout
      </button>

    </div>
  );
}


