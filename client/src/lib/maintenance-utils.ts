const toMinutes = (time: string): number | null => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
};

export const isWithinMaintenanceWindow = (
  startTime: string,
  endTime: string,
  now: Date = new Date()
): boolean => {
  const startMins = toMinutes(startTime);
  const endMins = toMinutes(endTime);
  if (startMins === null || endMins === null) return false;

  const nowMins = now.getHours() * 60 + now.getMinutes();

  if (startMins <= endMins) {
    return nowMins >= startMins && nowMins < endMins;
  }
  return nowMins >= startMins || nowMins < endMins;
};

export const getEffectiveMaintenanceActive = (
  armed: boolean,
  startTime: string | null,
  endTime: string | null,
  now: Date = new Date()
): boolean => {
  if (!armed) return false;
  if (startTime && endTime) return isWithinMaintenanceWindow(startTime, endTime, now);
  return true;
};

export const isScheduledMaintenance = (
  armed: boolean,
  startTime: string | null,
  endTime: string | null
): boolean => armed && !!startTime && !!endTime;
