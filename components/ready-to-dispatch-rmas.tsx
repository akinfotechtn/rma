"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { sendRMADeliveredEmail } from "@/lib/email"
import { Search, Loader2 } from "lucide-react"

interface RMA {
  id: string
  contactName: string
  contactEmail: string
  brand: string
  modelNumber: string
  serialNumber: string
  createdAt: any
  otp: string
}

export function ReadyToDispatchRMAs() {
  const [rmas, setRmas] = useState<RMA[]>([])
  const [filteredRmas, setFilteredRmas] = useState<RMA[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({})
  const [loadingRmas, setLoadingRmas] = useState<Record<string, boolean>>({})
  const [requireOtp, setRequireOtp] = useState(true)

  useEffect(() => {
    const fetchRMAs = async () => {
      try {
        // First get settings
        const settingsDoc = await getDoc(doc(db, "settings", "general"))
        if (settingsDoc.exists()) {
          setRequireOtp(settingsDoc.data().requireOtp ?? true)
        }

        // Then get RMAs
        const rmaCollection = collection(db, "rmas")
        const rmaQuery = query(rmaCollection, where("status", "==", "ready"))
        const rmaSnapshot = await getDocs(rmaQuery)

        const rmaList = rmaSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as RMA[]

        // Initialize OTP inputs state
        const initialOtps: Record<string, string> = {}
        rmaList.forEach((rma) => {
          initialOtps[rma.id] = ""
        })

        setOtpInputs(initialOtps)
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

  const handleOtpChange = (id: string, value: string) => {
    setOtpInputs((prev) => ({ ...prev, [id]: value }))
  }

  const handleMarkAsDelivered = async (id: string) => {
    setLoadingRmas((prev) => ({ ...prev, [id]: true }))

    try {
      const rmaRef = doc(db, "rmas", id)
      const rma = rmas.find((r) => r.id === id)

      if (!rma) {
        throw new Error("RMA not found")
      }

      // Check OTP if required
      if (requireOtp && rma.otp !== otpInputs[id]) {
        toast({
          title: "Invalid OTP",
          description: "The OTP you entered is incorrect. Please try again.",
          variant: "destructive",
        })
        setLoadingRmas((prev) => ({ ...prev, [id]: false }))
        return
      }

      // Update RMA status to delivered
      await updateDoc(rmaRef, {
        status: "delivered",
        isDelivered: true,
        deliveredAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      // Send email notification
      await sendRMADeliveredEmail({
        to: rma.contactEmail,
        name: rma.contactName,
        rmaId: id,
        productDetails: `${rma.brand} ${rma.modelNumber}`,
      })

      toast({
        title: "Status Updated",
        description: "RMA marked as delivered and customer has been notified",
      })

      // Remove from the list
      setRmas((prev) => prev.filter((rma) => rma.id !== id))
      setFilteredRmas((prev) => prev.filter((rma) => rma.id !== id))
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
              <TableHead>Status</TableHead>
              <TableHead>OTP</TableHead>
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
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300">
                      Ready to Dispatch
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {requireOtp ? (
                      <Input
                        value={otpInputs[rma.id] || ""}
                        onChange={(e) => handleOtpChange(rma.id, e.target.value)}
                        placeholder="Enter OTP"
                        className="w-24 border-blue-200"
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">Not Required</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => handleMarkAsDelivered(rma.id)}
                      disabled={loadingRmas[rma.id]}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {loadingRmas[rma.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mark as Delivered"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No RMAs ready to dispatch.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
