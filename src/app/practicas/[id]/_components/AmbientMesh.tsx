export function AmbientMesh() {
  return (
    <div aria-hidden className="fixed inset-0 pointer-events-none z-0">
      {/* orb top-left — warm salmon */}
      <div
        className="absolute -top-[15%] -left-[10%] w-[60%] h-1/2 rounded-full opacity-50 blur-[40px]"
        style={{
          background:
            "radial-gradient(closest-side, rgba(255,166,122,0.4), rgba(255,166,122,0) 70%)",
        }}
      />
      {/* orb top-right — warm peach */}
      <div
        className="absolute -top-[5%] -right-[15%] w-[55%] h-1/2 rounded-full opacity-45 blur-[50px]"
        style={{
          background:
            "radial-gradient(closest-side, rgba(255,210,180,0.5), rgba(255,210,180,0) 70%)",
        }}
      />
    </div>
  );
}
