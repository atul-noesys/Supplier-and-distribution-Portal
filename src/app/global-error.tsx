"use client";

export const runtime = 'edge';

import GlobalErrorResetButton from '../components/GlobalErrorResetButton';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Something went wrong!</h2>
          <GlobalErrorResetButton reset={reset} />
        </div>
      </body>
    </html>
  );
}
