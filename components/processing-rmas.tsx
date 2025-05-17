"use client"

import { useEffect, useState } from "react"
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { Loader2, ArrowRight } from "lucide-react"
import { RMAActionsMenu } from "@/components/rma-actions-menu"

interface RMA {
  id: string
  contactName: string
  contactCompany: string
  brand: string
  modelNumber: string
  serialNumber: string
  problemsReported: string
  createdAt: any
}

export function ProcessingRMAs() {
  const [rmas, setRmas] = useState<RMA[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchRMAs = async () => {
      try {
        const q = query(collection(db, "rmas"), where("status", "==", "processing"))
        const querySnapshot = await getDocs(q)
        const rmaList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as RMA[]

        setRmas(rmaList)
      } catch (error) {
        console.error("Error fetching RMAs:", error)
        toast({
          title: "Error",
          description: "Failed to load processing RMAs",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchRMAs()
  }, [])

  const handleSendToServiceCentre = async (id: string) => {
    setProcessingId(id)
    try {
      const rmaRef = doc(db, "rmas", id)
      await updateDoc(rmaRef, {
        status: "in_service_centre",
        updatedAt: new Date(),
      })

      // Update local state
      setRmas((prev) => prev.filter((rma) => rma.id !== id))

      toast({
        title: "RMA Updated",
        description: "RMA has been sent to service centre",
      })
    } catch (error) {
      console.error("Error updating RMA:", error)
      toast({
        title: "Error",
        description: "Failed to update RMA status",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (rmas.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No RMAs currently in processing</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-muted/50">
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Customer</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Product</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Serial Number</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Issue</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Date Created</th>
            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rmas.map((rma) => (
            <tr key={rma.id} className="hover:bg-muted/50">
              <td className="px-4 py-3 text-sm">
                <div className="font-medium">{rma.contactName || "N/A"}</div>
                <div className="text-xs text-muted-foreground">{rma.contactCompany}</div>
              </td>
              <td className="px-4 py-3 text-sm">
                {rma.brand} {rma.modelNumber}
              </td>
              <td className="px-4 py-3 text-sm">{rma.serialNumber}</td>
              <td className="px-4 py-3 text-sm max-w-[200px] truncate" title={rma.problemsReported}>
                {rma.problemsReported}
              </td>
              <td className="px-4 py-3 text-sm">
                {rma.createdAt?.toDate ? new Date(rma.createdAt.toDate()).toLocaleDateString() : "N/A"}
              </td>
              <td className="px-4 py-3 text-sm text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleSendToServiceCentre(rma.id)}
                    disabled={processingId === rma.id}
                    className="h-8 gap-1 bg-yellow-600 hover:bg-yellow-700"
                  >
                    {processingId === rma.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        Send to Service <ArrowRight className="h-3 w-3" />
                      </>
                    )}
                  </Button>
                  <RMAActionsMenu rmaId={rma.id} status="processing" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
