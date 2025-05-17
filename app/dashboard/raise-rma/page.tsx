"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { collection, doc, getDoc, getDocs, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { ContactDialog } from "@/components/contact-dialog"
import { BrandDialog } from "@/components/brand-dialog"
import { sendRMAConfirmationEmail } from "@/lib/email"
import { Loader2, Plus, Search, Building, User, Mail, Phone, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { CheckIcon } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { DatePicker } from "@/components/ui/date-picker"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Contact {
  id: string
  name?: string
  email: string
  phone: string
  company: string
  address?: string
}

interface Brand {
  id: string
  name: string
}

interface CustomField {
  id: string
  name: string
  label: string
  type: string
  required: boolean
  defaultValue?: string
  options?: string[]
  description?: string
}

export default function RaiseRMAPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const contactId = searchParams.get("contactId")

  const [isLoading, setIsLoading] = useState(false)
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false)
  const [isBrandDialogOpen, setIsBrandDialogOpen] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [selectedContact, setSelectedContact] = useState<string>("")
  const [contactSearchOpen, setContactSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [formData, setFormData] = useState({
    brand: "",
    modelNumber: "",
    serialNumber: "",
    problemsReported: "",
    comments: "",
    customFields: {} as Record<string, any>,
  })

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const contactsCollection = collection(db, "contacts")
        const contactsSnapshot = await getDocs(contactsCollection)
        const contactsList = contactsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Contact[]

        setContacts(contactsList)
        setFilteredContacts(contactsList)

        // If contactId is provided in URL, set it as selected
        if (contactId) {
          setSelectedContact(contactId)
        }
      } catch (error) {
        console.error("Error fetching contacts:", error)
      }
    }

    const fetchBrands = async () => {
      try {
        const brandsCollection = collection(db, "brands")
        const brandsSnapshot = await getDocs(brandsCollection)
        const brandsList = brandsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Brand[]

        setBrands(brandsList)
      } catch (error) {
        console.error("Error fetching brands:", error)
      }
    }

    const fetchCustomFields = async () => {
      try {
        const customFieldsCollection = collection(db, "customFields")
        const customFieldsSnapshot = await getDocs(customFieldsCollection)
        const customFieldsList = customFieldsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as CustomField[]

        setCustomFields(customFieldsList)

        // Initialize custom fields with default values
        const initialCustomFields: Record<string, any> = {}
        customFieldsList.forEach((field) => {
          if (field.defaultValue !== undefined) {
            if (field.type === "checkbox" || field.type === "switch") {
              initialCustomFields[field.name] = field.defaultValue === "true"
            } else {
              initialCustomFields[field.name] = field.defaultValue
            }
          }
        })

        setFormData((prev) => ({
          ...prev,
          customFields: initialCustomFields,
        }))
      } catch (error) {
        console.error("Error fetching custom fields:", error)
      }
    }

    fetchContacts()
    fetchBrands()
    fetchCustomFields()
  }, [contactId])

  const handleContactAdded = (newContact: Contact) => {
    setContacts((prev) => [...prev, newContact])
    setFilteredContacts((prev) => [...prev, newContact])
    setSelectedContact(newContact.id)
    setIsContactDialogOpen(false)
  }

  const handleBrandAdded = (newBrand: Brand) => {
    setBrands((prev) => [...prev, newBrand])
    setFormData((prev) => ({ ...prev, brand: newBrand.name }))
    setIsBrandDialogOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCustomFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [fieldName]: value,
      },
    }))
  }

  const handleContactSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase()
    setSearchQuery(query)

    if (!query.trim()) {
      setFilteredContacts(contacts)
      return
    }

    const filtered = contacts.filter(
      (contact) =>
        contact.company.toLowerCase().includes(query) ||
        (contact.name && contact.name.toLowerCase().includes(query)) ||
        contact.email.toLowerCase().includes(query),
    )

    setFilteredContacts(filtered)
  }

  const handleContactSelect = (contactId: string) => {
    setSelectedContact(contactId)
    setContactSearchOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedContact) {
      toast({
        title: "Error",
        description: "Please select a contact",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Get contact details
      const contactRef = doc(db, "contacts", selectedContact)
      const contactSnap = await getDoc(contactRef)
      const contactData = contactSnap.data() as Contact

      // Create RMA
      const rmaData = {
        contactId: selectedContact,
        contactName: contactData.name || "",
        contactEmail: contactData.email,
        contactPhone: contactData.phone,
        contactCompany: contactData.company || "Your Company",
        brand: formData.brand,
        modelNumber: formData.modelNumber,
        serialNumber: formData.serialNumber,
        problemsReported: formData.problemsReported,
        comments: formData.comments,
        customFields: formData.customFields,
        status: "processing",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        remark: "",
        isReady: false,
        otp: "",
        isDelivered: false,
      }

      const rmaRef = await addDoc(collection(db, "rmas"), rmaData)

      // Send email notification
      await sendRMAConfirmationEmail({
        to: contactData.email,
        name: contactData.name || contactData.company,
        rmaId: rmaRef.id,
        productDetails: `${formData.brand} ${formData.modelNumber}`,
      })

      toast({
        title: "RMA Created",
        description: "The RMA has been created successfully",
      })

      router.push("/dashboard")
    } catch (error) {
      console.error("Error creating RMA:", error)
      toast({
        title: "Error",
        description: "Failed to create RMA. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Get initials for avatar
  const getInitials = (contact: Contact) => {
    if (contact.name && contact.name.trim()) {
      return contact.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    }
    return contact.company.substring(0, 2).toUpperCase()
  }

  const renderCustomField = (field: CustomField) => {
    const value =
      formData.customFields[field.name] !== undefined
        ? formData.customFields[field.name]
        : field.type === "checkbox" || field.type === "switch"
          ? field.defaultValue === "true"
          : field.defaultValue || ""

    return (
      <div className="space-y-2" key={field.id}>
        <div className="flex items-center gap-1">
          <Label htmlFor={field.name}>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          {field.description && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{field.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {field.type === "text" || field.type === "email" || field.type === "tel" || field.type === "number" ? (
          <Input
            id={field.name}
            name={field.name}
            type={field.type}
            value={value}
            onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
            required={field.required}
          />
        ) : field.type === "textarea" ? (
          <Textarea
            id={field.name}
            name={field.name}
            value={value}
            onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
            required={field.required}
          />
        ) : field.type === "checkbox" ? (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.name}
              checked={value === true}
              onCheckedChange={(checked) => handleCustomFieldChange(field.name, checked)}
            />
            <Label
              htmlFor={field.name}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {field.description || `Enable ${field.label.toLowerCase()}`}
            </Label>
          </div>
        ) : field.type === "switch" ? (
          <div className="flex items-center justify-between">
            <Label
              htmlFor={field.name}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {field.description || `Enable ${field.label.toLowerCase()}`}
            </Label>
            <Switch
              id={field.name}
              checked={value === true}
              onCheckedChange={(checked) => handleCustomFieldChange(field.name, checked)}
            />
          </div>
        ) : field.type === "select" ? (
          <Select
            value={value}
            onValueChange={(value) => handleCustomFieldChange(field.name, value)}
            required={field.required}
          >
            <SelectTrigger id={field.name}>
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : field.type === "date" ? (
          <DatePicker
            id={field.name}
            selected={value ? new Date(value) : undefined}
            onSelect={(date) => handleCustomFieldChange(field.name, date?.toISOString() || "")}
            required={field.required}
          />
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Raise New RMA</h1>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
            <CardTitle>Customer Information</CardTitle>
            <CardDescription>Select an existing contact or create a new one</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="contact" className="mb-2 block">
                  Contact
                </Label>
                <div className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => setContactSearchOpen(!contactSearchOpen)}
                  >
                    {selectedContact
                      ? contacts.find((contact) => contact.id === selectedContact)?.company || "Select contact"
                      : "Select contact"}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>

                  {contactSearchOpen && (
                    <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
                      <div className="p-2 border-b">
                        <Input
                          placeholder="Search contacts by company, name, or email..."
                          value={searchQuery}
                          onChange={handleContactSearch}
                          className="w-full"
                        />
                      </div>

                      <div className="max-h-[300px] overflow-y-auto p-1">
                        {filteredContacts.length === 0 ? (
                          <div className="py-6 text-center text-sm text-gray-500">No contacts found</div>
                        ) : (
                          filteredContacts.map((contact) => (
                            <div
                              key={contact.id}
                              className={cn(
                                "flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-blue-50",
                                selectedContact === contact.id && "bg-blue-50",
                              )}
                              onClick={() => handleContactSelect(contact.id)}
                            >
                              <Avatar className="h-9 w-9 bg-blue-100 text-blue-700">
                                <AvatarFallback>{getInitials(contact)}</AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Building className="h-3.5 w-3.5 text-blue-700 shrink-0" />
                                  <span className="font-medium truncate">{contact.company}</span>
                                </div>
                                {contact.name && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <User className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{contact.name}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Mail className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{contact.email}</span>
                                </div>
                              </div>
                              {selectedContact === contact.id && (
                                <CheckIcon className="h-4 w-4 shrink-0 text-blue-600" />
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-8">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsContactDialogOpen(true)}
                  className="border-blue-200 hover:bg-blue-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Contact
                </Button>
              </div>
            </div>

            {selectedContact && (
              <div className="border rounded-md p-4 bg-blue-50 border-blue-200">
                {contacts
                  .filter((contact) => contact.id === selectedContact)
                  .map((contact) => (
                    <div key={contact.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-blue-700" />
                        <p className="font-medium text-blue-700">{contact.company}</p>
                      </div>
                      {contact.name && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm">{contact.name}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">{contact.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">{contact.phone}</p>
                      </div>
                      {contact.address && <p className="text-sm text-muted-foreground mt-2 pl-6">{contact.address}</p>}
                    </div>
                  ))}
              </div>
            )}
          </CardContent>

          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
            <CardTitle>Product Details</CardTitle>
            <CardDescription>Enter the details of the product for RMA</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="brand">Brand</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={() => setIsBrandDialogOpen(true)}
                >
                  <Plus className="h-3 w-3" /> Add New Brand
                </Button>
              </div>
              <Select
                name="brand"
                value={formData.brand}
                onValueChange={(value) => handleSelectChange("brand", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.name}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="modelNumber">Model Number</Label>
              <Input
                id="modelNumber"
                name="modelNumber"
                value={formData.modelNumber}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input
                id="serialNumber"
                name="serialNumber"
                value={formData.serialNumber}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="problemsReported">Problems Reported</Label>
              <Textarea
                id="problemsReported"
                name="problemsReported"
                value={formData.problemsReported}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comments">Comments</Label>
              <Textarea id="comments" name="comments" value={formData.comments} onChange={handleInputChange} />
            </div>

            {customFields.length > 0 && (
              <>
                <div className="border-t pt-4 mt-6">
                  <h3 className="text-lg font-medium mb-4">Additional Information</h3>
                  <div className="space-y-4">{customFields.map((field) => renderCustomField(field))}</div>
                </div>
              </>
            )}
          </CardContent>

          <CardFooter className="flex justify-between bg-slate-50 border-t">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting
                </>
              ) : (
                "Submit RMA"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <ContactDialog
        open={isContactDialogOpen}
        onOpenChange={setIsContactDialogOpen}
        onContactAdded={handleContactAdded}
      />

      <BrandDialog open={isBrandDialogOpen} onOpenChange={setIsBrandDialogOpen} onBrandAdded={handleBrandAdded} />
    </div>
  )
}
