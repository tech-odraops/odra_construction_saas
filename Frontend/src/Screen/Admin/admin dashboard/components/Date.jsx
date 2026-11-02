import * as React from 'react';
import dayjs from 'dayjs';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import Button from '../../../../Components/atoms/Button/Button';

export default function CustomDatePicker() {
  const today = dayjs().format('MMM DD, YYYY');

  return (
    <Button
      variant="outlined"
      size="small"
      startIcon={<CalendarTodayRoundedIcon fontSize="small" />}
      style={{ minWidth: 'fit-content' }}
    >
      {today}
    </Button>
  );
}