import React from 'react';
import { Droppable } from 'react-beautiful-dnd';
import Card from './Card.jsx';

export default function Column({ col, items }) {
  return (
    <Droppable droppableId={col}>
      {(provided) => (
        <div ref={provided.innerRef} {...provided.droppableProps} className="card min-h-[300px]">
          <h3 className="font-semibold mb-2">{col}</h3>
          {items.map((item, i) => <Card key={item._id} item={item} index={i} />)}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}
