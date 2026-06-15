import { Box, Skeleton, Stack } from '@mui/material'

type MaintenanceSkeletonProps = {
  layout?: 'grid' | 'table'
}

export function MaintenanceSkeleton({ layout = 'table' }: MaintenanceSkeletonProps) {
  return (
    <Stack spacing={4} className="animate-pulse w-full">
      {/* Header Skeleton */}
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }} className="flex-wrap gap-4">
        <Stack spacing={1.25} sx={{ flexGrow: 1 }}>
          {/* Icon + Category */}
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Skeleton variant="circular" width={24} height={24} />
            <Skeleton variant="text" width={100} height={18} sx={{ borderRadius: 1 }} />
          </Stack>
          {/* Title */}
          <Skeleton variant="text" width={220} height={36} sx={{ borderRadius: 1.5 }} />
          {/* Description */}
          <Skeleton variant="text" width={360} height={20} sx={{ borderRadius: 1 }} />
        </Stack>
      </Stack>

      {/* Grid or Table Layout */}
      {layout === 'grid' ? (
        <Box className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Box
              key={i}
              sx={{
                bgcolor: 'background.paper',
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                p: 3,
                minHeight: 160,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                {/* Logo/Icon placeholder */}
                <Skeleton variant="rectangular" width={48} height={48} sx={{ borderRadius: 2 }} />
                {/* 3-dots actions placeholder */}
                <Skeleton variant="circular" width={20} height={20} />
              </Stack>
              <Stack spacing={1} sx={{ mt: 2 }}>
                <Skeleton variant="text" width="65%" height={24} sx={{ borderRadius: 1 }} />
                <Skeleton variant="text" width="85%" height={16} sx={{ borderRadius: 1 }} />
              </Stack>
            </Box>
          ))}
        </Box>
      ) : (
        <Stack spacing={2.5} sx={{ bgcolor: 'background.paper', borderRadius: 3, border: '1px solid', borderColor: 'divider', p: 3 }}>
          {/* Toolbar Search / Filter placeholders */}
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1.5 }}>
            <Skeleton variant="rectangular" width={200} height={36} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" width={110} height={36} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" width={110} height={36} sx={{ borderRadius: 2 }} />
          </Stack>
          {/* Table rows placeholders */}
          <Stack spacing={1} sx={{ mt: 1 }}>
            {/* Header row */}
            <Box sx={{ display: 'flex', gap: 2, py: 1.5, borderBottom: '2px solid', borderColor: 'divider' }}>
              <Skeleton variant="text" width="20%" height={20} />
              <Skeleton variant="text" width="35%" height={20} />
              <Skeleton variant="text" width="25%" height={20} />
              <Skeleton variant="text" width="20%" height={20} />
            </Box>
            {/* Body rows */}
            {Array.from({ length: 6 }).map((_, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 2, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Skeleton variant="text" width="18%" height={16} />
                <Skeleton variant="text" width="38%" height={16} />
                <Skeleton variant="text" width="22%" height={16} />
                <Skeleton variant="text" width="22%" height={16} />
              </Box>
            ))}
          </Stack>
        </Stack>
      )}
    </Stack>
  )
}
