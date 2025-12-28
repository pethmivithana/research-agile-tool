"use client"

import { useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd"
import { api } from "../../api/axiosClient.js"

const columns = ["To Do", "In Progress", "In Review", "Done"]

export default function BoardPage() {
  const { sprintId } = useParams()
  const qc = useQueryClient()

  const { data, refetch } = useQuery({
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
    const { draggableId, destination } = result
    if (!destination) return
    await moveMut.mutateAsync({ workItemId: draggableId, toCol: destination.droppableId })
  }

  const itemsByCol = data || { "To Do": [], "In Progress": [], "In Review": [], Done: [] }

  const getPriorityColor = (priority) => {
    const colors = {
      Highest: "border-red-500",
      High: "border-orange-500",
      Medium: "border-yellow-500",
      Low: "border-blue-500",
      Lowest: "border-slate-500",
    }
    return colors[priority] || colors.Medium
  }

  const getTypeIcon = (type) => {
    if (type === "Bug")
      return (
        <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V9a1 1 0 11-2 0V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
        </svg>
      )
    if (type === "Story")
      return (
        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
        </svg>
      )
    return (
      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
          clipRule="evenodd"
        />
      </svg>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Sprint Board</h2>
        <p className="text-slate-600 mt-1">Drag and drop tasks to update their status</p>
      </div>

      <div>
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-4 gap-4">
            {columns.map((col) => (
              <div key={col} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">{col}</h3>
                  <span className="badge badge-secondary text-xs">{itemsByCol[col]?.length || 0}</span>
                </div>

                <Droppable droppableId={col}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[500px] space-y-2 ${snapshot.isDraggingOver ? "bg-blue-50 rounded-lg p-2" : ""}`}
                    >
                      {itemsByCol[col]?.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                          <svg
                            className="w-8 h-8 mx-auto mb-2 opacity-50"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                            />
                          </svg>
                          <p className="text-xs">No tasks</p>
                        </div>
                      ) : (
                        itemsByCol[col]?.map((item, i) => (
                          <Draggable key={item._id} draggableId={item._id} index={i}>
                            {(prov, snap) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                className={`bg-white rounded-lg p-3 shadow-sm border-l-4 ${getPriorityColor(item.priority)} ${
                                  snap.isDragging ? "shadow-lg rotate-2" : "hover:shadow-md"
                                } transition-all cursor-grab active:cursor-grabbing`}
                              >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2">
                                    {getTypeIcon(item.type)}
                                    <span className="text-xs font-medium text-slate-600">{item.type}</span>
                                  </div>
                                  {item.storyPoints && (
                                    <span className="badge badge-primary text-xs">{item.storyPoints} SP</span>
                                  )}
                                </div>

                                <h4 className="text-sm font-semibold text-slate-900 mb-2 leading-tight">
                                  {item.title}
                                </h4>

                                {item.description && (
                                  <p className="text-xs text-slate-500 line-clamp-2 mb-2">{item.description}</p>
                                )}

                                <div className="flex items-center justify-between">
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded ${
                                      item.priority === "Highest" || item.priority === "High"
                                        ? "bg-red-50 text-red-700"
                                        : item.priority === "Medium"
                                          ? "bg-yellow-50 text-yellow-700"
                                          : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {item.priority}
                                  </span>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  )
}
