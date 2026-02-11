import { useSelector } from "react-redux"
import { Outlet, Navigate } from "react-router-dom"
import { useEffect, useState } from "react"

export default function RequireAuth() {
  const token = useSelector((s) => s.auth.token)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if token exists in localStorage (for page refresh scenarios)
    const storedToken = localStorage.getItem('token')
    // Component will re-render when Redux state updates
    setIsLoading(false)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return token ? <Outlet /> : <Navigate to="/login" replace />
}
