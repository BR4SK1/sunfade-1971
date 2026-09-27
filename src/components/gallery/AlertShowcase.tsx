import { Alert, AlertTitle, Box, Stack } from '@mui/material';

const SEVERITIES = ['error', 'warning', 'info', 'success'] as const;

export function AlertShowcase() {
  return (
    <Stack spacing={2} sx={{ maxWidth: 500 }}>
      {SEVERITIES.map((s) => (
        <Alert key={`standard-${s}`} severity={s}>
          <AlertTitle sx={{ textTransform: 'capitalize' }}>{s}</AlertTitle>
          This is a standard {s} alert.
        </Alert>
      ))}
      {SEVERITIES.map((s) => (
        <Alert key={`outlined-${s}`} severity={s} variant="outlined">
          Outlined {s} alert.
        </Alert>
      ))}
      {SEVERITIES.map((s) => (
        <Alert key={`filled-${s}`} severity={s} variant="filled">
          Filled {s} alert.
        </Alert>
      ))}
    </Stack>
  );
}
