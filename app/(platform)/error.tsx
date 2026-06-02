"use client";

import { useEffect } from "react";

export default function PlatformError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Platform page error]", error);
  }, [error]);

  return (
    <div className="p-8 flex items-center justify-center min-h-[60vh]">
      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm px-8 py-10 max-w-md w-full text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-[#1A1A2E] mb-1">Something went wrong</h2>
        <p className="text-sm text-[#6B7280] mb-6">
          {error.message || "An unexpected error occurred while loading this page."}
        </p>
        <button
          onClick={reset}
          className="px-5 py-2.5 text-sm bg-[#1E3A5F] hover:bg-[#162d4a] text-white rounded-lg font-medium transition"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
