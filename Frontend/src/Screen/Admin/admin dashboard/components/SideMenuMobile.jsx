import Avatar from '@mui/material/Avatar';
import PropTypes from 'prop-types';
import Divider from '@mui/material/Divider';
import Drawer, { drawerClasses } from '@mui/material/Drawer';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import MenuContent from './MenuContent';
import { jwtDecode } from "jwt-decode";
import Button from '../../../../Components/atoms/Button/Button';

function SideMenuMobile({ open, toggleDrawer, selectedTab, onTabSelect }) {
  const token = localStorage.getItem("token");
  let decoded = null;
  try {
    if (token) decoded = jwtDecode(token);
  } catch (e) {
    console.error("Token decode error:", e);
  }

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/admin/login";
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={toggleDrawer(false)}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        [`& .${drawerClasses.paper}`]: {
          backgroundImage: 'none',
          backgroundColor: 'background.paper',
        },
      }}
    >
      <Stack
        sx={{
          maxWidth: '70dvw',
          height: '100%',
        }}
      >
        <Stack direction="row" sx={{ p: 2, pb: 0, gap: 1 }}>
          <Stack
            direction="row"
            sx={{ gap: 1, alignItems: 'center', flexGrow: 1, p: 1 }}
          >
            <Avatar
              sizes="small"
              alt="name"
              sx={{ width: 24, height: 24 }}
            >{ decoded?.email?.charAt(0).toUpperCase() || 'A'}</Avatar>
            <Typography component="p" variant="h6">
              {decoded?.name || 'Admin'}
            </Typography>
          </Stack>
        </Stack>
        <Divider />
        <Stack sx={{ flexGrow: 1 }}>
          <MenuContent
            selectedTab={selectedTab}
            onTabSelect={(tab) => {
              if (onTabSelect) onTabSelect(tab);
              toggleDrawer(false)();
            }}
          />
          <Divider />
        </Stack>
        <Stack sx={{ p: 2 }}>
          <Button variant="outlined" fullWidth startIcon={<LogoutRoundedIcon />} onClick={handleLogout}>
            Logout
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}

SideMenuMobile.propTypes = {
  open: PropTypes.bool,
  toggleDrawer: PropTypes.func.isRequired,
  selectedTab: PropTypes.string,
  onTabSelect: PropTypes.func,
};

export default SideMenuMobile;
