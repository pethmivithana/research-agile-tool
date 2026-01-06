import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import LoginPage from "./features/auth/LoginPage.jsx"
import SignupPage from "./features/auth/SignupPage.jsx"
import RequireAuth from "./features/auth/RequireAuth.jsx"
import CreateSpacePage from "./features/spaces/CreateSpacePage.jsx"
import SpaceDashboard from "./features/spaces/SpaceDashboard.jsx"
import BacklogPage from "./features/backlog/BacklogPage.jsx"
import BoardPage from "./features/board/BoardPage.jsx"
import RequirementChangePage from "./features/changes/RequirementChangePage.jsx"
import ChangeAnalyticsDashboard from "./features/analytics/ChangeAnalyticsDashboard.jsx"
import SpaceSelectionPage from "./features/spaces/SpaceSelectionPage.jsx"
import { SpaceProvider } from "./context/SpaceContext.jsx"

export default function App() {
  return (
    <BrowserRouter>
      <SpaceProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route element={<RequireAuth />}>
            <Route path="/spaces" element={<SpaceSelectionPage />} />
            <Route path="/create-space" element={<CreateSpacePage />} />
            <Route path="/spaces/:spaceId" element={<SpaceDashboard />}>
              <Route index element={<Navigate to="backlog" replace />} />
              <Route path="backlog" element={<BacklogPage />} />
              <Route path="board/:sprintId" element={<BoardPage />} />
              <Route path="changes" element={<RequirementChangePage />} />
              <Route path="analytics" element={<ChangeAnalyticsDashboard />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </SpaceProvider>
    </BrowserRouter>
  )
}
