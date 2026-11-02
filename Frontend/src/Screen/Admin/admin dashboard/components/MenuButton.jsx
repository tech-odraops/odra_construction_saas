import Badge, { badgeClasses } from '@mui/material/Badge';
import PropTypes from 'prop-types';
import Button from '../../../../Components/atoms/Button/Button';

function MenuButton({ showBadge = false, ...props }) {
  return (
    <Badge
      color="error"
      variant="dot"
      invisible={!showBadge}
      sx={{ [`& .${badgeClasses.badge}`]: { right: 2, top: 2 } }}
    >
      <Button iconOnly size="small" {...props} />
    </Badge>
  );
}

MenuButton.propTypes = {
  showBadge: PropTypes.bool,
};

export default MenuButton;
