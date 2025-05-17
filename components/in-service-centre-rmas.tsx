"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { sendRMAReadyEmail } from "@/lib/email"
import { Search, Loader2 } from "lucide-react"

interface RMA {
  id: string
  contactName: string
  contactEmail: string
  brand: string
  modelNumber: string
  serialNumber: string
  problemsReported: string
  createdAt: any
  remark: string
}

export function InServiceCentreRMAs() {
  const [rmas, setRmas] = useState<RMA[]>([])
  const [filteredRmas, setFilteredRmas] = useState<RMA[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [remarks, setRemarks] = useState<Record<string, string>>({})
  const [loadingRmas, setLoadingRmas] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const fetchRMAs = async () => {
      try {
        const rmaCollection = collection(db, "rmas")
        const rmaQuery = query(rmaCollection, where("status", "==", "in_service_centre"))
        const rmaSnapshot = await getDocs(rmaQuery)

        const rmaList = rmaSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as RMA[]

        // Initialize remarks state
        const initialRemarks: Record<string, string> = {}
        rmaList.forEach((rma) => {
          initialRemarks[rma.id] = rma.remark || ""
        })

        setRemarks(initialRemarks)
        setRmas(rmaList)
        setFilteredRmas(rmaList)
      } catch (error) {
        console.error("Error fetching RMAs:", error)
        toast({
          title: "Error",
          description: "Failed to load RMAs. Please refresh the page.",
          variant: "destructive",
        })
      }
    }

    fetchRMAs()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const filtered = rmas.filter(
        (rma) =>
          rma.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          rma.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
          rma.modelNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          rma.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      setFilteredRmas(filtered)
    } else {
      setFilteredRmas(rmas)
    }
  }, [searchQuery, rmas])

  const handleRemarkChange = (id: string, value: string) => {
    setRemarks((prev) => ({ ...prev, [id]: value }))
  }

  const handleStatusChange = async (id: string, markAsReady: boolean) => {
    setLoadingRmas((prev) => ({ ...prev, [id]: true }))

    try {
      const rmaRef = doc(db, "rmas", id)

      if (markAsReady) {
        // Generate a random 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString()

        // Update RMA status to ready
        await updateDoc(rmaRef, {
          status: "ready",
          isReady: true,
          remark: remarks[id],
          otp,
          updatedAt: serverTimestamp(),
        })

        // Find the RMA in the list
        const rma = rmas.find((r) => r.id === id)

        if (rma) {
          // Send email notification with OTP
          await sendRMAReadyEmail({
            to: rma.contactEmail,
            name: rma.contactName,
            rmaId: id,
            productDetails: `${rma.brand} ${rma.modelNumber}`,
            otp,
          })
        }

        toast({
          title: "Status Updated",
          description: "RMA marked as ready and customer has been notified",
        })

        // Remove from the list
        setRmas((prev) => prev.filter((rma) => rma.id !== id))
        setFilteredRmas((prev) => prev.filter((rma) => rma.id !== id))
      } else {
        // Just update the remark
        await updateDoc(rmaRef, {
          remark: remarks[id],
          updatedAt: serverTimestamp(),
        })

        toast({
          title: "Remark Saved",
          description: "The remark has been saved successfully",
        })
      }
    } catch (error) {
      console.error("Error updating RMA:", error)
      toast({
        title: "Error",
        description: "Failed to update RMA. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingRmas((prev) => ({ ...prev, [id]: false }))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search RMAs..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Serial Number</TableHead>
              <TableHead>Date Created</TableHead>
              <TableHead>Remark</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRmas.length > 0 ? (
              filteredRmas.map((rma) => (
                <TableRow key={rma.id}>
                  <TableCell className="font-medium">{rma.contactName}</TableCell>
                  <TableCell>{`${rma.brand} ${rma.modelNumber}`}</TableCell>
                  <TableCell>{rma.serialNumber}</TableCell>
                  <TableCell>
                    {rma.createdAt?.toDate ? new Date(rma.createdAt.toDate()).toLocaleDateString() : "N/A"}
                  </TableCell>
                  <TableCell>
                    <Textarea
                      value={remarks[rma.id] || ""}
                      onChange={(e) => handleRemarkChange(rma.id, e.target.value)}
                      className="min-h-[80px]"
                      placeholder="Add service remarks here..."
                    />
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-300">
                      In Service Centre
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(rma.id, false)}
                        disabled={loadingRmas[rma.id]}
                      >
                        {loadingRmas[rma.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Remark"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleStatusChange(rma.id, true)}
                        disabled={loadingRmas[rma.id]}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {loadingRmas[rma.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mark as Ready"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No RMAs in service centre.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
