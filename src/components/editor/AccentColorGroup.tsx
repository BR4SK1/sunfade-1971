import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { usePalette } from '../../context/usePalette.js';
import { BaseColorPicker } from './BaseColorPicker.js';
import { DerivedSwatch } from './DerivedSwatch.js';
import type { AccentName, AccentTier, ResolvedPalette } from '../../palette/types.js';

const TIERS: AccentTier[] = ['bright', 'neutral', 'faded', 'deep'];

interface AccentColorGroupProps {
  accent: AccentName;
}

export function AccentColorGroup({ accent }: AccentColorGroupProps) {
  const { baseColors, resolved, overrides, setBase, setOverride, clearOverride } = usePalette();

  return (
    <Accordion disableGutters elevation={0} sx={{ '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 40, px: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              backgroundColor: baseColors[accent],
              border: '1px solid',
              borderColor: 'divider',
            }}
          />
          <Typography variant="body2" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
            {accent}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 1.5, pt: 0 }}>
        <BaseColorPicker
          label={`${accent} (neutral)`}
          value={baseColors[accent]}
          onChange={(v) => setBase(accent, v)}
        />
        {TIERS.map((tier) => {
          const key = `${tier}_${accent}` as keyof ResolvedPalette;
          return (
            <DerivedSwatch
              key={key}
              label={tier}
              hex={resolved[key]}
              isOverridden={key in overrides}
              onOverride={(v) => setOverride(key, v)}
              onClearOverride={() => clearOverride(key)}
            />
          );
        })}
      </AccordionDetails>
    </Accordion>
  );
}
