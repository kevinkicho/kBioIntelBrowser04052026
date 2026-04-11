/** Panel component for NINDS NeuroMMSig. */

import type { NeuroMMSigSignature } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/Badge'

interface NindsNeurommsigPanelProps {
  data: NeuroMMSigSignature[]
  isLoading: boolean
}

export function NindsNeurommsigPanel({ data, isLoading }: NindsNeurommsigPanelProps) {
  if (isLoading) {
    return <div className="p-4">Loading NINDS NeuroMMSig data...</div>
  }
  
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <Alert>
        <AlertTitle>No Data</AlertTitle>
        <AlertDescription>No neurological disease signatures found for this molecule.</AlertDescription>
      </Alert>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>NINDS NeuroMMSig Signatures</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[400px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Signature ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Disease</TableHead>
                <TableHead>Mechanism</TableHead>
                <TableHead>Genes</TableHead>
                <TableHead>Drugs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((signature) => (
                <TableRow key={signature.signatureId}>
                  <TableCell>{signature.signatureId}</TableCell>
                  <TableCell>{signature.name}</TableCell>
                  <TableCell>{signature.disease}</TableCell>
                  <TableCell>{signature.mechanism}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {signature.genes.map((gene) => (
                        <Badge key={gene} variant="secondary">{gene}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {signature.drugs.map((drug) => (
                        <Badge key={drug} variant="outline">{drug}</Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}