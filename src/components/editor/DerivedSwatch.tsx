import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { useState } from 'react';
import { ColorPickerControl } from './ColorPickerControl';

interface DerivedSwatchProps {
  label: string;
  hex: string;
  isOverridden: boolean;
  onOverride: (value: string) => void;
  onClearOverride: () => void;
}

export function DerivedSwatch({
  label,
  hex,
  isOverridden,
  onOverride,
  onClearOverride,
}: DerivedSwatchProps) {
  const [editing, setEditing] = useState(false);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        py: 0.25,
      }}
    >
      {/* Color swatch / picker */}
      {editing || isOverridden ? (
        <ColorPickerControl
          color={hex}
          label={`${label} override`}
          size={24}
          onChange={onOverride}
        />
      ) : (
        <Box
          sx={{
            width: 24,
            height: 24,
            backgroundColor: hex,
            borderRadius: 0.5,
            border: '1px solid',
            borderColor: 'divider',
            flexShrink: 0,
          }}
        />
      )}

      <Typography
        variant="caption"
        sx={{
          flex: 1,
          fontFamily: 'monospace',
          fontSize: 11,
          opacity: isOverridden ? 1 : 0.8,
          fontWeight: isOverridden ? 600 : 400,
        }}
      >
        {hex}
      </Typography>

      <Typography variant="caption" sx={{ fontSize: 10, opacity: 0.5, minWidth: 40 }}>
        {label}
      </Typography>

      <Tooltip title={isOverridden ? 'Reset to derived' : 'Override'}>
        <IconButton
          size="small"
          onClick={() => {
            if (isOverridden) {
              onClearOverride();
              setEditing(false);
            } else {
              setEditing(!editing);
            }
          }}
          sx={{ p: 0.25 }}
        >
          {isOverridden ? (
            <LinkOffIcon sx={{ fontSize: 14, color: 'warning.main' }} />
          ) : (
            <LinkIcon sx={{ fontSize: 14, opacity: 0.4 }} />
          )}
        </IconButton>
      </Tooltip>
    </Box>
  );
}
