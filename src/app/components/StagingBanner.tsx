/**
 * Staging environment indicator banner.
 * Only renders when VITE_ENVIRONMENT is 'staging' or when __APP_ENV__ is 'staging'.
 */
const StagingBanner = () => {
  const isStaging =
    import.meta.env.VITE_ENVIRONMENT === 'staging' ||
    (typeof __APP_ENV__ !== 'undefined' && __APP_ENV__ === 'staging');

  if (!isStaging) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: '#f59e0b',
        color: '#000',
        textAlign: 'center',
        padding: '4px 0',
        fontSize: '12px',
        fontWeight: 600,
        letterSpacing: '0.05em',
        pointerEvents: 'none',
      }}
    >
      STAGING ENVIRONMENT
    </div>
  );
};

export default StagingBanner;
