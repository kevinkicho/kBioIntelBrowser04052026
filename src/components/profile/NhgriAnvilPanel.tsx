/** Panel component for NHGRI AnVIL. */

import type { AnvilDataset } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface NhgriAnvilPanelProps {
  data: AnvilDataset[]
  isLoading: boolean
}

export function NhgriAnvilPanel({ data, isLoading }: NhgriAnvilPanelProps) {
  if (isLoading) {
    return <div className="p-4">Loading NHGRI AnVIL data...</div>
  }
  
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <Alert>
        <AlertTitle>No Data</AlertTitle>
        <AlertDescription>No genomic datasets found for this molecule.</AlertDescription>
      </Alert>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>NHGRI AnVIL Datasets</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dataset ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Study</TableHead>
                <TableHead>Participants</TableHead>
                <TableHead>Samples</TableHead>
                <TableHead>Data Types</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((dataset) => (
                <TableRow key={dataset.datasetId}>
                  <TableCell>{dataset.datasetId}</TableCell>
                  <TableCell>{dataset.name}</TableCell>
                  <TableCell>{dataset.studyName}</TableCell>
                  <TableCell>{dataset.participantCount}</TableCell>
                  <TableCell>{dataset.sampleCount}</TableCell>
                  <TableCell>{dataset.dataTypes.join(', ')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}