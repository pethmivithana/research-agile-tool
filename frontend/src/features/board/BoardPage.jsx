"use client"

import { useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { DragDropContext, Draggable } from "react-beautiful-dnd"
import { StrictModeDroppable } from "../../components/StrictModeDroppable"
import { api } from "../../api/axiosClient.js"

const columnGroups = {
  "To Do": ["To Do", "Triaged", "Design WIP"],
  "In Progress": ["In Progress", "Design Review"],
  "In Review": ["In Review", "Ready for Development"],
  Done: ["Done", "Fixed"],
}

const mainColumns = Object.keys(columnGroups)

export default function BoardPage() {
  const { sprintId } = useParams()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["board", sprintId],
    queryFn: async () => {
      const res = await api.get(`/sprints/${sprintId}/board`)
      return res.data
    },
    enabled: !!sprintId,
  })

  const moveMut = useMutation({
    mutationFn: ({ workItemId, toCol }) => api.post("/board/move", { workItemId, toCol }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["board", sprintId] })
    },
  })

  const onDragEnd = async (result) => {
    const { draggableId, source, destination } = result
    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) return

    const oldData = qc.getQueryData(["board", sprintId])
    if (!oldData) return

    // Find the item to determine its type and mapping
    const item = Object.values(oldData)
      .flat()
      .find((i) => i._id === draggableId)
    if (!item) return

    // Map high-level column to work-type specific status
    const targetStatusMapping = {
      Bug: { "To Do": "Triaged", Done: "Fixed" },
      Story: {
        "To Do": "Design WIP",
        "In Progress": "Design Review",
        "In Review": "Ready for Development",
      },
    }

    const targetStatus = targetStatusMapping[item.type]?.[destination.droppableId] || destination.droppableId

    // Optimistic Update
    const newData = JSON.parse(JSON.stringify(oldData))
    // Remove from source
    Object.keys(newData).forEach((col) => {
      newData[col] = newData[col].filter((i) => i._id !== draggableId)
    })
    // Add to target (backend will handle the actual group logic, we just move to the target key for UI)
    if (!newData[targetStatus]) newData[targetStatus] = []
    newData[targetStatus].splice(destination.index, 0, { ...item, status: targetStatus })

    qc.setQueryData(["board", sprintId], newData)

    try {
      await moveMut.mutateAsync({ workItemId: draggableId, toCol: targetStatus })
    } catch (error) {
      qc.setQueryData(["board", sprintId], oldData)
      console.error("[v0] Board move failed", error)
    }
  }

  // Group items into the 4 main columns for the UI
  const groupedItems = mainColumns.reduce((acc, col) => {
    acc[col] = []
    columnGroups[col].forEach((status) => {
      if (data?.[status]) acc[col].push(...data[status])
    })
    return acc
  }, {})

  const getPriorityColor = (priority) => {
    const colors = {
      Highest: "border-red-600",
      High: "border-orange-500",
      Medium: "border-amber-400",
      Low: "border-blue-500",
      Lowest: "border-zinc-600",
    }
    return colors[priority] || colors.Medium
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm font-bold uppercase tracking-wider">
        Loading Board...
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col space-y-6 bg-gray-50">
      <div className="flex justify-between items-end px-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Kanban Board</h2>
          <p className="text-sm text-gray-600 mt-1">Sprint cycle management • Live sync</p>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 flex gap-4 px-4 overflow-x-auto pb-4">
          {mainColumns.map((col) => (
            <div
              key={col}
              className="flex-shrink-0 w-80 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm"
            >
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-xl">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">{col}</h3>
                <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
                  {groupedItems[col]?.length || 0}
                </span>
              </div>

              <StrictModeDroppable droppableId={col}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`flex-1 p-3 space-y-3 transition-colors min-h-[200px] ${
                      snapshot.isDraggingOver ? "bg-blue-50" : ""
                    }`}
                  >
                    {groupedItems[col]?.map((item, i) => (
                      <Draggable key={item._id} draggableId={item._id} index={i}>
                        {(prov, snap) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
                            className={`group bg-white border-2 rounded-lg p-3 shadow-md transition-all cursor-grab active:cursor-grabbing ${
                              snap.isDragging
                                ? "ring-2 ring-blue-400 rotate-1 scale-105 z-50 shadow-xl"
                                : "hover:shadow-lg hover:border-gray-300"
                            } border-l-4 ${getPriorityColor(item.priority).replace("border-", "border-l-")}`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide bg-gray-100 px-2 py-0.5 rounded">
                                {item.type}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {item.storyPoints && (
                                  <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                    {item.storyPoints} SP
                                  </span>
                                )}
                              </div>
                            </div>

                            <h4 className="text-sm font-semibold text-gray-900 leading-snug mb-3 line-clamp-2">
                              {item.title}
                            </h4>

                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                              <div className="flex -space-x-2">
                                <div className="w-6 h-6 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">
                                  {item.assignee?.name?.[0] || "?"}
                                </div>
                              </div>
                              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                                {item.status}
                              </span>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </StrictModeDroppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  )
}
