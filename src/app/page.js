'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-6 md:px-12 py-4 bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-linear-to-br from-teal-500 to-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">♥</span>
          </div>
          <h1 className="text-2xl font-bold text-teal-600">MEDIBOOK</h1>
        </div>
        <Link
          href="/login"
          className="px-6 py-2 bg-linear-to-r from-teal-600 to-blue-600 text-white rounded-lg font-semibold hover:opacity-90 transition"
        >
          LOGIN
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="flex items-center justify-between px-6 md:px-12 py-20 max-w-7xl mx-auto gap-12">
        <div className="flex-1">
          <h2 className="text-6xl font-bold mb-6 leading-tight">
            Your Health, <span className="text-teal-600">Just a<br />Click Away</span>
          </h2>
          <p className="text-gray-600 text-lg mb-8 leading-relaxed">
            Book appointments with top doctors, manage your health records, and get instant AI-powered symptom analysis.
          </p>
          <div className="flex gap-4 mb-12">
            <button
              onClick={() => router.push('/book')}
              className="px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition"
            >
              Book Appointment
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-teal-600 border border-teal-700 text-white rounded-lg font-semibold hover:bg-teal-700 transition"
            >
              Track Guest Booking
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8">
            <div>
              <div className="text-4xl font-bold text-teal-600 mb-2">500+</div>
              <div className="text-gray-600">Expert Doctors</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-teal-600 mb-2">10k+</div>
              <div className="text-gray-600">Happy Patients</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-teal-600 mb-2">20+</div>
              <div className="text-gray-600">Specializations</div>
            </div>
          </div>
        </div>
        <div className="flex-1 hidden md:block">
          <div className="relative">
            <img 
              src="/Screenshot 2026-02-07 163117.png"
              alt="Medical Team"
              className="w-full h-96 object-cover rounded-3xl shadow-lg"
            />
          </div>
        </div>
      </section>

      {/* Why Choose MediBook */}
      <section className="px-6 md:px-12 py-20 bg-linear-to-b from-white to-blue-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">Why Choose MediBook?</h2>
          <p className="text-gray-600 text-center mb-16">Experience healthcare like never before</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="text-xl font-bold mb-3">Easy Booking</h3>
              <p className="text-gray-600">Book appointments in seconds with real-time doctor availability</p>
            </div>

            {/* Card 2 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition">
              <div className="text-4xl mb-4">✓</div>
              <h3 className="text-xl font-bold mb-3">Verified Doctors</h3>
              <p className="text-gray-600">All doctors are verified and approved by our medical board</p>
            </div>

            {/* Card 3 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition">
              <div className="text-4xl mb-4">⏰</div>
              <h3 className="text-xl font-bold mb-3">24/7 Support</h3>
              <p className="text-gray-600">Round-the-clock customer support for all your queries</p>
            </div>

            {/* Card 4 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-xl font-bold mb-3">Digital Prescriptions</h3>
              <p className="text-gray-600">Get and manage all your prescriptions digitally</p>
            </div>

            {/* Card 5 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition">
              <div className="text-4xl mb-4">❤️</div>
              <h3 className="text-xl font-bold mb-3">AI Symptom Checker</h3>
              <p className="text-gray-600">Get instant preliminary diagnosis with our AI-powered tool</p>
            </div>

            {/* Card 6 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-bold mb-3">Secure & Private</h3>
              <p className="text-gray-600">Your health data is encrypted and completely secure</p>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Specializations */}
      <section className="px-6 md:px-12 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">Popular Specializations</h2>
          <p className="text-gray-600 text-center mb-16">Find the right specialist for your needs</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: 'Cardiology', icon: '/Screenshot 2026-02-07 155312.png' },
              { name: 'Dermatology', icon: '/Screenshot 2026-02-07 155632.png' },
              { name: 'Neurology', icon: '/Screenshot 2026-02-07 160315.png' },
              { name: 'Orthopedic', icon: '/Screenshot 2026-02-07 160805.png' },
              { name: 'Pediatrics', icon: '/Screenshot 2026-02-07 161416.png' },
              { name: 'Gynecology', icon: '/Screenshot 2026-02-07 161809.png' },
              { name: 'Dentistry', icon: '/Screenshot 2026-02-07 161912.png' },
              { name: 'Ophthalmology', icon: '/Screenshot 2026-02-07 162050.png' }
            ].map((spec) => (
              <div key={spec.name} className="bg-blue-50 p-8 rounded-2xl text-center hover:bg-blue-100 transition cursor-pointer group overflow-hidden">
                <img 
                  src={spec.icon} 
                  alt={spec.name}
                  className="w-24 h-24 mx-auto mb-4 object-cover rounded-lg group-hover:scale-110 transition-transform"
                />
                <h3 className="font-bold text-gray-900">{spec.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 md:px-12 py-20 bg-linear-to-r from-teal-600 to-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Book Your Appointment?</h2>
          <p className="text-white/90 text-lg mb-8">No registration needed! Book your appointment instantly with MediBook</p>
          <button
            onClick={() => router.push('/book')}
            className="px-8 py-3 bg-white text-teal-600 rounded-lg font-semibold hover:bg-gray-50 transition"
          >
            Book Your Appointment Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 px-6 md:px-12 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-linear-to-br from-teal-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">♥</span>
                </div>
                <h3 className="font-bold text-lg">MediBook</h3>
              </div>
              <p className="text-gray-600 text-sm">Your trusted healthcare partner for online doctor appointments.</p>
            </div>
            <div>
              <h4 className="font-bold mb-4">For Patients</h4>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li><a href="/book" className="hover:text-teal-600">Find Doctors</a></li>
                <li><a href="/book" className="hover:text-teal-600">Book Appointment</a></li>
                <li><a href="/symptom-checker" className="hover:text-teal-600">AI Symptom Checker</a></li>
                <li><a href="/login" className="hover:text-teal-600">Prescriptions</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">For Doctors</h4>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li><a href="/register" className="hover:text-teal-600">Register as Doctor</a></li>
                <li><a href="/doctor-login" className="hover:text-teal-600">Manage Appointments</a></li>
                <li><a href="/dashboard" className="hover:text-teal-600">Patient Records</a></li>
                <li><a href="/login" className="hover:text-teal-600">Login as Doctor</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li><a href="#" className="hover:text-teal-600">Help Center</a></li>
                <li><a href="#" className="hover:text-teal-600">Contact Us at:</a></li>
                <li><a href="#" className="hover:text-blue-600">+91 204-12345678</a></li>
                <li><a href="#" className="hover:text-red-600">medibook1@gmail.com</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-300 pt-8 text-center text-gray-600 text-sm">
            <p>© 2026 MediBook. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}

