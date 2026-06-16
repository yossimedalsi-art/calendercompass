export function getGoogleCalendarLink(date: string, time: string, title: string, details: string): string {
  // Parse date and time
  const [year, month, day] = date.split('-');
  const [hour, minute] = time.split(':');
  
  // Create Date object in local time
  const startObj = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  
  // Calculate end time (assuming 1 hour meeting)
  const endObj = new Date(startObj.getTime() + 60 * 60 * 1000);
  
  // Format to YYYYMMDDTHHmmssZ (UTC)
  const formatTime = (d: Date) => {
    return d.toISOString().replace(/-|:|\.\d\d\d/g, '');
  };

  const startTimeStr = formatTime(startObj);
  const endTimeStr = formatTime(endObj);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details: details,
    dates: `${startTimeStr}/${endTimeStr}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
