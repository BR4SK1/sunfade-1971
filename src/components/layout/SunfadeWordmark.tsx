import { Box } from '@mui/material';

// Generated with the Rebel FIGlet font by Valerie Mates, based on Ron Bliss's original.
const WORDMARK = [
  '  █████████                           ██████                █████             ███████████             █████',
  ' ███▒▒▒▒▒███                         ███▒▒███              ▒▒███             ▒▒███▒▒▒▒▒███           ▒▒███',
  '▒███    ▒▒▒  █████ ████ ████████    ▒███ ▒▒▒   ██████    ███████   ██████     ▒███    ▒███   ██████  ███████   ████████   ██████',
  '▒▒█████████ ▒▒███ ▒███ ▒▒███▒▒███  ███████    ▒▒▒▒▒███  ███▒▒███  ███▒▒███    ▒██████████   ███▒▒███▒▒▒███▒   ▒▒███▒▒███ ███▒▒███',
  ' ▒▒▒▒▒▒▒▒███ ▒███ ▒███  ▒███ ▒███ ▒▒▒███▒      ███████ ▒███ ▒███ ▒███████     ▒███▒▒▒▒▒███ ▒███████   ▒███     ▒███ ▒▒▒ ▒███ ▒███',
  ' ███    ▒███ ▒███ ▒███  ▒███ ▒███   ▒███      ███▒▒███ ▒███ ▒███ ▒███▒▒▒      ▒███    ▒███ ▒███▒▒▒    ▒███ ███ ▒███     ▒███ ▒███',
  '▒▒█████████  ▒▒████████ ████ █████  █████    ▒▒████████▒▒████████▒▒██████     █████   █████▒▒██████   ▒▒█████  █████    ▒▒██████',
  ' ▒▒▒▒▒▒▒▒▒    ▒▒▒▒▒▒▒▒ ▒▒▒▒ ▒▒▒▒▒  ▒▒▒▒▒      ▒▒▒▒▒▒▒▒  ▒▒▒▒▒▒▒▒  ▒▒▒▒▒▒     ▒▒▒▒▒   ▒▒▒▒▒  ▒▒▒▒▒▒     ▒▒▒▒▒  ▒▒▒▒▒      ▒▒▒▒▒▒',
].join('\n');

export function SunfadeWordmark() {
  return (
    <Box sx={{ width: '100%', mb: 3, containerType: 'inline-size' }}>
      <Box
        component="pre"
        role="img"
        aria-label="Sunfade Retro"
        sx={{
          m: 0,
          color: 'primary.main',
          fontFamily: 'monospace',
          fontSize: { xs: '4px', sm: '7px', md: '6px', lg: '10px', xl: '12px' },
          fontWeight: 700,
          lineHeight: 1,
          whiteSpace: 'pre',
          textAlign: 'left',
        }}
      >
        {WORDMARK}
      </Box>
    </Box>
  );
}
