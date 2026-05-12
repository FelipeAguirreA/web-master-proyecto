import { D } from "../tokens";

const PULSE_KEYS = `
  @keyframes practix-shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`;

const SKELETON_BG = {
  background: `linear-gradient(90deg, ${D.bg} 25%, rgba(0,0,0,.04) 50%, ${D.bg} 75%)`,
  backgroundSize: "200% 100%",
  animation: "practix-shimmer 1.6s linear infinite",
  borderRadius: 6,
} as const;

function Bar({
  w,
  h = 10,
  mt = 0,
  mb = 0,
}: {
  w: string | number;
  h?: number;
  mt?: number;
  mb?: number;
}) {
  return (
    <div
      style={{
        ...SKELETON_BG,
        width: w,
        height: h,
        marginTop: mt,
        marginBottom: mb,
      }}
    />
  );
}

export function PracticaCardSkeleton() {
  return (
    <article
      style={{
        background: D.surface,
        border: `1px solid ${D.border}`,
        borderRadius: 18,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <style>{PULSE_KEYS}</style>
      <div style={{ display: "flex", gap: 12 }}>
        <div
          style={{
            ...SKELETON_BG,
            width: 44,
            height: 44,
            borderRadius: 9,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1 }}>
          <Bar w={90} h={10} mb={6} />
          <Bar w="80%" h={13} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <Bar w={60} h={18} />
        <Bar w={70} h={18} />
        <Bar w={50} h={18} />
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <Bar w={110} h={11} />
        <Bar w={70} h={11} />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "auto",
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div
            style={{
              ...SKELETON_BG,
              width: 56,
              height: 56,
              borderRadius: "50%",
            }}
          />
          <div>
            <Bar w={90} h={10} mb={4} />
            <Bar w={70} h={10} />
          </div>
        </div>
        <div
          style={{
            ...SKELETON_BG,
            width: 90,
            height: 36,
            borderRadius: 10,
          }}
        />
      </div>
    </article>
  );
}

export function PipelineSkeleton() {
  return (
    <section>
      <style>{PULSE_KEYS}</style>
      <div style={{ marginBottom: 14 }}>
        <Bar w={180} h={18} mb={6} />
        <Bar w={260} h={12} />
      </div>
      <div
        className="practix-pipeline-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 12,
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              background: D.surface,
              border: `1px solid ${D.border}`,
              borderRadius: 16,
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              minHeight: 160,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <Bar w={80} h={12} />
              <Bar w={24} h={16} />
            </div>
            {i < 3 &&
              [0, 1].map((j) => (
                <div
                  key={j}
                  style={{
                    display: "flex",
                    gap: 9,
                    padding: 8,
                    background: D.bg,
                    borderRadius: 10,
                  }}
                >
                  <div
                    style={{
                      ...SKELETON_BG,
                      width: 28,
                      height: 28,
                      borderRadius: 9,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, paddingTop: 2 }}>
                    <Bar w="80%" h={10} mb={5} />
                    <Bar w="50%" h={9} />
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>
      <style>{`
        @media (max-width:900px) { .practix-pipeline-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width:600px) { .practix-pipeline-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}
