"use client";

import { useState } from "react";
import { fetchWithRefresh } from "@/lib/client/fetch-with-refresh";
import { Avatar } from "@/components/dashboard/atoms/Avatar";
import { ScoreVis } from "@/components/dashboard/atoms/ScoreVis";
import { Icon } from "@/components/dashboard/Icon";
import { avatarColors, initialsFor, formatRelative } from "./utils";
import type { Applicant, Internship } from "./types";

type ApplicantRowProps = {
  a: Applicant;
  internship?: Internship;
  first: boolean;
  onRefresh: () => void;
};

export function ApplicantRow({
  a,
  internship,
  first,
  onRefresh,
}: ApplicantRowProps) {
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null);
  const [c1, c2] = avatarColors(a.student.name);
  const ini = initialsFor(a.student.name);
  const prof = a.student.studentProfile;

  const setStatus = async (status: "ACCEPTED" | "REJECTED") => {
    setBusy(status === "ACCEPTED" ? "accept" : "reject");
    try {
      await fetchWithRefresh(`/api/applications/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await onRefresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className={[
        "flex items-center gap-3 py-2.5 px-1",
        first ? "" : "border-t border-border",
      ].join(" ")}
    >
      <Avatar
        size={38}
        ini={ini}
        c1={c1}
        c2={c2}
        src={a.student.image}
        alt={a.student.name}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[13px] font-bold text-text whitespace-nowrap">
            {a.student.name}
          </span>
          {(prof?.university || prof?.career) && (
            <span className="text-[10.5px] text-subtle">
              · {prof?.university}
              {prof?.career && ` · ${prof.career}`}
            </span>
          )}
        </div>
        <div className="text-[11.5px] text-muted mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
          {internship?.title ?? "Práctica"} · {formatRelative(a.createdAt)}
        </div>
      </div>

      <ScoreVis
        score={Math.round(a.matchScore ?? 0)}
        style="badge"
        size={48}
        label={false}
      />

      <div className="flex gap-1.5">
        <button
          type="button"
          title="Avanzar"
          disabled={busy !== null}
          onClick={() => setStatus("ACCEPTED")}
          className={[
            "w-[30px] h-[30px] rounded-lg bg-green-bg border-none flex items-center justify-center",
            busy === "accept"
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer",
          ].join(" ")}
        >
          <Icon name="check" size={13} color="var(--color-green)" />
        </button>
        <button
          type="button"
          title="Descartar"
          disabled={busy !== null}
          onClick={() => setStatus("REJECTED")}
          className={[
            "w-[30px] h-[30px] rounded-lg bg-black/[0.045] border-none flex items-center justify-center",
            busy === "reject"
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer",
          ].join(" ")}
        >
          <Icon name="x" size={12} color="var(--color-muted)" />
        </button>
      </div>
    </div>
  );
}
