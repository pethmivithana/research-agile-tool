"use client"

import { useEffect, useState } from "react"
import { Droppable } from "react-beautiful-dnd"

export const StrictModeDroppable = ({ children, droppableId, ...props }) => {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true))
    return () => {
      cancelAnimationFrame(animation)
      setEnabled(false)
    }
  }, [])

  if (!enabled) {
    return null
  }

  return (
    <Droppable droppableId={droppableId} {...props}>
      {children}
    </Droppable>
  )
}

StrictModeDroppable.displayName = "StrictModeDroppable"
