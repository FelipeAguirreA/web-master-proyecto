"use client";

import {
  toLocalDateStr,
  MONTHS_ES,
  DAYS_ES_SHORT,
  isInterviewPast,
} from "./calendarHelpers";

type Interview = {
  id: string;
  title: string;
  scheduledAt: string;
  durationMins: number;
  meetingLink: string | null;
  notes: string | null;
  sentToChat: boolean;
  sentToChatAt: string | null;
  internshipId: string;
  applicationId: string;
  studentId: string;
  conversationId: string;
  student: { id: string; name: string; image: string | null };
  internship: { id: string; title: string };
};

type Props = {
  interviews: Interview[]; // all interviews, sorted by date
  onSelectInterview: (iv: Interview) => void;
};

function StudentAvatar({ name, size = 30 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 bg-gradient-to-br from-accent-hi to-accent"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}

type GroupedDay = {
  dateStr: string;
  interviews: Interview[];
};

export default function AgendaView({ interviews, onSelectInterview }: Props) {
  const todayStr = toLocalDateStr(new Date());

  // Group by date
  const grouped: GroupedDay[] = [];
  const byDate = new Map<string, Interview[]>();
  for (const iv of interviews) {
    const dateStr = toLocalDateStr(new Date(iv.scheduledAt));
    if (!byDate.has(dateStr)) byDate.set(dateStr, []);
    byDate.get(dateStr)!.push(iv);
  }
  for (const [dateStr, ivs] of byDate) {
    grouped.push({
      dateStr,
      interviews: ivs.sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      ),
    });
  }
  grouped.sort((a, b) => a.dateStr.localeCompare(b.dateStr));

  if (grouped.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-[13px] text-subtle">Sin entrevistas agendadas.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4 sm:space-y-5">
      {grouped.map(({ dateStr, interviews: dayIvs }) => {
        const d = new Date(dateStr + "T12:00:00");
        const dayNum = d.getDate();
        const month = MONTHS_ES[d.getMonth()];
        // 0=Sun→6, 1=Mon→0
        const dowIndex = (d.getDay() + 6) % 7;
        const dayName = DAYS_ES_SHORT[dowIndex];
        const isToday = dateStr === todayStr;

        return (
          <div key={dateStr}>
            {/* Day header */}
            <div className="flex items-baseline gap-2.5 mb-3 flex-wrap">
              <h3
                className={[
                  "text-[13.5px] font-bold tracking-[-0.01em]",
                  isToday ? "text-accent" : "text-text",
                ].join(" ")}
              >
                {dayName} {dayNum} de {month.toLowerCase()}
              </h3>
              {isToday && (
                <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full uppercase tracking-[0.05em] text-accent bg-accent-bg border border-accent-bdr">
                  Hoy
                </span>
              )}
              <span className="text-[11px] font-medium text-subtle">
                {dayIvs.length}{" "}
                {dayIvs.length === 1 ? "entrevista" : "entrevistas"}
              </span>
            </div>

            {/* Events */}
            <div className="space-y-2">
              {dayIvs.map((iv) => {
                const start = new Date(iv.scheduledAt);
                const startLabel = new Intl.DateTimeFormat("es-CL", {
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(start);
                const endDate = new Date(
                  start.getTime() + iv.durationMins * 60_000,
                );
                const endLabel = new Intl.DateTimeFormat("es-CL", {
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(endDate);

                const past = isInterviewPast(iv.scheduledAt, iv.durationMins);

                return (
                  <button
                    key={iv.id}
                    onClick={() => onSelectInterview(iv)}
                    className={[
                      "w-full flex items-center gap-3 p-3 rounded-[12px] text-left transition-all cursor-pointer",
                      past
                        ? "border-l-[3px] border-l-subtle bg-dark/5"
                        : "border-l-[3px] border-l-green bg-green-bg",
                    ].join(" ")}
                  >
                    {/* Time */}
                    <div className="min-w-[72px]">
                      <p
                        className={[
                          "text-[12px] font-bold leading-none",
                          past ? "text-muted" : "text-text",
                        ].join(" ")}
                      >
                        {startLabel}
                      </p>
                      <p className="text-[10.5px] font-medium mt-0.5 text-subtle">
                        {endLabel}
                      </p>
                    </div>

                    <StudentAvatar name={iv.student.name} size={30} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-bold truncate leading-tight text-text">
                        {iv.title}
                      </p>
                      <p className="text-[11px] mt-0.5 truncate text-muted">
                        {iv.student.name}
                        <span className="mx-1 text-faint">·</span>
                        {iv.internship.title}
                      </p>
                    </div>

                    {/* Badge */}
                    {iv.meetingLink && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 text-accent bg-accent-bg border border-accent-bdr">
                        Online
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
