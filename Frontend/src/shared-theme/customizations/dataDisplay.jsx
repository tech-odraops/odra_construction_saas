import { alpha } from '@mui/material/styles';
import { svgIconClasses } from '@mui/material/SvgIcon';
import { typographyClasses } from '@mui/material/Typography';
import { buttonBaseClasses } from '@mui/material/ButtonBase';
import { chipClasses } from '@mui/material/Chip';
import { gray} from '../themePrimitives';

/* eslint-disable import/prefer-default-export */
export const dataDisplayCustomizations = {
  MuiList: {
    styleOverrides: {
      root: {
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      },
    },
  },
  MuiListItem: {
    styleOverrides: {
      root: ({ theme }) => ({
        [`& .${svgIconClasses.root}`]: {
          width: '1rem',
          height: '1rem',
          color: (theme.vars || theme).palette.text.secondary,
        },
        [`& .${typographyClasses.root}`]: {
          fontWeight: 500,
        },
        [`& .${buttonBaseClasses.root}`]: {
          display: 'flex',
          gap: 8,
          padding: '2px 8px',
          borderRadius: (theme.vars || theme).shape.borderRadius,
          opacity: 0.7,
          '&.Mui-selected': {
            opacity: 1,
            backgroundColor: alpha(theme.palette.action.selected, 0.3),
            [`& .${svgIconClasses.root}`]: {
              color: (theme.vars || theme).palette.text.primary,
            },
            '&:focus-visible': {
              backgroundColor: alpha(theme.palette.action.selected, 0.3),
            },
            '&:hover': {
              backgroundColor: alpha(theme.palette.action.selected, 0.5),
            },
          },
          '&:focus-visible': {
            backgroundColor: 'transparent',
          },
        },
      }),
    },
  },
  MuiListItemText: {
    styleOverrides: {
      primary: ({ theme }) => ({
        fontSize: theme.typography.body2.fontSize,
        fontWeight: 500,
        lineHeight: theme.typography.body2.lineHeight,
      }),
      secondary: ({ theme }) => ({
        fontSize: theme.typography.caption.fontSize,
        lineHeight: theme.typography.caption.lineHeight,
      }),
    },
  },
  MuiListItemIcon: {
    styleOverrides: {
      root: {
        minWidth: 0,
      },
    },
  },
  MuiChip: {
    defaultProps: {
      size: 'small',
    },
    styleOverrides: {
      root: ({ theme }) => ({
        border: '1px solid',
        borderRadius: '999px',
        [`& .${chipClasses.label}`]: {
          fontWeight: 600,
        },
        variants: [
          {
            props: {
              color: 'default',
            },
            style: {
              borderColor: theme.palette.divider,
              backgroundColor: gray[100],
              [`& .${chipClasses.label}`]: {
                color: theme.palette.text.secondary,
              },
              [`& .${chipClasses.icon}`]: {
                color: theme.palette.text.secondary,
              }
            },
          },
          {
            props: {
              color: 'success',
            },
            style: {
              borderColor: theme.palette.divider,
              backgroundColor: alpha(theme.palette.success.main, 0.1),
              [`& .${chipClasses.label}`]: {
                color: alpha(theme.palette.success.main, 0.1),
              },
              [`& .${chipClasses.icon}`]: {
                color: alpha(theme.palette.success.main, 0.1),
              },
      
            },
          },
          {
            props: {
              color: 'error',
            },
            style: {
              borderColor: theme.palette.divider,
              backgroundColor: alpha(theme.palette.success.main, 0.1),
              [`& .${chipClasses.label}`]: {
                color: theme.palette.success.main,
              },
              [`& .${chipClasses.icon}`]: {
                color: theme.palette.success.main,
              },
            },
          },
          {
            props: { size: 'small' },
            style: {
              maxHeight: 20,
              [`& .${chipClasses.label}`]: {
                fontSize: theme.typography.caption.fontSize,
              },
              [`& .${svgIconClasses.root}`]: {
                fontSize: theme.typography.caption.fontSize,
              },
            },
          },
          {
            props: { size: 'medium' },
            style: {
              [`& .${chipClasses.label}`]: {
                fontSize: theme.typography.caption.fontSize,
              },
            },
          },
        ],
      }),
    },
  },
  // MuiTablePagination: {
  //   styleOverrides: {
  //     actions: {
  //       display: 'flex',
  //       gap: 8,
  //       marginRight: 6,
  //       [`& .${iconButtonClasses.root}`]: {
  //         minWidth: 0,
  //         width: 36,
  //         height: 36,
  //       },
  //     },
  //   },
  // },
  // MuiIcon: {
  //   defaultProps: {
  //     fontSize: 'small',
  //   },
  //   styleOverrides: {
  //     root: {
  //       variants: [
  //         {
  //           props: {
  //             fontSize: 'small',
  //           },
  //           style: {
  //             fontSize: '1rem',
  //           },
  //         },
  //       ],
  //     },
  //   },
  // },
  // MuiListSubheader: {
  //   styleOverrides: {
  //     root: ({ theme }) => ({
  //       backgroundColor: 'transparent',
  //       padding: '4px 8px',
  //       fontSize: theme.typography.caption.fontSize,
  //       fontWeight: 500,
  //       lineHeight: theme.typography.caption.lineHeight,
  //     }),
  //   },
  // }
};
