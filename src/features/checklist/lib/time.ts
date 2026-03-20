export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getNowIso(date = new Date()) {
  return date.toISOString();
}

export function isValidDueTime(value: string | undefined) {
  if (!value) {
    return true;
  }

  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

export function isTaskOverdue(dueTime: string | undefined, completed: boolean, now = new Date()) {
  if (!dueTime || completed) {
    return false;
  }

  const [hours, minutes] = dueTime.split(":").map(Number);
  const dueDate = new Date(now);

  dueDate.setHours(hours, minutes, 0, 0);

  return now.getTime() > dueDate.getTime();
}

export function formatTimeLabel(value: string | undefined) {
  if (!value) {
    return null;
  }

  const [hoursText, minutesText] = value.split(":");
  const hours = Number(hoursText);
  const suffix = hours >= 12 ? "오후" : "오전";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;

  return `${suffix} ${displayHours}:${minutesText}`;
}
