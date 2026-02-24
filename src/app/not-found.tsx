import React from 'react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Page Not Found</h2>
      <p style={{ marginBottom: '30px', color: '#666' }}>
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link href="/" style={{ color: '#0070f3', textDecoration: 'none' }}>
        Return to Home
      </Link>
    </div>
  )
}
