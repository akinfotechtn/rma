"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Search } from "lucide-react"

interface RMA {
  id: string
  contactName: string
  brand: string
  modelNumber: string
  serialNumber: string
  createdAt: any
  deliveredAt: any
}

export function DeliveredRMAs() {
  const [rmas, setRmas] = useState<RMA[]>([])
  const [filteredRmas, setFilteredRmas] = useState<RMA[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const fetchRMAs = async () => {
      try {
        const rmaCollection = collection(db, "rmas")
        const rmaQuery = query(rmaCollection, where("status", "==", "delivered"))
        const rmaSnapshot = await getDocs(rmaQuery)

        const rmaList = rmaSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as RMA[]

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
              <TableHead>Date Delivered</TableHead>
              <TableHead>Status</TableHead>
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
                    {rma.deliveredAt?.toDate ? new Date(rma.deliveredAt.toDate()).toLocaleDateString() : "N/A"}
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-300">Delivered</Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No delivered RMAs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
