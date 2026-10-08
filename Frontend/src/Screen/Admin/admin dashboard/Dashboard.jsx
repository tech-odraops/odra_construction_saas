import React, { useState } from 'react';
import { alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import AppNavbar from './components/AppNavbar';
import Header from './components/Header';
import MainGrid from './components/MainGrid';
import SideMenu from './components/SideMenu';

export default function Dashboard(props) {
  const [selectedTab, setSelectedTab] = useState('home');

  return (
    <Box sx={{ display: 'flex' }}>
      <SideMenu selectedTab={selectedTab} onTabSelect={setSelectedTab} />
      <AppNavbar selectedTab={selectedTab} onTabSelect={setSelectedTab} />
      {/* Main content */}
      <Box
        component="main"
        sx={(theme) => ({
          flexGrow: 1,
          backgroundColor: theme.vars
            ? `rgba(${theme.vars.palette.background.defaultChannel} / 1)`
            : alpha(theme.palette.background.default, 1),
          overflow: 'auto',
          minHeight: '100vh',
        })}
      >
        <Stack
          spacing={2}
          sx={{
            alignItems: 'center',
            mx: { xs: 1.5, sm: 2, md: 3 },
            pb: 5,
            mt: { xs: 8, md: 0 },
          }}
        >
          <Header selectedTab={selectedTab} />
          {selectedTab === 'home' && <MainGrid />}
          {selectedTab === 'admins' && (
            <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' }, mt: 2 }}>
              <Paper variant="outlined" sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                  Admin Management
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Manage system administrators, invitations, and role privileges.
                </Typography>
              </Paper>
            </Box>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
