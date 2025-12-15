"use client"

import { useState } from "react"
import { useDispatch } from "react-redux"
import { setAuth } from "./authSlice.js"
import { api } from "../../api/axiosClient.js"
import { useNavigate, Link } from "react-router-dom"

export default function SignupPage() {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const dispatch = useDispatch()
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data } = await api.post("/auth/signup", { username, email, password })
      localStorage.setItem("token", data.token)
      dispatch(setAuth({ token: data.token, user: data.user }))
      navigate("/create-space")
    } catch (err) {
      setError(err.response?.data?.error || "Signup failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Create your account</h1>
          <p className="text-slate-600 mt-2">Start managing projects the agile way</p>
        </div>

        {/* Signup Form */}
        <div className="card shadow-xl">
          <form onSubmit={submit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>
            )}

            <div>
              <label className="label">Username</label>
              <input
                type="text"
                className="input"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <p className="text-xs text-slate-500 mt-1">Must be at least 6 characters</p>
            </div>

            <button type="submit" className="btn btn-primary w-full py-3 text-base font-semibold" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </button>

            <div className="text-center text-sm text-slate-600 pt-2">
              Already have an account?{" "}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
