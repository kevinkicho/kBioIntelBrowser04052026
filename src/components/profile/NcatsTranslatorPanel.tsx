/** Panel component for NCATS Biomedical Translator. */

import type { TranslatorAssociation } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface NcatsTranslatorPanelProps {
  data: TranslatorAssociation[]
  isLoading: boolean
}

export function NcatsTranslatorPanel({ data, isLoading }: NcatsTranslatorPanelProps) {
  if (isLoading) {
    return <div className="p-4">Loading NCATS Translator data...</div>
  }
  
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <Alert>
        <AlertTitle>No Data</AlertTitle>
        <AlertDescription>No biomedical associations found for this molecule.</AlertDescription>
      </Alert>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>NCATS Biomedical Translator</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Predicate</TableHead>
                <TableHead>Object</TableHead>
                <TableHead>Edge Label</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((association, index) => (
                <TableRow key={index}>
                  <TableCell>{association.subject}</TableCell>
                  <TableCell>{association.predicate}</TableCell>
                  <TableCell>{association.object}</TableCell>
                  <TableCell>{association.edgeLabel}</TableCell>
                  <TableCell>{association.source}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}