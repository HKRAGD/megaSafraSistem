import React from 'react';
import { Timeline } from '@mui/lab';
import { Movement } from '../../../../types';
import { MovementHistoryItem } from './MovementHistoryItem';

interface MovementHistoryTimelineProps {
  movements: Movement[];
}

export const MovementHistoryTimeline: React.FC<MovementHistoryTimelineProps> = React.memo(({
  movements,
}) => {
  return (
    <Timeline>
      {movements.map((movement, index) => (
        <MovementHistoryItem
          key={movement.id}
          movement={movement}
          isLast={index === movements.length - 1}
        />
      ))}
    </Timeline>
  );
}); 