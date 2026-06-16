export function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dateInputToIso(date: string): string | null {
  if (!date) return null;
  return new Date(`${date}T12:00:00`).toISOString();
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === 'DONE') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dueDate) < today;
}

export function toLocalDateKey(iso: string): string {
  return toDateInputValue(iso);
}

export function dateKeyToIso(dateKey: string): string {
  return new Date(`${dateKey}T12:00:00`).toISOString();
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function buildMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Monday-based: Mon=0 ... Sun=6
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const cells: { dateKey: string; day: number; inMonth: boolean }[] = [];

  for (let i = 0; i < startOffset; i++) {
    const d = new Date(year, month, -startOffset + i + 1);
    cells.push({
      dateKey: toDateInputValue(d.toISOString()),
      day: d.getDate(),
      inMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({ dateKey, day, inMonth: true });
  }

  while (cells.length % 7 !== 0) {
    const nextDay = cells.length - startOffset - daysInMonth + 1;
    const d = new Date(year, month + 1, nextDay);
    cells.push({
      dateKey: toDateInputValue(d.toISOString()),
      day: d.getDate(),
      inMonth: false,
    });
  }

  return { cells, weekdays: WEEKDAYS };
}

export function isToday(dateKey: string): boolean {
  return dateKey === toDateInputValue(new Date().toISOString());
}
