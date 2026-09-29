import { Box } from '@mui/material';

const WORDMARK = 'SUNFADE 1971';

export function SunfadeWordmark() {
  return (
    <Box sx={{ width: 'max-content', minWidth: '100%', containerType: 'inline-size' }}>
      <Box
        component="pre"
        aria-hidden="true"
        sx={{
          m: 0,
          color: 'terminalHeader.text',
          fontFamily: 'monospace',
          fontSize: { xs: '14px', sm: '20px', md: '24px', lg: '32px', xl: '40px' },
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: '0.08em',
          whiteSpace: 'pre',
          textAlign: 'left',
        }}
      >
        {WORDMARK}
      </Box>
    </Box>
  );
}
