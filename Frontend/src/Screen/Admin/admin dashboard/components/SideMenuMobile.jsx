import Avatar from '@mui/material/Avatar';
import { logoutUser } from "../../../../services/authService";
import PropTypes from 'prop-types';
import Divider from '@mui/material/Divider';
import Drawer, { drawerClasses } from '@mui/material/Drawer';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import MenuContent from './MenuContent';
import { useSelector } from "react-redux";
import { selectUserEmail, selectUserName } from "../../../../redux/slices/authSlice";
import Button from '../../../../Components/atoms/Button/Button';

function SideMenuMobile({ open, toggleDrawer, selectedTab, onTabSelect }) {
  // The JWT is in an HTTP-only cookie, so the admin's details come from Redux.
  const adminUser = {
    name: useSelector(selectUserName),
    email: useSelector(selectUserEmail),
  };

  const handleLogout = () => {
    // Keep the existing full clear; the backend clears the auth cookie and
    // the Redux state is reset and written to storage before the reload.
    localStorage.clear();
    logoutUser().finally(() => {
      window.location.href = "/admin/login";
    });
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
            >{ adminUser?.email?.charAt(0).toUpperCase() || 'A'}</Avatar>
            <Typography component="p" variant="h6">
              {adminUser?.name || 'Admin'}
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
