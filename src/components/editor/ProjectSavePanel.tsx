'use client';

import { useEffect, useState } from 'react';
import { Alert, Box, Button, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { usePalette } from '../../context/usePalette';
import {
  fetchSavedDefaults,
  saveProjectDefaults,
  SaveConflictError,
  SaveUnavailableError,
  SaveValidationError,
} from './save-service';

interface SaveAlert {
  severity: 'success' | 'error';
  message: string;
}

/**
 * Saves the edited light and dark palettes as the project's actual defaults
 * via the local dev companion. Distinct from the scheme file download in
 * ExportPanel: this writes the tracked project-defaults artifact, so fresh
 * reloads, dev-server restarts, and the Reset button all use these values.
 */
export function ProjectSavePanel() {
  const { modePalettes, savedPalettes, savedRevision, hydrateProjectDefaults, saveDefaultsSucceeded } = usePalette();
  const isDev = process.env.NODE_ENV === 'development';

  // In a production build the companion service is never reachable; derive
  // that up front instead of setting it inside an effect.
  const [serviceStatus, setServiceStatus] = useState<'checking' | 'available' | 'unavailable'>(
    isDev ? 'checking' : 'unavailable',
  );
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<SaveAlert | null>(null);

  // Detect the companion service and pick up saved defaults that are newer
  // than the bundled artifact (e.g. saved in another tab before a rebuild).
  useEffect(() => {
    if (!isDev) {
      return;
    }
    let cancelled = false;
    fetchSavedDefaults()
      .then((defaults) => {
        if (cancelled) return;
        setServiceStatus('available');
        hydrateProjectDefaults(defaults.palettes, defaults.revision);
      })
      .catch((error) => {
        if (cancelled) return;
        setServiceStatus('unavailable');
        if (error instanceof Error) {
          console.warn('Save service check failed:', error.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isDev, hydrateProjectDefaults]);

  // Auto-clear success alerts; errors stay until the next action.
  useEffect(() => {
    if (!alert || alert.severity !== 'success') return;
    const timer = setTimeout(() => setAlert(null), 6000);
    return () => clearTimeout(timer);
  }, [alert]);

  if (!isDev) {
    return (
      <Typography variant="caption" sx={{ display: 'block', mb: 2, color: 'text.secondary', lineHeight: 1.35 }}>
        Saving project defaults is available in local development only. Use Save Scheme to download your palette.
      </Typography>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setAlert(null);
    try {
      const result = await saveProjectDefaults(modePalettes, savedRevision);
      saveDefaultsSucceeded(result.revision);
      setAlert({
        severity: 'success',
        message: `Saved as project defaults (revision ${result.revision}). Fresh reloads and Reset now use these values.`,
      });
    } catch (error) {
      if (error instanceof SaveValidationError || error instanceof SaveConflictError) {
        setAlert({ severity: 'error', message: error.message });
      } else if (error instanceof SaveUnavailableError) {
        setAlert({ severity: 'error', message: error.message });
      } else {
        setAlert({ severity: 'error', message: 'Unexpected error while saving project defaults.' });
      }
    } finally {
      setSaving(false);
    }
  };

  const dirty = JSON.stringify(modePalettes) !== JSON.stringify(savedPalettes);

  return (
    <Box sx={{ mb: 2 }}>
      <Button
        variant="contained"
        size="small"
        startIcon={<SaveIcon />}
        onClick={() => void handleSave()}
        disabled={saving || serviceStatus !== 'available'}
        fullWidth
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </Button>
      <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary', lineHeight: 1.35 }}>
        {serviceStatus === 'checking' && 'Checking for the local save service…'}
        {serviceStatus === 'available' && dirty && 'Unsaved changes will be kept in this page only until saved.'}
        {serviceStatus === 'available' && !dirty && `All changes saved as project defaults (revision ${savedRevision}).`}
        {serviceStatus === 'unavailable' && 'Save service not running — start it with: pnpm save-server'}
      </Typography>
      {alert && (
        <Alert severity={alert.severity} sx={{ mt: 1 }}>
          {alert.message}
        </Alert>
      )}
    </Box>
  );
}
