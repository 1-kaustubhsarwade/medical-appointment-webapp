'use client'

import { Suspense } from 'react'
import CheckEmailContent from './content'

export default function CheckEmailPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CheckEmailContent />
    </Suspense>
  )
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 to-black">
      <div className="w-full max-w-md bg-slate-800 text-white p-8 rounded-xl shadow-lg text-center">
        <div className="mb-6">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
        <h1 className="text-2xl font-bold mb-4">Verifying Email</h1>
        <p className="text-gray-400">Checking email confirmation...</p>
      </div>
    </div>
  )
}

