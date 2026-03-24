'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { analyzeSymptoms, commonSymptoms } from '@/lib/symptomChecker'

export default function SymptomCheckerPage() {
  const [symptoms, setSymptoms] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalContent, setModalContent] = useState(null)
  const [activeIndex, setActiveIndex] = useState(-1)
  const textareaRef = useRef(null)

  const handleAnalyze = async (e) => {
    e.preventDefault()
    
    if (!symptoms.trim()) {
      return
    }

    setLoading(true)
    setShowSuggestions(false)

    try {
      const analysisResult = await analyzeSymptoms(symptoms)
      setResult(analysisResult)
    } catch (error) {
      setResult({
        success: false,
        error: 'Failed to analyze symptoms. Please try again.'
      })
    }

    setLoading(false)
  }

  const addSymptom = (symptom) => {
    setShowSuggestions(false)

    setSymptoms(prev => {
      const lower = prev.toLowerCase()
      if (lower.split(',').map(s => s.trim()).includes(symptom.toLowerCase())) return prev

      // Replace the last fragment (after the last comma) if user typed partial text
      if (!prev) return symptom
      const lastComma = prev.lastIndexOf(',')
      if (lastComma === -1) return symptom
      // Keep everything up to last comma and add the chosen symptom
      const prefix = prev.slice(0, lastComma + 1)
      return `${prefix} ${symptom}`
    })

    // reset active index and return focus to textarea
    setActiveIndex(-1)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const removeSymptom = (index) => {
    const symptomsArray = symptoms.split(',').map(s => s.trim())
    symptomsArray.splice(index, 1)
    setSymptoms(symptomsArray.join(', '))
  }

  const filteredSuggestions = showSuggestions && symptoms.length > 0
    ? commonSymptoms.filter(s =>
        s.toLowerCase().includes(symptoms.split(',').pop().trim().toLowerCase()) &&
        !symptoms.toLowerCase().includes(s.toLowerCase())
      ).slice(0, 5)
    : []

  const handleKeyDown = (e) => {
    if (!showSuggestions || filteredSuggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(prev => (prev + 1) % filteredSuggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(prev => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length)
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && filteredSuggestions[activeIndex]) {
        e.preventDefault()
        addSymptom(filteredSuggestions[activeIndex])
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setActiveIndex(-1)
    }
  }

  return (
    <div
      className="min-h-screen bg-linear-to-br from-teal-900 to-blue-900"
      style={{ backgroundImage: "linear-gradient(rgba(2,6,23,0.6), rgba(2,6,23,0.6)), url('/image.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {/* Navbar */}
      <nav className="flex justify-between items-center px-6 py-4 bg-transparent backdrop-blur-sm">
        <Link href="/book" className="text-xl font-bold text-white hover:text-teal-200 transition">
          ← Dashboard
        </Link>
        <h1 className="text-xl font-bold text-shadow-blue-500">AI Symptom Checker</h1>
        <div className="w-20"></div>
      </nav>

      <div className="max-w-2xl mx-auto p-6">
        {/* Info Banner */}
        <div className="bg-linear-to-r from-teal-50 to-blue-50 border border-teal-200 text-teal-900 p-4 rounded-lg mb-6 shadow-lg/10">
          <p className="font-semibold mb-2">⚠️ Medical Disclaimer</p>
          <p className="text-sm">This tool is for informational purposes only and is not a substitute for professional medical advice. Always consult with a healthcare provider for accurate diagnosis and treatment.</p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleAnalyze} className="bg-slate-blue/60 p-6 rounded-lg mb-6 backdrop-blur-sm border border-white-700 transform transition-transform hover:scale-[1.01] hover:shadow-2xl">
          <label className="block text-white font-semibold mb-3">
            Describe Your Symptoms
          </label>
          
          <div className="relative mb-4">
            <textarea
              ref={textareaRef}
              value={symptoms}
              onChange={(e) => {
                setSymptoms(e.target.value)
                setShowSuggestions(true)
                setActiveIndex(-1)
              }}
              onKeyDown={handleKeyDown}
              onBlur={() => setTimeout(() => { setShowSuggestions(false); setActiveIndex(-1) }, 200)}
              placeholder="e.g., headache, fever, cough, sore throat"
              className="w-full p-3 bg-white-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-black-400 placeholder-gray-400 min-h-24 transition-shadow focus:shadow-outline"
            />

            {/* Suggestions Dropdown */}
            {filteredSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-slate-700 border border-slate-600 rounded-lg mt-1 z-10">
                {filteredSuggestions.map((suggestion, idx) => (
                  <button
                    key={suggestion}
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseLeave={() => setActiveIndex(-1)}
                    onClick={() => { addSymptom(suggestion); setShowSuggestions(false); setActiveIndex(-1) }}
                    className={`w-full text-left px-4 py-2 text-gray-200 text-sm transition ${activeIndex === idx ? 'bg-slate-600' : 'hover:bg-slate-600'}`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Symptoms Tags */}
          {symptoms && (
            <div className="flex flex-wrap gap-2 mb-4">
              {symptoms.split(',').map((symptom, idx) => {
                const trimmed = symptom.trim()
                return trimmed ? (
                  <div
                    key={idx}
                    className="bg-linear-to-r from-teal-600/30 to-blue-600/30 px-3 py-1 rounded-full text-sm flex items-center gap-2 text-white shadow-sm hover:scale-105 transition-transform cursor-default"
                  >
                    <span>{trimmed}</span>
                    <button
                      type="button"
                      onClick={() => removeSymptom(idx)}
                      className="text-lg leading-none hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                ) : null
              })}
            </div>
          )}

          {/* Quick Add Common Symptoms */}
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-2">Quick add common symptoms:</p>
            <div className="flex flex-wrap gap-2">
              {['fever', 'cough', 'headache', 'sore throat', 'fatigue', 'nausea'].map(symptom => (
                <button
                  key={symptom}
                  type="button"
                  onClick={() => addSymptom(symptom)}
                  className="px-3 py-1 bg-teal-700 hover:bg-teal-600 text-white text-sm rounded transition shadow-sm hover:scale-105"
                >
                  + {symptom}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !symptoms.trim()}
            className="w-full py-3 bg-linear-to-r from-teal-600 to-blue-600 hover:opacity-90 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition shadow-md hover:shadow-lg active:scale-95"
          >
            {loading ? 'Analyzing...' : 'Analyze Symptoms'}
          </button>
        </form>

        {/* Results */}
        {result && (
          <div className="bg-slate-800 p-6 rounded-lg">
            {result.success ? (
              <>
                {/* Severity Badge */}
                <div className="mb-6">
                  <p className="text-gray-400 text-sm mb-2">Severity Level</p>
                  <div className="flex items-center gap-3">
                    <div className={`px-4 py-2 rounded-lg font-semibold text-white ${
                      result.analysis.severity === 'high' ? 'bg-red-600' :
                      result.analysis.severity === 'medium' ? 'bg-yellow-600' :
                      'bg-green-600'
                    }`}>
                      {result.analysis.severity.toUpperCase()}
                    </div>
                    {result.analysis.urgency && (
                      <div className="bg-red-500/20 border border-red-500 text-red-300 px-3 py-1 rounded text-sm">
                        🚨 Seek urgent care
                      </div>
                    )}
                  </div>
                </div>

                {/* Possible Conditions */}
                <div className="mb-6">
                  <h3 className="text-white font-semibold mb-3">Possible Conditions</h3>
                  <div className="space-y-3">
                    {result.analysis.possibleConditions.map((condition, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-700/50 p-4 rounded-lg transform transition hover:scale-[1.02] hover:shadow-xl cursor-pointer"
                        onClick={() => { setModalContent(condition); setModalOpen(true) }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setModalContent(condition); setModalOpen(true) } }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-white font-semibold capitalize">{condition.condition}</h4>
                          <span className="bg-linear-to-r from-teal-600/30 to-blue-600/30 px-2 py-1 rounded text-xs text-white">
                            {condition.confidence}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm mb-2">Recommended specialists:</p>
                        <div className="flex flex-wrap gap-2">
                          {condition.specialists.map((specialist, sidx) => (
                            <span
                              key={sidx}
                              className="bg-teal-600/20 text-teal-200 px-3 py-1 rounded text-xs"
                            >
                              {specialist}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Advice */}
                <div className="bg-teal-500/10 border border-teal-500 text-teal-100 p-4 rounded-lg mb-6">
                  <p className="font-semibold mb-2">💡 Recommendation</p>
                  <p className="text-sm">{result.analysis.advice}</p>
                </div>

                {/* Book Appointment Button */}
                {!result.analysis.urgency && (
                  <Link
                    href="/book"
                    className="block w-full text-center py-3 bg-linear-to-r from-teal-600 to-blue-600 hover:opacity-90 text-white font-semibold rounded-lg transition"
                  >
                    Book an Appointment
                  </Link>
                )}
              </>
            ) : (
              <div className="text-red-300">
                <p>{result.error}</p>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Modal for condition details */}
      {modalOpen && modalContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white/95 max-w-xl w-full mx-4 p-6 rounded-lg shadow-2xl">
            <button className="absolute top-3 right-3 text-gray-700" onClick={() => setModalOpen(false)}>✕</button>
            <h3 className="text-xl font-bold text-slate-900 mb-2">{modalContent.condition}</h3>
            <p className="text-sm text-slate-700 mb-4">Confidence: <span className="font-semibold">{modalContent.confidence}</span></p>
            <p className="text-slate-700 mb-4">{modalContent.description || 'No additional details available.'}</p>
            <div className="flex flex-wrap gap-2">
              {(modalContent.specialists || []).map((s, i) => (
                <span key={i} className="bg-teal-600/10 text-teal-700 px-3 py-1 rounded text-xs">{s}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

