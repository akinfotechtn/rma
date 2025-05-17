"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { ProcessingRMAs } from "@/components/processing-rmas"
import { InServiceCentreRMAs } from "@/components/in-service-centre-rmas"
import { ReadyToDispatchRMAs } from "@/components/ready-to-dispatch-rmas"
import { DeliveredRMAs } from "@/components/delivered-rmas"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { PlusCircle, Package2, Wrench, CheckCircle, TruckIcon as TruckDelivery, Search } from "lucide-react"
import { Input } from "@/components/ui/input"

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalRMAs: 0,
    processing: 0,
    inServiceCentre: 0,
    readyToDispatch: 0,
    delivered: 0,
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const rmaCollection = collection(db, "rmas")

        // Get total RMAs
        const totalSnapshot = await getDocs(rmaCollection)
        const total = totalSnapshot.size

        // Get processing RMAs
        const processingQuery = query(rmaCollection, where("status", "==", "processing"))
        const processingSnapshot = await getDocs(processingQuery)
        const processing = processingSnapshot.size

        // Get in service centre RMAs
        const inServiceQuery = query(rmaCollection, where("status", "==", "in_service_centre"))
        const inServiceSnapshot = await getDocs(inServiceQuery)
        const inService = inServiceSnapshot.size

        // Get ready to dispatch RMAs
        const readyQuery = query(rmaCollection, where("status", "==", "ready"))
        const readySnapshot = await getDocs(readyQuery)
        const ready = readySnapshot.size

        // Get delivered RMAs
        const deliveredQuery = query(rmaCollection, where("status", "==", "delivered"))
        const deliveredSnapshot = await getDocs(deliveredQuery)
        const delivered = deliveredSnapshot.size

        setStats({
          totalRMAs: total,
          processing: processing,
          inServiceCentre: inService,
          readyToDispatch: ready,
          delivered: delivered,
        })
      } catch (error) {
        console.error("Error fetching stats:", error)
      }
    }

    fetchStats()
  }, [])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const rmaCollection = collection(db, "rmas")
      const snapshot = await getDocs(rmaCollection)

      const results = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter(
          (rma) =>
            rma.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            rma.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            rma.modelNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            rma.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            rma.id.toLowerCase().includes(searchQuery.toLowerCase()),
        )

      setSearchResults(results)
    } catch (error) {
      console.error("Error searching RMAs:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "processing":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Processing
          </span>
        )
      case "in_service_centre":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            In Service Centre
          </span>
        )
      case "ready":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Ready to Dispatch
          </span>
        )
      case "delivered":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Delivered
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">RMA Management Dashboard</h1>
        <Link href="/dashboard/raise-rma">
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
            <PlusCircle className="h-4 w-4" />
            Raise New RMA
          </Button>
        </Link>
      </div>

      {/* Global Search */}
      <Card className="bg-gradient-to-r from-slate-50 to-slate-100">
        <CardHeader className="pb-2">
          <CardTitle>Global Search</CardTitle>
          <CardDescription>Search for RMAs by customer name, serial number, model, or brand</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search across all RMAs..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4 border rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Serial Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {searchResults.map((rma) => (
                    <tr key={rma.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {rma.contactName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{`${rma.brand} ${rma.modelNumber}`}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rma.serialNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getStatusBadge(rma.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {searchQuery && searchResults.length === 0 && !isSearching && (
            <div className="mt-4 text-center py-8 bg-gray-50 rounded-md">
              <p className="text-gray-500">No results found for "{searchQuery}"</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-5">
        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package2 className="h-4 w-4 text-gray-500" />
              Total RMAs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRMAs}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package2 className="h-4 w-4 text-yellow-500" />
              Processing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">{stats.processing}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wrench className="h-4 w-4 text-purple-500" />
              In Service Centre
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{stats.inServiceCentre}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-500" />
              Ready to Dispatch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{stats.readyToDispatch}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TruckDelivery className="h-4 w-4 text-green-500" />
              Delivered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{stats.delivered}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="processing" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-slate-100">
          <TabsTrigger
            value="processing"
            className="data-[state=active]:bg-yellow-100 data-[state=active]:text-yellow-900 data-[state=active]:shadow py-3"
          >
            <Package2 className="h-4 w-4 mr-2" />
            Processing
          </TabsTrigger>
          <TabsTrigger
            value="in_service_centre"
            className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-900 data-[state=active]:shadow py-3"
          >
            <Wrench className="h-4 w-4 mr-2" />
            In Service Centre
          </TabsTrigger>
          <TabsTrigger
            value="ready"
            className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900 data-[state=active]:shadow py-3"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Ready to Dispatch
          </TabsTrigger>
          <TabsTrigger
            value="delivered"
            className="data-[state=active]:bg-green-100 data-[state=active]:text-green-900 data-[state=active]:shadow py-3"
          >
            <TruckDelivery className="h-4 w-4 mr-2" />
            Delivered
          </TabsTrigger>
        </TabsList>
        <TabsContent value="processing" className="space-y-4">
          <Card className="border-yellow-200">
            <CardHeader className="bg-yellow-50 rounded-t-lg">
              <CardTitle className="text-yellow-800 flex items-center gap-2">
                <Package2 className="h-5 w-5" />
                Processing RMAs
              </CardTitle>
              <CardDescription>
                RMAs that are currently being processed. Send to service centre when ready.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ProcessingRMAs />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="in_service_centre" className="space-y-4">
          <Card className="border-purple-200">
            <CardHeader className="bg-purple-50 rounded-t-lg">
              <CardTitle className="text-purple-800 flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                In Service Centre RMAs
              </CardTitle>
              <CardDescription>
                RMAs that are currently in the service centre. Mark as ready when repaired.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <InServiceCentreRMAs />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="ready" className="space-y-4">
          <Card className="border-blue-200">
            <CardHeader className="bg-blue-50 rounded-t-lg">
              <CardTitle className="text-blue-800 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Ready to Dispatch RMAs
              </CardTitle>
              <CardDescription>RMAs that are ready to be dispatched. Enter OTP to mark as delivered.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ReadyToDispatchRMAs />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="delivered" className="space-y-4">
          <Card className="border-green-200">
            <CardHeader className="bg-green-50 rounded-t-lg">
              <CardTitle className="text-green-800 flex items-center gap-2">
                <TruckDelivery className="h-5 w-5" />
                Delivered RMAs
              </CardTitle>
              <CardDescription>RMAs that have been delivered to customers.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <DeliveredRMAs />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
