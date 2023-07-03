import { Stats as StatsType } from 'lib/types';

import Stat from 'components/pokemon/Stat';

interface StatsProps {
  stats: StatsType;
}

const Stats = ({ stats } : StatsProps) => {
  return (
    <ul>
      {stats.map((stat) => (
        <li key={stat.stat.name}>
          <Stat stat={stat} />
        </li>
      ))}
    </ul>
  );
}

export default Stats;