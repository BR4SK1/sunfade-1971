import { Box, Button, Stack, Typography } from '@mui/material';

const COLORS = ['primary', 'secondary', 'error', 'warning', 'success', 'info'] as const;
const VARIANTS = ['contained', 'outlined', 'text'] as const;

export function ButtonShowcase() {
  return (
    <Box>
      {VARIANTS.map((variant) => (
        <Box key={variant} sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, textTransform: 'capitalize' }}>
            {variant}
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {COLORS.map((color) => (
              <Button key={color} variant={variant} color={color} size="small">
                {color}
              </Button>
            ))}
            <Button variant={variant} disabled size="small">
              disabled
            </Button>
          </Stack>
        </Box>
      ))}
    </Box>
  );
}
