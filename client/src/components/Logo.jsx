// Sentinel wordmark — wide, techy uppercase "SENTINEL" with an "AI Revenue
// Recovery" tagline underneath (Chakra Petch). `size` sets the wordmark size;
// the tagline scales with it. `tagline={false}` renders the wordmark alone.

export default function Logo({ size = 22, tone = 'ink', tagline = true, className = '' }) {
  const wordColor = tone === 'white' ? 'text-white' : 'text-ink';
  const tagColor = tone === 'white' ? 'text-white/65' : 'text-ink/55';
  return (
    <span className={`inline-flex flex-col items-center leading-none select-none ${className}`}>
      <span
        className={`font-logo font-semibold uppercase ${wordColor}`}
        style={{ fontSize: size, letterSpacing: '0.12em', paddingLeft: '0.12em' }}
      >
        SENTINEL
      </span>
      {tagline && (
        <span
          className={`font-logo font-medium uppercase ${tagColor}`}
          style={{
            fontSize: Math.max(6.5, size * 0.29),
            letterSpacing: '0.34em',
            marginTop: size * 0.2,
            paddingLeft: '0.34em',
          }}
        >
          AI Revenue Recovery
        </span>
      )}
    </span>
  );
}
