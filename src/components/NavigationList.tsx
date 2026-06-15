import { Button, Stack } from '@mui/material'
import { NavLink } from 'react-router'
import { navigationItems } from './navigationItems'

type NavigationListProps = {
  direction?: 'horizontal' | 'vertical'
  onNavigate?: () => void
}

export function NavigationList({ direction = 'vertical', onNavigate }: NavigationListProps) {
  const isHorizontal = direction === 'horizontal'

  return (
    <Stack
      component="nav"
      direction={isHorizontal ? 'row' : 'column'}
      spacing={0.75}
      className={isHorizontal ? 'overflow-x-auto' : undefined}
    >
      {navigationItems.map((item) => {
        const Icon = item.icon

        return (
          <Button
            key={item.label}
            component={NavLink}
            to={item.to}
            startIcon={<Icon size={18} />}
            onClick={onNavigate}
            className={isHorizontal ? 'min-w-max justify-start' : 'justify-start'}
            sx={{
              color: 'text.secondary',
              px: 1.5,
              '&.active': {
                bgcolor: 'action.selected',
                color: 'primary.main',
              },
            }}
          >
            {item.label}
          </Button>
        )
      })}
    </Stack>
  )
}
