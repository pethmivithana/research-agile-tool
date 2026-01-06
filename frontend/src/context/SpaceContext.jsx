"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { useParams } from "react-router-dom"

const SpaceContext = createContext()

export function SpaceProvider({ children }) {
  const { spaceId } = useParams()
  const [currentSpaceId, setCurrentSpaceId] = useState(spaceId)

  useEffect(() => {
    if (spaceId) {
      setCurrentSpaceId(spaceId)
    }
  }, [spaceId])

  return (
    <SpaceContext.Provider value={{ spaceId: currentSpaceId, setCurrentSpaceId }}>{children}</SpaceContext.Provider>
  )
}

export function useSpaceContext() {
  const context = useContext(SpaceContext)
  if (!context) {
    // We return a fallback object to avoid crashes if used outside provider
    return { spaceId: null, setCurrentSpaceId: () => {} }
  }
  return context
}
