import { useSelector } from "react-redux"
import { Outlet, Navigate } from "react-router-dom"

export default function RequireAuth() {
  const token = useSelector((s) => s.auth.token)
  return token ? <Outlet /> : <Navigate to="/login" />
}
