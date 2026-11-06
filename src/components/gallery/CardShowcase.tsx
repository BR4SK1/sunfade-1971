import { Box, Card, CardContent, CardHeader, Paper, Typography } from '@mui/material';

export function CardShowcase() {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 2 }}>
      <Card>
        <CardHeader title="Default Card" subheader="With header" />
        <CardContent>
          <Typography variant="body2">
            Card content using paper background and text.primary colors.
          </Typography>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardHeader title="Outlined Card" subheader="Border variant" />
        <CardContent>
          <Typography variant="body2">
            Uses the fg2 frame color for the border.
          </Typography>
        </CardContent>
      </Card>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Plain Paper</Typography>
        <Typography variant="body2">
          Paper uses bg1 as its background color.
        </Typography>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Outlined Paper</Typography>
        <Typography variant="body2">
          Outlined variant with a 1px fg2 frame.
        </Typography>
      </Paper>
    </Box>
  );
}
