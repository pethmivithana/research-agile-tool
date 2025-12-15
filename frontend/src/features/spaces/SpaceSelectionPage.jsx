"use client"
import { useQuery } from "@tanstack/react-query"
import { SpacesApi } from "../../api/spacesApi.js"
import { useNavigate } from "react-router-dom"

export default function SpaceSelectionPage() {
  const navigate = useNavigate()

  const { data: spaces = [], isLoading } = useQuery({
    queryKey: ["spaces"],
    queryFn: async () => {
      const { data } = await SpacesApi.list()
      return data
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-600">Loading workspaces...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 px-4 py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Choose your workspace</h1>
          <p className="text-lg text-slate-600">Select a workspace or create a new one to get started</p>
        </div>

        {/* Spaces Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {spaces.map((space) => (
            <button
              key={space._id}
              onClick={() => navigate(`/spaces/${space._id}/backlog`)}
              className="card hover:shadow-xl transition-all duration-200 hover:scale-105 p-6 text-left group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <span className="badge badge-blue">Active</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{space.name}</h3>
              <p className="text-sm text-slate-500 mb-4">Created {new Date(space.createdAt).toLocaleDateString()}</p>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                <span>{(space.collaborators?.length || 0) + 1} members</span>
              </div>
            </button>
          ))}

          {/* Create New Space Card */}
          <button
            onClick={() => navigate("/create-space")}
            className="card hover:shadow-xl transition-all duration-200 hover:scale-105 p-6 border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50 flex flex-col items-center justify-center text-center min-h-[200px]"
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Create New Workspace</h3>
            <p className="text-sm text-slate-600">Start a fresh workspace for your team</p>
          </button>
        </div>

        {/* Empty State */}
        {spaces.length === 0 && (
          <div className="card text-center py-16 shadow-lg">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">No workspaces yet</h3>
            <p className="text-slate-600 mb-6">Create your first workspace to start managing your agile projects</p>
            <button onClick={() => navigate("/create-space")} className="btn btn-primary px-8">
              Create Your First Workspace
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
