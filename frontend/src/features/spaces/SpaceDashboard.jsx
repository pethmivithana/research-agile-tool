"use client"

import { NavLink, Outlet, useParams, useNavigate } from "react-router-dom"
import SprintSidebar from "../sprints/SprintSidebar.jsx"
import VelocityPanel from "../analytics/VelocityPanel.jsx"
import { useQuery } from "@tanstack/react-query"
import { api } from "../../api/axiosClient.js"

export default function SpaceDashboard() {
  const { spaceId } = useParams()
  const navigate = useNavigate()

  const { data: space } = useQuery({
    queryKey: ["space", spaceId],
    queryFn: async () => {
      const { data } = await api.get(`/spaces/${spaceId}`)
      return data
    },
    enabled: !!spaceId,
  })

  const tabs = [
    { to: `/spaces/${spaceId}/backlog`, label: "Backlog" },
    { to: `/changes`, label: "Requirement Tracker" },
    { to: `/analytics/${spaceId}`, label: "Analytics" },
    { to: "#", label: "Models & AI", disabled: true },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate("/spaces")} className="btn btn-ghost p-2" title="Back to workspaces">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">{space?.name || "Workspace"}</h1>
                  <p className="text-xs text-slate-500">Agile Project Management</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="btn btn-ghost">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </button>
              <button className="btn btn-ghost">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-2.573 1.066c-.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-1 mt-4 border-b border-slate-200">
            {tabs.map((t) => (
              <NavLink
                key={t.label}
                to={t.to}
                className={({ isActive }) =>
                  `px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                    t.disabled
                      ? "opacity-50 pointer-events-none text-slate-400"
                      : isActive
                        ? "bg-slate-100 text-blue-600 border-b-2 border-blue-600"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`
                }
              >
                {t.label}
              </NavLink>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-80 bg-white border-r border-slate-200 h-[calc(100vh-140px)] overflow-auto">
          <div className="p-4">
            <SprintSidebar />
            <div className="mt-6">
              <VelocityPanel />
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto h-[calc(100vh-140px)]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
