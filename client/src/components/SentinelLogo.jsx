// Sentinel app icon — the real brushed-silver hummingbird artwork.
// Reused in the dashboard sidebar and the landing nav.

export default function SentinelLogo({ size = 36, radius = 10 }) {
  return (
    <img
      src="/sentinel-logo.png?v=2"
      alt="Sentinel"
      width={size}
      height={size}
      className="shrink-0 object-contain select-none"
      style={{ width: size, height: size, borderRadius: radius }}
      draggable={false}
    />
  );
}
