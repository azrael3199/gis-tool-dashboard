import { Statistics } from '../lib/utils/types';
import React from 'react';

interface IStatsPane {
  statistics: Statistics;
}

const StatsPane: React.FC<IStatsPane> = ({ statistics }) => {
  return (
    <div className="absolute top-3 right-3 text-white bg-black/50 rounded-lg p-2 flex flex-col z-9">
      Statistics
      <p>Point Count: {statistics.count}</p>
    </div>
  );
};

export default StatsPane;
