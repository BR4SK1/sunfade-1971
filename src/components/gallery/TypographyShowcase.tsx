import { Box, Typography } from '@mui/material';

export function TypographyShowcase() {
  return (
    <Box sx={{ maxWidth: 600 }}>
      <Typography variant="h1" gutterBottom>h1. Heading</Typography>
      <Typography variant="h2" gutterBottom>h2. Heading</Typography>
      <Typography variant="h3" gutterBottom>h3. Heading</Typography>
      <Typography variant="h4" gutterBottom>h4. Heading</Typography>
      <Typography variant="h5" gutterBottom>h5. Heading</Typography>
      <Typography variant="h6" gutterBottom>h6. Heading</Typography>
      <Typography variant="subtitle1" gutterBottom>subtitle1. Lorem ipsum dolor sit amet</Typography>
      <Typography variant="subtitle2" gutterBottom>subtitle2. Lorem ipsum dolor sit amet</Typography>
      <Typography variant="body1" gutterBottom>
        body1. The quick brown fox jumps over the lazy dog. Sunfade Retro brings warm, nostalgic colors
        that reduce eye strain while maintaining excellent readability.
      </Typography>
      <Typography variant="body2" gutterBottom>
        body2. The quick brown fox jumps over the lazy dog. Accents derive from user-chosen
        neutral values through HSL delta calculations.
      </Typography>
      <Typography variant="caption" sx={{ display: 'block' }} gutterBottom>caption text</Typography>
      <Typography variant="overline" sx={{ display: 'block' }}>overline text</Typography>
    </Box>
  );
}
