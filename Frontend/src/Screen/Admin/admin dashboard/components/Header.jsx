import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Date from './Date';
import NavbarBreadcrumbs from './NavbarBreadcrumbs';

export default function Header({ selectedTab }) {
  return (
    <Paper
      elevation={0}
      direction="row"
      sx={{
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'row',
        width: '100%',
        alignItems: { xs: 'flex-start', md: 'center' },
        justifyContent: 'space-between',
        minHeight: 'var(--dashboard-header-height)',
        px: 2.5,
        border: '1px solid var(--color-dashboard-border)',
        borderRadius: 'var(--dashboard-container-radius)',
        bgcolor: 'var(--color-dashboard-header-surface)',
      }}
    >
      <NavbarBreadcrumbs selectedTab={selectedTab} />
      <Stack direction="row" sx={{ gap: 1 }}>
        <Date />
      </Stack>
    </Paper>
  );
}
