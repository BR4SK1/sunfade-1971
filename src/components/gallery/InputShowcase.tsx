import { Box, MenuItem, TextField } from '@mui/material';

export function InputShowcase() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 400 }}>
      <TextField label="Standard" variant="standard" defaultValue="Sunfade 1971" />
      <TextField label="Outlined" variant="outlined" defaultValue="Sunfade 1971" />
      <TextField label="Filled" variant="filled" defaultValue="Sunfade 1971" />
      <TextField label="Error State" error helperText="Something went wrong" defaultValue="Invalid" />
      <TextField label="Disabled" disabled defaultValue="Disabled" />
      <TextField label="Multiline" multiline rows={3} defaultValue="A warm, retro-inspired color palette." />
      <TextField label="Select" select defaultValue="blue">
        <MenuItem value="blue">Blue (primary)</MenuItem>
        <MenuItem value="red">Red (error)</MenuItem>
        <MenuItem value="green">Green (success)</MenuItem>
      </TextField>
    </Box>
  );
}
