/** Panel component for NIAID ImmPort. */

import type { ImmPortStudy } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface NiaidImmportPanelProps {
  data: ImmPortStudy[]
  isLoading: boolean
}

export function NiaidImmportPanel({ data, isLoading }: NiaidImmportPanelProps) {
  if (isLoading) {
    return <div className="p-4">Loading NIAID ImmPort data...</div>
  }
  
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <Alert>
        <AlertTitle>No Data</AlertTitle>
        <AlertDescription>No immunology studies found for this molecule.</AlertDescription>
      </Alert>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>NIAID ImmPort Studies</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Study ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Participants</TableHead>
                <TableHead>Arms</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((study) => (
                <TableRow key={study.studyId}>
                  <TableCell>{study.studyId}</TableCell>
                  <TableCell>{study.title}</TableCell>
                  <TableCell>{study.studyType}</TableCell>
                  <TableCell>{study.conditionStudied || 'N/A'}</TableCell>
                  <TableCell>{study.participantCount}</TableCell>
                  <TableCell>{study.arms.join(', ')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}