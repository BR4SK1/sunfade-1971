import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { usePalette } from '../../context/usePalette';
import { ACCENT_NAMES, ACCENT_TIERS, type ResolvedPalette } from '../../palette/types';

export function TableShowcase() {
  const { resolved } = usePalette();

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ maxWidth: 600 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Accent</TableCell>
            {ACCENT_TIERS.map((t) => (
              <TableCell key={t} sx={{ fontWeight: 700, textTransform: 'capitalize' }}>
                {t}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {ACCENT_NAMES.map((name, i) => (
            <TableRow key={name} sx={{ backgroundColor: i % 2 === 0 ? 'background.default' : 'background.paper' }}>
              <TableCell sx={{ textTransform: 'capitalize', fontWeight: 600 }}>{name}</TableCell>
              {ACCENT_TIERS.map((tier) => {
                const key = `${tier}_${name}` as keyof ResolvedPalette;
                const hex = resolved[key];
                return (
                  <TableCell key={tier}>
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      <Box
                        sx={{
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          backgroundColor: hex,
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      />
                      <Box component="code" sx={{ fontSize: 11 }}>
                        {hex}
                      </Box>
                    </Box>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
