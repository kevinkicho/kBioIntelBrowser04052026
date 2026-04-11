/** Panel component for NCI Cancer Data Standards Registry (caDSR). */

import type { CadsrConcept } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface NciCadsrPanelProps {
  data: CadsrConcept[]
  isLoading: boolean
}

export function NciCadsrPanel({ data, isLoading }: NciCadsrPanelProps) {
  if (isLoading) {
    return <div className="p-4">Loading NCI caDSR data...</div>
  }
  
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <Alert>
        <AlertTitle>No Data</AlertTitle>
        <AlertDescription>No cancer data standards found for this molecule.</AlertDescription>
      </Alert>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>NCI Cancer Data Standards</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[400px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Concept ID</TableHead>
                <TableHead>Preferred Name</TableHead>
                <TableHead>Context</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((concept) => (
                <TableRow key={concept.conceptId}>
                  <TableCell>{concept.conceptId}</TableCell>
                  <TableCell>{concept.preferredName}</TableCell>
                  <TableCell>{concept.context}</TableCell>
                  <TableCell>{concept.workflowStatus}</TableCell>
                  <TableCell>{concept.evsSource || 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}