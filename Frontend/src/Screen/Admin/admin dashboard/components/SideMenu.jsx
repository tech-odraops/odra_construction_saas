import { styled } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import MuiDrawer, { drawerClasses } from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import SiteLogo from './SiteLogo';
import MenuContent from './MenuContent';

import OptionsMenu from './OptionsMenu';
import { jwtDecode } from "jwt-decode";

const drawerWidth = 'var(--dashboard-sidebar-width)';

const Drawer = styled(MuiDrawer)({
  width: drawerWidth,
  flexShrink: 0,
  boxSizing: 'border-box',
  position: 'static',
  [`& .${drawerClasses.paper}`]: {
    width: drawerWidth,
    boxSizing: 'border-box',
    position: 'static',
    height: 'auto',
    minHeight: '100%',
  },
});

export default function SideMenu({ selectedTab, onTabSelect }) {
  const token = localStorage.getItem("token");
  let decoded = null;
  try {
    if (token) decoded = jwtDecode(token);
  } catch (e) {
    console.error("Token decode error:", e);
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        display: { xs: 'none', md: 'block' },
        [`& .${drawerClasses.paper}`]: {
          backgroundColor: 'var(--color-dashboard-sidebar-surface)',
          border: '1px solid var(--color-dashboard-border)',
          borderRadius: 'var(--dashboard-container-radius)',
          overflow: 'hidden',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          minHeight: 'var(--dashboard-header-height)',
          px: 2,
          alignItems: 'center',
        }}
      >
        <SiteLogo />
      </Box>
      <Divider />
      <Box
        sx={{
          overflow: 'auto',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <MenuContent selectedTab={selectedTab} onTabSelect={onTabSelect} />
      </Box>
      <Stack
        direction="row"
        sx={{
          p: 2,
          gap: 1,
          alignItems: 'center',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Avatar
          sizes="small"
          alt="Name"
          sx={{ width: 36, height: 36 }}
        >{ decoded?.email?.charAt(0).toUpperCase() || 'A'}</Avatar>
        <Box sx={{ mr: 'auto' }}>
          <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: '16px' }}>
            {decoded?.name || 'Admin'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {decoded?.email || 'admin@odraops.com'}
          </Typography>
        </Box>
        <OptionsMenu />
      </Stack>
    </Drawer>
  );
}
