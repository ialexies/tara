'use client';

type Props = {
  propertyName: string;
  roomName: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  referenceCode: string;
};

function toGoogleDate(iso: string) {
  return iso.replace(/-/g, '');
}

export function AddToCalendarButton({
  propertyName,
  roomName,
  checkIn,
  checkOut,
  referenceCode,
}: Props) {
  function openGoogle() {
    const title = encodeURIComponent(`${propertyName} — ${roomName}`);
    const details = encodeURIComponent(`Booking ref: ${referenceCode}`);
    const dates = `${toGoogleDate(checkIn)}/${toGoogleDate(checkOut)}`;
    window.open(
      `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`,
      '_blank',
    );
  }

  function downloadIcs() {
    const title = `${propertyName} — ${roomName}`;
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART;VALUE=DATE:${toGoogleDate(checkIn)}`,
      `DTEND;VALUE=DATE:${toGoogleDate(checkOut)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:Booking ref: ${referenceCode}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tara-${referenceCode}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={openGoogle}
        className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        <span>📅</span> Google Calendar
      </button>
      <button
        type="button"
        onClick={downloadIcs}
        className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        <span>🍎</span> Apple / Outlook
      </button>
    </div>
  );
}
