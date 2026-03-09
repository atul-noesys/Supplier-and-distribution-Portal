"use client";

export default function GlobalErrorResetButton({ reset }: { reset: () => void }) {
  return (
    <button
      onClick={() => reset()}
      style={{
        padding: '8px 12px',
        borderRadius: 4,
        border: '1px solid #ccc',
        background: '#fff',
        cursor: 'pointer',
      }}
    >
      Try again
    </button>
  );
}
