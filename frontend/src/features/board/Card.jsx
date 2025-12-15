import React from 'react';
import { Draggable } from 'react-beautiful-dnd';

export default function Card({ item, index }) {
  return (
    <Draggable draggableId={item._id} index={index}>
      {(prov) => (
        <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
          className="bg-slate-100 rounded p-2 mb-2">
          <div className="text-sm font-medium">{item.title}</div>
          <div className="text-xs text-slate-600">{item.type} • {item.priority} • SP {item.storyPoints || '-'}</div>
        </div>
      )}
    </Draggable>
  );
}
