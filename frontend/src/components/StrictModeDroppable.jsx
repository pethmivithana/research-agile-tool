"use client"

import { useEffect, useState } from "react"
import { Droppable } from "react-beautiful-dnd"

<<<<<<< HEAD
export const StrictModeDroppable = ({ children, droppableId, ...props }) => {
=======
export const StrictModeDroppable = ({ children, ...props }) => {
>>>>>>> 331fde8aafb86603570aed680dd22ebe4747557a
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

<<<<<<< HEAD
  return (
    <Droppable droppableId={droppableId} {...props}>
      {children}
    </Droppable>
  )
}

StrictModeDroppable.displayName = "StrictModeDroppable"
=======
  return <Droppable {...props}>{children}</Droppable>
}
>>>>>>> 331fde8aafb86603570aed680dd22ebe4747557a
