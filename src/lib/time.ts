export type Meridiem = "AM" | "PM";

export const formatDisplayTime = (value: string) => {
  const [hoursText, minutesText] = value.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return value;
  }

  const period = hours >= 12 ? "PM" : "AM";
  const normalizedHours = hours % 12 || 12;
  return `${normalizedHours}:${minutes.toString().padStart(2, "0")} ${period}`;
};

export const formatDisplayTimeRange = (startTime: string, endTime: string) =>
  `${formatDisplayTime(startTime)} - ${formatDisplayTime(endTime)}`;

export const parseTimeValue = (value: string): { hour12: string; minute: string; meridiem: Meridiem } => {
  const [hoursText, minutesText] = value.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return { hour12: "12", minute: "00", meridiem: "AM" };
  }

  return {
    hour12: String(hours % 12 || 12),
    minute: minutes.toString().padStart(2, "0"),
    meridiem: hours >= 12 ? "PM" : "AM",
  };
};

export const to24HourTime = (hour12: string, minute: string, meridiem: Meridiem) => {
  const normalizedHour = Number(hour12);
  const normalizedMinute = Number(minute);

  if (!Number.isFinite(normalizedHour) || !Number.isFinite(normalizedMinute)) {
    return "00:00";
  }

  const clampedHour = Math.min(12, Math.max(1, normalizedHour));
  const clampedMinute = Math.min(59, Math.max(0, normalizedMinute));
  const hour24 = meridiem === "PM" ? (clampedHour % 12) + 12 : clampedHour % 12;

  return `${hour24.toString().padStart(2, "0")}:${clampedMinute.toString().padStart(2, "0")}`;
};

export const addMinutesToTime = (value: string, minutesToAdd: number) => {
  const [hoursText, minutesText] = value.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return value;
  }

  const totalMinutes = Math.max(0, hours * 60 + minutes + minutesToAdd);
  const normalizedMinutes = totalMinutes % (24 * 60);
  const nextHours = Math.floor(normalizedMinutes / 60);
  const nextMinutes = normalizedMinutes % 60;

  return `${nextHours.toString().padStart(2, "0")}:${nextMinutes.toString().padStart(2, "0")}`;
};

export const getDurationBetweenTimes = (startTime: string, endTime: string) => {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  if (
    !Number.isFinite(startHour) ||
    !Number.isFinite(startMinute) ||
    !Number.isFinite(endHour) ||
    !Number.isFinite(endMinute)
  ) {
    return 60;
  }

  const difference = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  return difference > 0 ? difference : 60;
};

export const parseDurationValue = (value: string): { hours: string; minutes: string } => {
  const totalMinutes = Math.max(0, Number(value) || 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return {
    hours: hours.toString(),
    minutes: minutes.toString().padStart(2, "0"),
  };
};

export const durationPartsToMinutes = (hours: string, minutes: string) => {
  const normalizedHours = Math.max(0, Number(hours) || 0);
  const normalizedMinutes = Math.max(0, Math.min(59, Number(minutes) || 0));
  return normalizedHours * 60 + normalizedMinutes;
};
