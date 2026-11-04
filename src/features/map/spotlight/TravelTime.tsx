import React from 'react';
import { useTranslation } from 'react-i18next';
import { splitDuration } from './spotlightUtils';

/** "12 min" or "1 h 5 min", translated. */
const TravelTime: React.FC<{ seconds: number }> = ({ seconds }) => {
  const { t } = useTranslation(['search']);
  const { hours, minutes } = splitDuration(seconds);
  return (
    <>
      {hours > 0
        ? t('search:spotlight.route.hoursMinutes', '{{h}} h {{m}} min', { h: hours, m: minutes })
        : t('search:spotlight.route.minutes', '{{m}} min', { m: minutes })}
    </>
  );
};

export default TravelTime;
